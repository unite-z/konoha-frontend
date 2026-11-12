# `components/reportes-indicadores/`

Componentes y hooks que solo usa MOD-06 (Reportes e indicadores) en varias de sus pantallas.

**Va aquí:**

- filtros compartidos de los reportes de gestión: `SelectoresFiltroGestion`, `TarjetaFiltro`, `useCatalogosFiltros`;
- gráficos: `graficos/` (`BarrasHorizontales`, `ColumnasFecha`, `escala.ts` con su prueba);
- exportación: `BotonExportar`, `SelectorFormato`, `useGenerarExportacion`;
- piezas de IA y avisos propios: `BloqueContextoIA`, `AvisoDatosSimulados`.

**No va aquí:**

- Lo que solo usa una pantalla: va junto a esa pantalla en `pages/reportes-indicadores/<seccion>/`.
- Lo que necesite otro módulo: se sube a `components/core/` (negocio) o a `design-system/` (visual) cuando haya tres usuarios.
- Variantes visuales nuevas de botón, tarjeta o diálogo: se piden a `design-system/`, no se rehacen aquí (`DialogoDetalle` ya está en `design-system/`; `TarjetaFiltro` sigue aquí como excepción documentada).

**Nombres:** componentes en PascalCase, hooks `useAlgo.ts` y lógica pura en camelCase con su `.test.ts` al lado.

**Ejemplo:** `SelectoresFiltroGestion.tsx` lo usan el mapa de atenciones, la barra de filtros del panel y el reporte de programado frente a ejecutado. Sus catálogos (`useCatalogosFiltros.ts`) deberán venir de MOD-02 cuando se fusione `mod02`, no del cliente de MOD-05.

**Destino:** `modulos/reportes-indicadores/componentes/`.
