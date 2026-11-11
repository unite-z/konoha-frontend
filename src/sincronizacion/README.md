# `sincronizacion/`

Modo sin conexión común (RF-T-012, AV-226). Las reglas están en [`docs/estandares/pwa-offline.md`](../../docs/estandares/pwa-offline.md); aquí, dónde está cada pieza.

| Fichero | Qué hace |
|---|---|
| `almacenLocal.ts` | base IndexedDB `areas-verdes-sin-conexion` con `pendientes`, `datos` y `sesion` |
| `cola.ts` | la cola: `encolar`, `vaciarCola`, `reintentar`, `descartar`, `useCola`, dependencias entre operaciones y espera entre reintentos |
| `ejecutores.ts` | quién envía cada tipo de operación (llama al servicio del módulo dueño con el UUID como `Idempotency-Key`) |
| `ProveedorSincronizacion.tsx` | registra los ejecutores y vacía la cola al abrir, con `online`, con `visibilitychange` y cada minuto |
| `datosDescargados.ts` | `conCache`: la última lectura correcta, para consultar sin red; se borra al cerrar sesión |
| `AvisoNuevaVersion.tsx` | registra el service worker (solo en el build) y avisa de versión nueva sin recargar por sorpresa |

**Cómo se usa desde un módulo:**

1. Sin conexión, la pantalla llama a `encolar({ tipo, carga, descripcion, usuario_id })` en lugar del servicio. Si depende de otra operación de la cola, pasa `depende_de` y `referencias` (los campos de `carga` que se rellenan con el `id` de la respuesta de la otra).
2. El tipo tiene su ejecutor en `ejecutores.ts`, que llama al servicio de `services/api/` con `p.id` como clave.
3. Para mostrar «Sin sincronizar», la pantalla lee `useCola()` filtrando por su tipo.

**Reglas:**
- Nunca se guardan credenciales: la sesión es la cookie `HttpOnly`. La instantánea de `sesion/instantaneaSesion.ts` solo tiene usuario, rol y permisos.
- Todo endpoint que reciba operaciones de la cola tiene que ser idempotente con `Idempotency-Key` (regla del backend).
- Una operación solo la envía el usuario que la registró. Las rechazadas no se borran solas.

**Destino:** `compartido/sincronizacion/`, con `ejecutores.ts` y `ProveedorSincronizacion.tsx` en `app/`.
