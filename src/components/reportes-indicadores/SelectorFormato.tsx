/**
 * Elección del formato de una exportación (RF-REP-009): radios con aspecto de chip, como las decisiones de la
 * revisión con IA. Solo muestra los formatos que admite el tipo de reporte.
 */
import type { FormatoSalida } from '../../types/exportaciones'
import { TEXTO_FORMATO } from '../../utils/exportaciones'
import estilos from './SelectorFormato.module.css'

export interface SelectorFormatoProps {
  /** Prefijo del `name` de los radios (único en la página). */
  nombre: string
  formatos: FormatoSalida[]
  valor: FormatoSalida
  onCambiar: (formato: FormatoSalida) => void
}

export default function SelectorFormato({ nombre, formatos, valor, onCambiar }: SelectorFormatoProps) {
  return (
    <fieldset className={estilos.grupo}>
      <legend className={estilos.leyenda}>Formato</legend>
      <div className={estilos.opciones}>
        {formatos.map((formato) => (
          <label key={formato} className={`${estilos.opcion} ${formato === valor ? estilos.opcionElegida : ''}`}>
            <input
              type="radio"
              name={`${nombre}-formato`}
              value={formato}
              checked={formato === valor}
              onChange={() => onCambiar(formato)}
            />
            {TEXTO_FORMATO[formato]}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
