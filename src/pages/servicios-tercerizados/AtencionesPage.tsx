// RF-SER-003 a 006 y 011 · Bandeja de atenciones tercerizadas
/**
 * TODO (paso 3 del plan): bandeja con filtros reales (`estado`, `origen`, `contrato_id`, `q`) y paginación del
 * servidor. Por ahora solo confirma que la sesión de MOD-05 funciona; no muestra datos simulados.
 */
import EstadoVacio from '../../components/ui/EstadoVacio'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS } from '../../router/rutasApp'

export default function AtencionesPage() {
  usePaginaActual('Atenciones tercerizadas', [MIGAS_TERCERIZADOS.serviciosTercerizados, MIGAS_TERCERIZADOS.atenciones])
  return (
    <EstadoVacio
      titulo="Bandeja de atenciones en preparación"
      descripcion="Tu sesión está activa. La bandeja con filtros y búsqueda se incorpora en el siguiente paso."
    />
  )
}
