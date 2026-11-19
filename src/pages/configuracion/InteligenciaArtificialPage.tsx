/** Configuración › Inteligencia artificial (AV-395, AV-397): proveedor y modelo de los asistentes de IA. */
import { usePaginaActual } from '@/hooks/usePaginaActual'
import estilos from './Configuracion.module.css'
import { MIGA_CONFIGURACION } from './ConfiguracionPage'
import SeccionInteligenciaArtificial from './SeccionInteligenciaArtificial'

export default function InteligenciaArtificialPage() {
  usePaginaActual('Inteligencia artificial', [MIGA_CONFIGURACION, { texto: 'Inteligencia artificial' }])
  return (
    <div className={estilos.pagina}>
      <SeccionInteligenciaArtificial />
    </div>
  )
}
