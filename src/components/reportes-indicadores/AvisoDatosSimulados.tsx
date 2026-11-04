/**
 * Aviso visible cuando las pantallas nuevas del MOD-06 usan datos simulados (`VITE_DATOS_SIMULADOS=true`).
 * Con el backend real no pinta nada.
 */
import { DATOS_SIMULADOS } from '@/config/datosSimulados'
import AvisoEnLinea from '../ui/AvisoEnLinea'

export default function AvisoDatosSimulados() {
  if (!DATOS_SIMULADOS) return null
  return (
    <AvisoEnLinea tono="info" titulo="Datos simulados">
      Esta pantalla muestra datos de ejemplo. Nada de lo que hagas aquí se guarda en el sistema.
    </AvisoEnLinea>
  )
}
