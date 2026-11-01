/**
 * Índice de reportes de «Reportes e indicadores» (RF-REP-002, RF-REP-004, RF-REP-005 y RF-REP-006).
 * El de RF-REP-005 exige la sesión de MOD-05: sin ella, el guardián lleva al ingreso y después vuelve.
 *
 * Cada reporte es una tarjeta de enlace con su descripción y los filtros que admite.
 */
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS, RUTAS } from '../../../router/rutasApp'
import ListaEnlaces from '../ListaEnlaces'

const FILTROS = 'Filtros'

export default function ReportesIndexPage() {
  usePaginaActual('Reportes', [MIGAS.reportesIndicadores, { texto: 'Reportes' }])
  return (
    <ListaEnlaces
      icono="documento"
      accion="Abrir reporte"
      enlaces={[
        {
          titulo: 'Cumplimiento del corte de césped',
          descripcion: 'Días entre ciclos frente a la frecuencia y días de ejecución frente a la duración máxima.',
          detalle: { etiqueta: FILTROS, valor: 'Periodo' },
          ruta: RUTAS.cumplimientoCorte,
        },
        {
          titulo: 'Distribución del personal',
          descripcion: 'Personal por cuadrilla, actividad, espacio y jornada, con las horas-persona registradas.',
          detalle: { etiqueta: FILTROS, valor: 'Periodo, cuadrilla, clase y tipo de actividad, y espacio' },
          ruta: RUTAS.distribucionPersonal,
        },
        {
          titulo: 'Atenciones por espacio y sector',
          descripcion: 'Número de atenciones por sector y espacio en un periodo, para priorizar espacios.',
          detalle: { etiqueta: FILTROS, valor: 'Periodo, sector y modalidad' },
          ruta: RUTAS.atencionesEspacioSector,
        },
        {
          titulo: 'Consumo y propagación de material vegetal',
          descripcion: 'Material vegetal e insumos consumidos, propagados y trasladados en un mes, por tipo y espacio.',
          detalle: { etiqueta: FILTROS, valor: 'Mes y espacio' },
          ruta: RUTAS.materialVegetal,
        },
      ]}
    />
  )
}
