# `sesion/`

La sesión de MOD-01, común a toda la aplicación.

| Fichero | Qué hace |
|---|---|
| `ProveedorSesion.tsx` | carga `GET auth/sesion/` y expone el estado de la sesión, `ingresar`, `cerrarSesion` y `recargar` |
| `ContextoSesion.ts` | contexto y hooks: `useSesion`, `useSesionActiva`, `useRolActual`, `useRolTercerizados` |
| `instantaneaSesion.ts` | la última sesión comprobada (usuario, rol y permisos) en IndexedDB, para abrir la app sin conexión (RF-T-012) |
| `ContextoSesionCampo.ts` | vista de la sesión para MOD-04 (`useSesionCampo`) |
| `RutaProtegida.tsx` | `RutaProtegida` (sin sesión, al ingreso) y `RutaConPermiso` (sin permiso, aviso; con `seccion`, «Acceso denegado» centrado con «Volver al inicio», Figma 374-7925) |

**Reglas:**
- La sesión vive en una cookie `HttpOnly`. Aquí nunca hay credenciales ni tokens (AV-234). Nada de `localStorage` para la sesión.
- Sin conexión (RF-T-012): si el dispositivo ya tenía una sesión comprobada, el estado es `sinConexion` con su instantánea (sin credenciales), y `useSesionActiva` la devuelve. Al volver la red se comprueba con el servidor; un 401 borra la instantánea. La cola solo envía con la sesión `activa`.
- `RutaConPermiso` es usabilidad: el servidor responde 403 de todos modos.

**No va aquí:** qué puede hacer cada rol en cada módulo (`config/permisos*.ts`) ni las pantallas de ingreso (`pages/acceso/`).

**Ejemplo:** `MarcarEjemplarPage.tsx` obtiene el rol con `useRolTercerizados()` de `ContextoSesion.ts`, sin leer la sesión por su cuenta.

**Destino:** `app/sesion/`.
