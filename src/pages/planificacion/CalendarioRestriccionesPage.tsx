/** HU-MOD03-003: calendario de restricciones. */
import EstadoVacio from '../../components/ui/EstadoVacio'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_PLANIFICACION } from '../../router/rutasApp'

export default function CalendarioRestriccionesPage() {
  usePaginaActual('Calendario de restricciones', [MIGAS_PLANIFICACION.planificacion])
  return <EstadoVacio titulo="Calendario de restricciones" descripcion="Aquí se mostrarán las restricciones de cada mes." />
}
