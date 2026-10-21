/**
 * Indicador de pasos de un asistente (Guía Web 5.13, figura 15).
 *
 * Paso actual con su número en círculo, completados con marca y pendientes con contorno neutral.
 * Los pasos ya visitados son botones para volver a ellos; los posteriores no se pueden saltar.
 */
import Icono from './Icono'
import estilos from './AsistentePasos.module.css'

export interface AsistentePasosProps {
  pasos: string[]
  /** Índice del paso actual (desde 0). */
  actual: number
  /** Último paso al que se llegó (los anteriores o iguales se pueden visitar). */
  alcanzado: number
  onIrA: (indice: number) => void
}

export default function AsistentePasos({ pasos, actual, alcanzado, onIrA }: AsistentePasosProps) {
  return (
    <ol className={estilos.pasos} aria-label="Pasos">
      {pasos.map((paso, indice) => {
        const situacion = indice === actual ? 'actual' : indice < Math.max(actual, alcanzado) ? 'completado' : 'pendiente'
        const contenido = (
          <>
            <span className={estilos.marca} aria-hidden="true">
              {situacion === 'completado' ? <Icono nombre="verificacion" tamano="sm" /> : indice + 1}
            </span>
            <span className={estilos.nombre}>
              {paso}
              <span className="sr-only">
                {situacion === 'completado' ? ' (completado)' : situacion === 'pendiente' ? ' (pendiente)' : ''}
              </span>
            </span>
          </>
        )
        const visitable = indice !== actual && indice <= alcanzado
        return (
          <li key={paso} className={`${estilos.paso} ${estilos[situacion]}`} aria-current={indice === actual ? 'step' : undefined}>
            {visitable ? (
              <button type="button" className={estilos.boton} onClick={() => onIrA(indice)}>
                {contenido}
              </button>
            ) : (
              <span className={estilos.boton}>{contenido}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
