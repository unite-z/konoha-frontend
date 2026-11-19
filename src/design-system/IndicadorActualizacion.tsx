/**
 * «Actualizado el …» con el botón terciario «Actualizar», que repite la consulta sin recargar la página
 * (Guía Web 8.3: rendimiento percibido).
 */
import Boton from './Boton'
import estilos from './IndicadorActualizacion.module.css'

export interface IndicadorActualizacionProps {
  /** Fecha y hora ya formateadas (por ejemplo, «20 oct. 2026, 10:35»). */
  actualizadoEl: string
  onActualizar: () => void
  cargando?: boolean
}

export default function IndicadorActualizacion({ actualizadoEl, onActualizar, cargando }: IndicadorActualizacionProps) {
  return (
    <div className={estilos.indicador}>
      <p className={estilos.texto} aria-live="polite">
        Actualizado el {actualizadoEl}
      </p>
      <Boton variante="terciario" compacto onClick={onActualizar} cargando={cargando}>
        Actualizar
      </Boton>
    </div>
  )
}
