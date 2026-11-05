# `pages/inventario/` (MOD-02)

Áreas verdes y mapa del campus: `AreasVerdesPage`, `NuevaAreaVerdePage`, `CoberturasPage`, `CatalogosPage`, `EjemplaresPage`, `CampanasPodaPage`, `CampanaPodaDetallePage`, `PlanificarCampanaPage` y `MapaAreasVerdesPage` (carga diferida, con maplibre y `MapaVectorialLocal.tsx`).

**Estado:** MOD-02 está en `main` desde #92 a #96; la rama `mod02` es una versión anterior y no se fusiona. Migrado al sistema de diseño (AV-349): todas las pantallas usan componentes de `components/ui` y su CSS es solo layout. `CatalogosPage` y `EjemplaresPage` comparten `Catalogos.module.css`. La barra de herramientas del lienzo de `MapaVectorialLocal` es una excepción documentada (AV-351).

| Qué | Dónde |
|---|---|
| Servicios | `services/api/areasVerdes.ts`, `catalogosInventario.ts`, `campanasPoda.ts`, `coberturas.ts`, `ejemplares.ts`, `mapaInventario.ts`, `mapaAsignaciones.ts` |
| Tipos | `types/areasVerdes.ts`, `campanasPoda.ts`, `catalogosInventario.ts`, `ejemplares.ts`, `mapaInventario.ts` |
| Rutas | `RUTAS_INVENTARIO`, `MIGAS_INVENTARIO` (prefijo `/areas-verdes`) |

**Dueño de catálogos:** áreas verdes, sectores y ejemplares son de este módulo. Los demás módulos los leerán de aquí, por su entrada pública cuando exista. Hoy MOD-05 y MOD-06 los sacan del cliente de MOD-05, que es un apaño pendiente de corregir.

**Ejemplo:** `CoberturasPage.tsx` usa `MIGAS_INVENTARIO` y `RUTAS_INVENTARIO` para sus migas y enlaces.

**Destino:** `modulos/inventario/paginas/`.
