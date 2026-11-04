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

## AV-62: catálogo de actividades (pendiente de integrar)

`CatalogoActividadesPage` consulta clases y tipos, filtra por clase y estado y permite crear,
editar y desactivar tipos con `CORE.CATALOGO.GESTIONAR`. La lectura mantiene el guardián
de MOD-04 (`CAM.CUADRILLA.CONSULTAR`). El servidor debe comprobar los permisos y devolver
403 cuando corresponda. `DialogoNuevaActividad` vuelve a consultar los tipos activos al
abrirse, filtra por clase y limpia el tipo seleccionado al cambiar de clase.

### Contrato propuesto; no confirmado ni implementado por el backend

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

### Bloqueo y evidencia

En el backend revisado, `ConsultasCampoService` solo devuelve `{id, nombre, activo}`
para tipos; `OperacionCampoController` no tiene escrituras de catálogo ni recurso
de clases. `PrecargaCampoService` tampoco precarga clases o relaciones. Hace falta
una entrega del backend con migración, precarga, permisos, operaciones y conservación
histórica antes de integrar o fusionar este frontend. No se ha modificado ese repositorio.
Hasta entonces, el catálogo muestra el error de carga; solo el registro del parte
admite 404 de clases y conserva su selector plano anterior. Un 403 u otro error no
activa esa compatibilidad.

`CatalogoActividadesPage.test.tsx` usa datos de prueba ficticios y HTTP simulado:
nueve clases, creación y disponibilidad en el parte, desactivación y exclusión de
nuevas altas, cambio de clase, lectura sin gestión, errores y reintentos, 403 de
lectura/escritura y compatibilidad con la API anterior. No demuestra persistencia,
conservación histórica en la base de datos ni aceptación integrada. Antes de cerrar
AV-62, ejecutar esos flujos contra el backend real, consultar un parte anterior
después de desactivar/renombrar su tipo y adjuntar evidencia integrada en Linear.
