/**
 * Índice de reportes de «Reportes e indicadores» (RF-REP-002, RF-REP-004, RF-REP-005 y RF-REP-006).
 * El de RF-REP-005 exige la sesión de MOD-05: sin ella, el guardián lleva al ingreso y después vuelve.
 */
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS, RUTAS } from '../../../router/rutasApp'
import ListaEnlaces from '../ListaEnlaces'

export default function ReportesIndexPage() {
  usePaginaActual('Reportes', [MIGAS.reportesIndicadores, { texto: 'Reportes' }])
  return (
    <ListaEnlaces
      enlaces={[
        {
          titulo: 'Cumplimiento del corte de césped',
          descripcion: 'Días entre ciclos frente a la frecuencia y días de ejecución frente a la duración máxima.',
          ruta: RUTAS.cumplimientoCorte,
        },
        {
          titulo: 'Distribución del personal',
          descripcion: 'Personal por cuadrilla, actividad, espacio y jornada, con las horas-persona registradas.',
          ruta: RUTAS.distribucionPersonal,
        },
        {
          titulo: 'Atenciones por espacio y sector',
          descripcion: 'Número de atenciones por sector y espacio en un periodo, para priorizar espacios.',
          ruta: RUTAS.atencionesEspacioSector,
        },
        {
          titulo: 'Consumo y propagación de material vegetal',
          descripcion: 'Material vegetal e insumos consumidos, propagados y trasladados en un mes, por tipo y espacio.',
          ruta: RUTAS.materialVegetal,
        },
      ]}
    />
  )
}
