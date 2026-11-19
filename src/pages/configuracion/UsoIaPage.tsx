/** Configuración › Uso y costes de la IA (AV-396, AV-397). */
import { usePaginaActual } from '@/hooks/usePaginaActual'
import estilos from './Configuracion.module.css'
import { MIGA_CONFIGURACION } from './ConfiguracionPage'
import SeccionUsoIa from './SeccionUsoIa'

export default function UsoIaPage() {
  usePaginaActual('Uso y costes de la IA', [MIGA_CONFIGURACION, { texto: 'Uso y costes de la IA' }])
  return (
    <div className={estilos.paginaAncha}>
      <SeccionUsoIa />
    </div>
  )
}
