/** HU-MOD03-001 y 002: frecuencia por estación y duración máxima de los servicios periódicos. */
import EstadoVacio from '../../components/ui/EstadoVacio'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_PLANIFICACION } from '../../router/rutasApp'

export default function ServiciosPeriodicosPage() {
  usePaginaActual('Servicios periódicos', [MIGAS_PLANIFICACION.planificacion])
  return <EstadoVacio titulo="Servicios periódicos" descripcion="Aquí se mostrarán las frecuencias y la duración de cada servicio." />
}
