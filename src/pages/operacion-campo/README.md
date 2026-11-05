# `pages/operacion-campo/` (MOD-04)

Operación de campo: `CuadrillasPage`, `EncargosPage` y `ParticipantesPage`, con `DialogoNuevaActividad`, piezas comunes en `ComponentesCampo.tsx` y el hook del módulo `useCampo.ts`.

| Qué | Dónde |
|---|---|
| Servicios | `services/api/operacionCampo.ts` (`campoApi`, `todosCampo`) |
| Tipos | `types/operacionCampo.ts` |
| Lógica pura | `utils/operacionCampo.ts` |
| Sesión | `sesion/ContextoSesionCampo.ts` (`useSesionCampo`) |
| Rutas | `router/rutasCampo.ts` (`RUTAS_CAMPO`, prefijo `/operacion-campo`) |

**Va aquí:** pantallas del capataz y del ingeniero de campo, pensadas también para móvil.

**No va aquí:** la navegación móvil. Hoy se adapta el menú de escritorio con un `@media` en `LayoutOficina.module.css`. La barra superior e inferior móvil de Figma irán en `layouts/` (fase 2 del plan).

**Reglas propias:** todo registro hecho en campo sin conexión va a la cola de IndexedDB con `Idempotency-Key` (ver `docs/estandares/pwa-offline.md`). Hooks solo de este módulo, aquí (`useCampo.ts`), no en `hooks/`.

**Ejemplo:** `EncargosPage.tsx` lista los encargos con `todosCampo` de `services/api/operacionCampo.ts`.

**Destino:** `modulos/operacion-campo/paginas/`.

## AV-62: catálogo de actividades

`CatalogoActividadesPage` consulta clases y tipos, filtra por clase y estado y permite crear,
editar y desactivar tipos con `CORE.CATALOGO.GESTIONAR`. La lectura mantiene el guardián
de MOD-04 (`CAM.CUADRILLA.CONSULTAR`). El servidor debe comprobar los permisos y devolver
403 cuando corresponda. `DialogoNuevaActividad` vuelve a consultar los tipos activos al
abrirse, filtra por clase y limpia el tipo seleccionado al cambiar de clase.

### Contrato de la API

Base: `/api/v1/operacion-campo/catalogos/`. Se reutilizan sesión, CSRF y paginación
`{count, next, previous, results}` de `campoApi` y `todosCampo`.

| Operación | Ruta | Entrada o respuesta |
|---|---|---|
| GET | `clases-actividad/` | Elementos `{id, nombre, activo}` |
| GET | `tipos-actividad/` | Elementos `{id, nombre, activo, clase_id}`; filtro `activo=true` para nuevas altas |
| POST | `tipos-actividad/` | `{nombre, clase_id, activo}` → tipo creado |
| PUT | `tipos-actividad/{id}/` | `{nombre, clase_id, activo}` → tipo actualizado |

Ejemplo: `POST tipos-actividad/` con `{nombre: "Poda de formación", clase_id: 4, activo: true}`
devuelve `{id: 3, nombre: "Poda de formación", clase_id: 4, activo: true}`.
La desactivación envía el mismo identificador, nombre y clase con `activo: false`;
no se ofrece borrado. El backend debe conservar las referencias y nombres históricos
de los partes, también frente a cambios de nombre, y rechazar tipos inactivos al registrar actividades.
Debe validar nombre obligatorio (hasta 150 caracteres), clase válida y duplicados;
400 identifica datos inválidos, 403 falta de permiso y 409 conflictos. Los errores
se muestran sin dar la operación por guardada.

La precarga de las nueve clases corresponde al backend: habilitación; rehabilitación
y rediseño; mantenimiento; poda; propagación y plantación; riego; manejo fitosanitario;
manejo de residuos vegetales; inspección y monitoreo. No se asignan identificadores
ni clases a tipos existentes desde el navegador.

### Integración y evidencia

El backend de AV-62 añade clases, relaciona los tipos y fija el nombre histórico
al crear cada actividad. El catálogo requiere esa migración; el registro del parte
conserva la compatibilidad con una API anterior que responda 404 para clases.
Un 403 u otro error no activa ese modo.

`CatalogoActividadesPage.test.tsx` usa datos de prueba ficticios y HTTP simulado:
nueve clases, creación y disponibilidad en el parte, desactivación y exclusión de
nuevas altas, cambio de clase, lectura sin gestión, errores y reintentos, 403 de
lectura/escritura y compatibilidad con la API anterior. No demuestra persistencia,
conservación histórica en la base de datos ni aceptación integrada. Antes de cerrar
AV-62, ejecutar esos flujos contra el backend real, consultar un parte anterior
después de desactivar/renombrar su tipo y adjuntar evidencia integrada en Linear.

## AV-56: registro ágil de actividades

`POST /api/v1/operacion-campo/actividades/` conserva los campos existentes
`parte_id`, `tipo_actividad_id`, `area_verde_id`, `fecha_hora_actividad`,
`encargo_id` y `observaciones`. Añade `clase_actividad_id`,
`fecha_solicitud` (YYYY-MM-DD) e `incidencia_id`, los tres opcionales para
mantener las altas anteriores. El servidor comprueba que el tipo pertenece
a la clase indicada, que la solicitud no es posterior al parte y que la
incidencia existe. La clase se guarda como dato histórico de la actividad.

Ejemplo: `{parte_id: 10, clase_actividad_id: 3, tipo_actividad_id: 14,
area_verde_id: 2, fecha_hora_actividad: "2026-10-21T08:00:00-05:00",
fecha_solicitud: "2026-10-20", incidencia_id: null, encargo_id: null}`.
El capataz solo puede registrar en su cuadrilla; un parte cerrado responde
409 y los datos de origen inválidos responden 400. La integración con la
base de datos y el servicio real sigue pendiente de prueba.

## AV-70: medidas y tiempo

El registro de actividad admite `superficie_m2`, `cantidad_solicitada`,
`cantidad_ejecutada`, `unidad_medida_id` y `tiempo_minutos`. Los valores
anteriores son opcionales para conservar el contrato previo. La superficie
se expresa en m² y el tiempo en minutos (1 a 1440). Si se registra alguna
cantidad, se exige una unidad de `GET catalogos/unidades-medida/`.
El servidor rechaza valores negativos, unidad desconocida y tiempo fuera
de rango antes de crear la actividad.

## AV-79: materiales y traslados

`GET /api/v1/operacion-campo/catalogos/materiales/` ofrece los materiales
catalogados; «Otro» envía `material_id: null` y una `descripcion_otro` obligatoria.
`GET/POST /api/v1/operacion-campo/actividades/{id}/materiales/` consulta y
registra `{material_id, descripcion_otro, cantidad, unidad_medida_id, origen,
destino}`. Cantidad y unidad son obligatorias; origen y destino se informan
juntos para un traslado. La fecha y el espacio pertenecen a la actividad.
El servidor exige acceso a la cuadrilla para escribir y conserva los registros
anteriores sin permitir su borrado desde este flujo.

## AV-82: fotografías de actividades

El diálogo de fotografías reutiliza `Adjuntos` de MOD-01 con entidad `actividad`.
La selección admite JPEG y PNG; antes de subir, el navegador genera un JPEG
de hasta 1600 píxeles en su lado mayor con calidad 0,8. La subida conserva el
`Idempotency-Key` para reintentos. El backend comprueba que el capataz sea dueño
de la actividad al adjuntar, listar o descargar; otros roles conservan sus
permisos de consulta. Las fotografías siguen siendo opcionales para cerrar el
parte. La integración sin conexión corresponde a RF-T-012.
