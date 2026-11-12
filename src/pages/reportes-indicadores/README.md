# `pages/reportes-indicadores/` (MOD-06)

El módulo más grande (un 37 % del código). Una subcarpeta por sección del menú:

| Subcarpeta | Qué hay |
|---|---|
| `reportes/` | reportes de gestión (cumplimiento de corte, distribución de personal, material vegetal, programado frente a ejecutado, servicio tercerizado…) |
| `asistencia-ia/` | extracción de informes, priorización e inconsistencias |
| `panel/` | panel de indicadores y su detalle |
| `mapa-atenciones/` | mapa de atenciones con capas |
| `exportaciones/` | exportaciones de datos |

| Qué | Dónde |
|---|---|
| Componentes compartidos del módulo | `components/reportes-indicadores/` |
| Servicios | `services/api/reportes.ts`, `reportesGestion.ts`, `exportaciones.ts`, `ia.ts`, `inconsistenciasIa.ts`, `priorizacionIa.ts`, `clienteReportesGestion.ts` |
| Datos simulados | `services/simulados/` (interruptor en `config/datosSimulados.ts`) |
| Permisos | `config/permisos.ts` (códigos de MOD-01 de la sesión, AV-382) |
| Rutas | `RUTAS`, `MIGAS` y `rutaRevision*()` en `router/rutasApp.ts` |

**Entre módulos:** `asistencia-ia/extraccion/consultasApoyo.ts` encadena llamadas a MOD-05 (atención a atención e informe a informe). No hay que copiarlo: el objetivo es que el endpoint de IA devuelva ese contexto (vía backend). Para enlazar a una atención se usa `rutaDetalleAtencion(id)`.

**Deuda que no se copia:** tarjetas y botones propios en el CSS de cada reporte. En código nuevo, `TarjetaIndicador`, `Boton` y los componentes de `components/ui`.

**Ejemplo:** `panel/TablaRegistros.tsx` enlaza cada fila con `<Link to={rutaDetalleAtencion(fila.atencion_id)}>`.

**Destino:** `modulos/reportes-indicadores/paginas/`.
