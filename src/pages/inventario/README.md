# `pages/inventario/` (MOD-02)

Áreas verdes y mapa del campus: `AreasVerdesPage`, `NuevaAreaVerdePage`, `CoberturasPage`, `CatalogosPage`, `EjemplaresPage` y `MapaAreasVerdesPage` (carga diferida, con maplibre y `MapaVectorialLocal.tsx`).

**Estado:** parte de MOD-02 sigue en la rama `mod02` (PR #35 cerrado). Fusionarla va antes de cualquier cambio de tokens o de menú, porque toca `tokens.css`, `MenuLateral.tsx`, `rutasApp.ts` y `permisosCore.ts`.

| Qué | Dónde |
|---|---|
| Servicios | `services/api/areasVerdes.ts`, `catalogosInventario.ts`, `coberturas.ts`, `ejemplares.ts`, `mapaInventario.ts`, `mapaAsignaciones.ts` |
| Tipos | `types/areasVerdes.ts`, `catalogosInventario.ts`, `ejemplares.ts`, `mapaInventario.ts` |
| Rutas | `RUTAS_INVENTARIO`, `MIGAS_INVENTARIO` (prefijo `/areas-verdes`) |

**Dueño de catálogos:** áreas verdes, sectores y ejemplares son de este módulo. Los demás módulos los leerán de aquí, por su entrada pública cuando exista. Hoy MOD-05 y MOD-06 los sacan del cliente de MOD-05, que es un apaño pendiente de corregir.

**Deuda que no se copia:** 19 `<button>` y 4 `<select>` crudos. En código nuevo, `Boton` y `Selector` de `components/ui`.

**Ejemplo:** `CoberturasPage.tsx` usa `MIGAS_INVENTARIO` y `RUTAS_INVENTARIO` para sus migas y enlaces.

**Destino:** `modulos/inventario/paginas/`.
