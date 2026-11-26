import { RefreshCw } from 'lucide-react'
import { useCola, porSincronizar } from '@/sincronizacion/cola'
import { rutaCuenta } from '../../cuenta/enlaces'
import { EnlaceTransicion } from '../movimiento'
import estilos from './Cabecera.module.css'

/** Indicador de sincronización (N-12): solo aparece con operaciones pendientes y lleva a Datos sin conexión. */
export default function Sincronizacion() {
  const pendientes = porSincronizar(useCola()).length
  if (pendientes === 0) return null
  const texto = pendientes === 1 ? '1 operación pendiente de enviar' : `${pendientes} operaciones pendientes de enviar`
  return (
    <EnlaceTransicion to={rutaCuenta()} className={estilos.sincronizacion} aria-label={texto} title={texto}>
      <RefreshCw size={16} aria-hidden="true" />
      <span className={estilos.contador}>{pendientes}</span>
    </EnlaceTransicion>
  )
}
