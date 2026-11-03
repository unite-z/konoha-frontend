# `pages/usuarios-roles/` (MOD-01)

Gestión de cuentas: `UsuariosPage.tsx`, `UsuarioDetallePage.tsx`, `AccesosPage.tsx` (registro de accesos) y sus diálogos (`DialogoCambioRol`, `DialogoContrasenaTemporal`, `DialogoCuenta`).

**Piezas del módulo fuera de esta carpeta:**

| Qué | Dónde |
|---|---|
| Servicios | `services/api/core.ts`, `services/api/clienteCore.ts` |
| Tipos | `types/core.ts` |
| Lógica pura | `utils/etiquetasCore.ts`, `utils/validacionCore.ts` |
| Permisos | `config/permisosCore.ts` (`PERMISOS`) |
| Rutas | `RUTAS_CORE`, `rutaDetalleUsuario(id)` en `router/rutasApp.ts` |

**No va aquí:** permisos de otros módulos (cada uno tiene su `config/permisos<Modulo>.ts`) ni el inicio de sesión (`pages/acceso/`).

**Nombres:** pantallas `XxxPage.tsx`, diálogos `DialogoXxx.tsx`, un único `UsuariosRoles.module.css` para el layout.

**Ejemplo:** `UsuarioDetallePage.tsx` abre `DialogoCambioRol`, que llama a un servicio de `core.ts`. Si el backend responde 403, se muestra el aviso aunque el botón estuviera visible.

**Destino:** `modulos/core/paginas/`.
