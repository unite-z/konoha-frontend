# PWA y modo sin conexión

Requisitos: RF-T-012 (AV-226), HU-MOD04-012 y HU-MOD03-011. Implementación: `src/sincronizacion/`. El catálogo de requisitos v2 eliminó RNF-005 (funcionamiento sin conexión). Se recomienda reponerlo, porque estas historias dependen de él.

## Qué se guarda en el dispositivo

| Qué | Dónde | Notas |
|---|---|---|
| App shell (HTML, JS, CSS, iconos) | Caché del service worker | Versionada en cada build |
| Catálogos y lecturas de campo (ruta de hoy, encargos, catálogos del parte) | IndexedDB, almacén `datos` | La última lectura correcta de cada una, por usuario; se borran al cerrar sesión |
| Sesión sin conexión | IndexedDB, almacén `sesion` | Solo usuario, rol y permisos de la última comprobación. Nunca la credencial |
| Operaciones pendientes | IndexedDB, cola `pendientes` | Ver abajo |
| Fotos pendientes | IndexedDB, como `Blob` comprimido | Se borran al confirmar la subida |

Nunca se guardan en el dispositivo credenciales en claro ni datos de otros usuarios.

## Cola de operaciones

Cada operación de campo (registro de actividad, incidencia, foto) se guarda primero en la cola y después se envía.

1. Al crearla, se genera un **UUID en el cliente**. Es el identificador del registro y la cabecera `Idempotency-Key` (ver `api.md` del backend). Los reintentos repiten el mismo UUID.
2. Se envían en orden de creación. Una operación que depende de otra (una foto de un registro) espera a la suya.
3. **Reintentos con backoff exponencial** (5 s, 15 s, 1 min, 5 min, después cada 15 min), con algo de aleatoriedad.
4. Respuestas:

   | Respuesta | Qué hace la cola |
   |---|---|
   | 2xx, o la respuesta guardada de una clave repetida | Se elimina de la cola |
   | 401 (sesión caducada o cuenta desactivada) | La cola entera se detiene sin perder nada y se reanuda al volver a iniciar sesión. Lo que se envíe se vuelve a comprobar en el servidor |
   | 4xx de validación o 403 de permiso | Se marca como rechazada y se avisa al usuario, con el motivo. No se reintenta sola ni se borra: el usuario la reintenta o la descarta en «Pendientes de sincronizar» |
   | 409 `ya-marcado` (otro hizo lo mismo antes) | No se sobrescribe: se quita de la cola y se informa de quién y cuándo |
   | 409 por clave reutilizada | Error de programación: se registra y se marca como rechazada |
   | 5xx o sin red | Se reintenta |

## Cuándo se vacía la cola

**Background Sync no existe en Safari (incluido cualquier navegador en iPhone) ni en Firefox.** Por eso no puede ser el mecanismo principal.

Se intenta vaciar en todos estos momentos:

- al abrir la app;
- con el evento `online`;
- con `visibilitychange`, al volver a primer plano;
- cada minuto mientras la app está abierta y hay pendientes;
- con Background Sync, solo donde exista (`'sync' in registration`), como mejora. **Aún no implementado:** exige repetir el envío dentro del service worker.

Solo envía con una sesión comprobada por el servidor y solo las operaciones que registró ese mismo usuario.

La interfaz muestra siempre **cuántas operaciones faltan por sincronizar**, para que quien usa iPhone sepa que tiene que abrir la app con conexión.

## Archivos

- Fotos comprimidas en el cliente antes de guardarlas (lado mayor de 1600 px, JPEG de calidad 0,8).
- **Cada reintento pide una URL prefirmada nueva.** Las URL caducan en minutos y no se guardan.
- La subida multipart solo se usa para los archivos grandes de oficina, que se suben con conexión.

## Service worker

- `sw.js` se sirve con `Cache-Control: no-cache`, para que una versión nueva llegue en la siguiente visita.
- Cuando hay versión nueva, se muestra un aviso para recargar. No se recarga por sorpresa si hay un formulario a medias.
- Las llamadas a `/api/` no se cachean en el service worker. Los datos sin conexión van en IndexedDB, de forma explícita.
