# `hooks/`

Hooks de React que usan varios módulos.

| Hook | Para qué | Lo usan |
|---|---|---|
| `useConsulta` | datos remotos con estados (inactivo, cargando, éxito, vacío, error) y cancelación; sin red devuelve la última lectura guardada (RF-T-012) | los seis módulos |
| `usePaginaActual` | título y migas de la página para la cabecera (con `movil`, la barra superior móvil de una ficha) | los seis módulos |
| `useFiltrosUrl` | filtros guardados en la URL | MOD-01, MOD-05 y MOD-06 |
| `useDemora` | retrasa un valor (búsqueda mientras se escribe) | MOD-05 y `SelectorBuscable` |
| `useEnLinea` | `true` mientras hay conexión (`navigator.onLine` y eventos `online`/`offline`) | cola sin conexión (RF-T-012), MOD-03 y MOD-04 |

**No va aquí:**
- Hooks de un solo módulo: van junto a sus páginas (`pages/operacion-campo/useCampo.ts`) o en `components/<modulo>/` (`useEsMovil.ts` de MOD-06).
- Lógica pura sin React: va en `utils/`.

**Reglas:** un hook nuevo entra aquí cuando lo usan tres módulos. Nada de estado global de datos de la API: cada pantalla consulta con `useConsulta`. El único contexto de React es el de la página (`layouts/LayoutOficina/ContextoPagina.ts`), además de la sesión.

**Nombres:** `useAlgo.ts`.

**Ejemplo:** `useConsulta(clave, (signal) => listarAtenciones(filtros, pagina, signal))` en `AtencionesPage.tsx`.

**Destino:** `compartido/`.
