/**
 * Índice de «Asistencia IA» (RF-IA-001).
 */
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS, RUTAS } from '../../../router/rutasApp'
import ListaEnlaces from '../ListaEnlaces'

export default function AsistenciaIaIndexPage() {
  usePaginaActual('Asistencia IA', [MIGAS.reportesIndicadores, { texto: 'Asistencia IA' }])
  return (
    <ListaEnlaces
      enlaces={[
        {
          titulo: 'Extracción de informes de proveedores',
          descripcion:
            'Propuestas de datos extraídos con IA de los informes de los proveedores, para revisarlas antes de registrarlas.',
          ruta: RUTAS.extraccionReportes,
        },
      ]}
    />
  )
}
