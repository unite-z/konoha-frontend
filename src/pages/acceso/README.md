# `pages/acceso/` (MOD-01)

Pantallas sin menú de la sesión de MOD-01: `IngresoPage.tsx` (inicio de sesión, RF-T-001) y `CambioContrasenaPage.tsx` (cambio obligatorio de contraseña temporal, HU-MOD01-003).

**MOD-01 está repartido** entre esta carpeta, `usuarios-roles/`, `repositorio/` y `components/core/`. Sus servicios son `services/api/core.ts` y `clienteCore.ts`, sus tipos `types/core.ts`, y sus rutas `RUTAS_CORE` en `router/rutasApp.ts`.

**Va aquí:** solo pantallas previas a la sesión o que la sesión exige antes de entrar.

**No va aquí:**
- La lógica de sesión: va en `sesion/` (`ProveedorSesion.tsx`, `RutaProtegida.tsx`).
- La validación de redirecciones (`destinoTrasIngresoCore`): está en `router/rutasApp.ts`.

**Regla:** la interfaz nunca guarda credenciales ni tokens. La sesión vive en una cookie `HttpOnly` (AV-234).

**Ejemplo:** `IngresoPage.tsx` llama a `ingresar()` de `useSesion()` (la sesión de `sesion/`), no al servicio directamente, y al entrar navega a `destinoTrasIngresoCore(volver)` o al inicio.

**Destino:** `modulos/core/paginas/`.
