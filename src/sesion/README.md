# `sesion/`

La sesión de MOD-01, común a toda la aplicación.

| Fichero | Qué hace |
|---|---|
| `ProveedorSesion.tsx` | carga `GET auth/sesion/` y expone el estado de la sesión, `ingresar`, `cerrarSesion` y `recargar` |
| `ContextoSesion.ts` | contexto y hooks: `useSesion`, `useSesionActiva`, `useRolActual`, `useRolTercerizados` |
| `ContextoSesionCampo.ts` | vista de la sesión para MOD-04 (`useSesionCampo`) |
| `RutaProtegida.tsx` | `RutaProtegida` (sin sesión, al ingreso) y `RutaConPermiso` (sin permiso, aviso) |

**Reglas:**
- La sesión vive en una cookie `HttpOnly`. Aquí solo hay datos en memoria, nunca credenciales ni tokens (AV-234). Nada de `localStorage` para la sesión.
- `RutaConPermiso` es usabilidad: el servidor responde 403 de todos modos.

**No va aquí:** qué puede hacer cada rol en cada módulo (`config/permisos*.ts`) ni las pantallas de ingreso (`pages/acceso/`).

**Ejemplo:** `MarcarEjemplarPage.tsx` obtiene el rol con `useRolTercerizados()` de `ContextoSesion.ts`, sin leer la sesión por su cuenta.

**Destino:** `app/sesion/`.
