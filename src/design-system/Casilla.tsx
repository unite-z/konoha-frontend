/**
 * Casilla: componente «Casilla» del sistema de diseño de Figma (DESIGN.md, 4.1).
 *
 * Casilla de verificación nativa (teclado y lectores de pantalla del navegador) con el aspecto de Figma:
 * 16px, borde fuerte y marcada en color de acento. La etiqueta va siempre a la derecha y es parte del control.
 * Para elegir una sola opción entre varias, usa `GrupoOpciones`.
 */
import { useId, type InputHTMLAttributes } from 'react'
import estilos from './Casilla.module.css'

export interface CasillaProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'checked'> {
  etiqueta: string
  marcada: boolean
  onCambiar: (marcada: boolean) => void
  /** Texto de apoyo bajo la etiqueta. */
  ayuda?: string
}

export default function Casilla({ etiqueta, marcada, onCambiar, ayuda, id, className, ...resto }: CasillaProps) {
  const idPropio = useId()
  const idControl = id ?? idPropio
  const idAyuda = `${idControl}-ayuda`
  return (
    <div className={[estilos.casilla, className].filter(Boolean).join(' ')}>
      <input
        {...resto}
        id={idControl}
        type="checkbox"
        className={estilos.control}
        checked={marcada}
        onChange={(evento) => onCambiar(evento.target.checked)}
        aria-describedby={ayuda ? idAyuda : resto['aria-describedby']}
      />
      <span className={estilos.textos}>
        <label htmlFor={idControl} className={estilos.etiqueta}>
          {etiqueta}
        </label>
        {ayuda && (
          <span id={idAyuda} className={estilos.ayuda}>
            {ayuda}
          </span>
        )}
      </span>
    </div>
  )
}
