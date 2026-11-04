/**
 * Índice de «Asistencia IA» (RF-IA-001, RN-IA-002, RF-IA-002, RF-IA-003 y RF-IA-004).
 */
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS, RUTAS } from '@/router/rutasApp'
import ListaEnlaces from '../ListaEnlaces'

export default function AsistenciaIaIndexPage() {
  usePaginaActual('Asistencia IA', [MIGAS.reportesIndicadores, { texto: 'Asistencia IA' }])
  return (
    <ListaEnlaces
      icono="destello"
      accion="Abrir asistencia"
      enlaces={[
        {
          titulo: 'Extracción de informes de proveedores',
          descripcion:
            'Propuestas de datos extraídos con IA de los informes de los proveedores, para revisarlas antes de registrarlas.',
          detalle: { etiqueta: 'Filtros', valor: 'Estado de la propuesta' },
          ruta: RUTAS.extraccionReportes,
        },
        {
          titulo: 'Prioridades de atención',
          descripcion:
            'Propuestas de prioridad para espacios (áreas y jardines) y ejemplares según historial, incidencias, frecuencia y estado, para revisarlas antes de programar.',
          detalle: { etiqueta: 'Filtros', valor: 'Estado de la propuesta' },
          ruta: RUTAS.priorizacionIa,
        },
        {
          titulo: 'Revisión de inconsistencias',
          descripcion:
            'Posibles duplicados, valores atípicos, campos incompatibles o nombres no normalizados detectados con IA, para revisarlos antes de corregir.',
          detalle: { etiqueta: 'Filtros', valor: 'Estado, tipo de hallazgo y conjunto de datos' },
          ruta: RUTAS.inconsistenciasIa,
        },
        {
          titulo: 'Planificación asistida',
          descripcion:
            'Propuesta de cronograma con fechas, ubicaciones y recursos según frecuencias, restricciones y disponibilidad, para revisarla antes de programar.',
          detalle: { etiqueta: 'Filtros', valor: 'Estado y periodo' },
          ruta: RUTAS.cronogramaIa,
        },
        {
          titulo: 'Estimación de recursos',
          descripcion:
            'Referencia de operarios, duración e insumos para una actividad según antecedentes comparables, para confirmarla antes de organizar el trabajo.',
          detalle: { etiqueta: 'Filtros', valor: 'Estado de la estimación' },
          ruta: RUTAS.estimacionRecursos,
        },
      ]}
    />
  )
}
