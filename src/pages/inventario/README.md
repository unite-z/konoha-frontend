# `pages/inventario/` (MOD-02)

Áreas verdes y mapa del campus: `AreasVerdesPage`, `NuevaAreaVerdePage`, `CoberturasPage`, `CatalogosPage`, `EjemplaresPage` y `MapaAreasVerdesPage` (carga diferida, con maplibre y `MapaVectorialLocal.tsx`).

**Estado:** MOD-02 está en `main` desde #92 a #96; la rama `mod02` es una versión anterior y no se fusiona. Migración al sistema de diseño (AV-349): `AreasVerdesPage` (tabla con `TablaDatos`), `NuevaAreaVerdePage`, `CoberturasPage`, `CatalogosPage` y `EjemplaresPage` ya usan componentes de `components/ui`; las dos últimas comparten `Catalogos.module.css`. El mapa, en curso.

| Qué | Dónde |
|---|---|
| Servicios | `services/api/areasVerdes.ts`, `catalogosInventario.ts`, `coberturas.ts`, `ejemplares.ts`, `mapaInventario.ts`, `mapaAsignaciones.ts` |
| Tipos | `types/areasVerdes.ts`, `catalogosInventario.ts`, `ejemplares.ts`, `mapaInventario.ts` |
| Rutas | `RUTAS_INVENTARIO`, `MIGAS_INVENTARIO` (prefijo `/areas-verdes`) |

**Dueño de catálogos:** áreas verdes, sectores y ejemplares son de este módulo. Los demás módulos los leerán de aquí, por su entrada pública cuando exista. Hoy MOD-05 y MOD-06 los sacan del cliente de MOD-05, que es un apaño pendiente de corregir.

**Deuda que no se copia:** el mapa (`MapaAreasVerdesPage`, `MapaVectorialLocal`) aún tiene `<button>` y `<select>` crudos. En código nuevo, `Boton` y `Selector` de `components/ui`.

**Ejemplo:** `CoberturasPage.tsx` usa `MIGAS_INVENTARIO` y `RUTAS_INVENTARIO` para sus migas y enlaces.

**Destino:** `modulos/inventario/paginas/`.
