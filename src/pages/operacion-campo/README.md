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
