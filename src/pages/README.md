# `pages/`

Pantallas: un componente por ruta, agrupadas por módulo.

| Carpeta | Módulo | Prefijo de URL | Constantes de ruta |
|---|---|---|---|
| `acceso/`, `usuarios-roles/`, `repositorio/` | MOD-01 | `/ingreso`, `/usuarios-roles`, `/repositorio` | `RUTAS_CORE` |
| `inventario/` | MOD-02 | `/areas-verdes` | `RUTAS_INVENTARIO` |
| `planificacion/` | MOD-03 | `/planificacion` | `RUTAS_PLANIFICACION` |
| `incidencias/` | MOD-03 | `/incidencias` | `RUTAS_INCIDENCIAS` |
| `corte/` | MOD-03 (capataz, móvil) | `/corte` | `RUTAS_CORTE` |
| `operacion-campo/` | MOD-04 | `/operacion-campo` | `RUTAS_CAMPO` |
| `servicios-tercerizados/` | MOD-05 | `/servicios-tercerizados` | `RUTAS_TERCERIZADOS` |
| `reportes-indicadores/` | MOD-06 | `/reportes-indicadores` | `RUTAS` |

**Va aquí:** `XxxPage.tsx` (la pantalla de una ruta), sus diálogos y piezas de un solo uso, y su `.module.css` solo para layout (rejilla, huecos, anchos). `PaginaNoEncontrada.tsx` es la del `*`.

**No va aquí:** llamadas a `fetch` (van en `services/api/`), lógica pura (va en `utils/` con prueba), ni componentes que reutilizan varias pantallas del módulo (van en `components/<modulo>/`).

**Reglas:** una pantalla no importa nada de la carpeta de otro módulo (ver las cuatro vías en `src/README.md`). Toda pantalla con datos remotos muestra `EstadoCarga`, `EstadoError` y `EstadoVacio`, y declara título y migas con `usePaginaActual`.

**Nombres:** `AtencionesPage.tsx`, `DialogoCambioRol.tsx`, `Tercerizados.module.css`. Subcarpetas en kebab-case cuando el módulo crece (`servicios-tercerizados/maestros/`).

`repositorio/` no tiene README propio: es una sola pantalla (`RepositorioPage.tsx`).

**Destino:** `modulos/<modulo>/paginas/`.
