/**
 * Pestanas: componente «Pestaña» del sistema de diseño de Figma (DESIGN.md, 4.1), como control segmentado.
 * Patrón «tabs» de WAI-ARIA con activación manual.
 * Flechas izquierda/derecha, Inicio y Fin mueven entre pestañas; solo la activa está en el orden de tabulación.
 */
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import estilos from './Pestanas.module.css'

export interface Pestana {
  valor: string
  texto: string
  /** Número de elementos de la pestaña («Abiertas 2»). */
  contador?: number
  /** Otro contenido junto al texto (por ejemplo, un `Estado`). */
  extra?: ReactNode
}

export interface PestanasProps {
  etiqueta: string
  pestanas: Pestana[]
  valor: string
  onCambiar: (valor: string) => void
  /** Contenido en la misma fila que las pestañas, a su izquierda (Figma: la navegación del Calendario). */
  barra?: ReactNode
  children: ReactNode
}

export default function Pestanas({ etiqueta, pestanas, valor, onCambiar, barra, children }: PestanasProps) {
  const base = useId()
  const botones = useRef<(HTMLButtonElement | null)[]>([])

  function teclado(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const ultimo = pestanas.length - 1
    const destino =
      evento.key === 'ArrowRight' ? (indice === ultimo ? 0 : indice + 1)
      : evento.key === 'ArrowLeft' ? (indice === 0 ? ultimo : indice - 1)
      : evento.key === 'Home' ? 0
      : evento.key === 'End' ? ultimo
      : null
    if (destino === null) return
    evento.preventDefault()
    botones.current[destino]?.focus()
    onCambiar(pestanas[destino].valor)
  }

  const lista = (
    <div role="tablist" aria-label={etiqueta} className={estilos.lista}>
      {pestanas.map((pestana, indice) => {
        const activa = pestana.valor === valor
        return (
          <button
            key={pestana.valor}
            ref={(elemento) => {
              botones.current[indice] = elemento
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${pestana.valor}`}
            aria-selected={activa}
            aria-controls={`${base}-panel`}
            tabIndex={activa ? 0 : -1}
            className={`${estilos.pestana} ${activa ? estilos.activa : ''}`}
            onClick={() => onCambiar(pestana.valor)}
            onKeyDown={(e) => teclado(e, indice)}
          >
            {pestana.texto}
            {/* El espacio no se ve (flex), pero separa el número en el nombre accesible: «Abiertas 2». */}
            {pestana.contador !== undefined && <> <span className={estilos.contador}>{pestana.contador}</span></>}
            {pestana.extra}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className={estilos.contenedor}>
      {barra ? (
        <div className={estilos.conBarra}>
          <div className={estilos.barra}>{barra}</div>
          {lista}
        </div>
      ) : (
        lista
      )}
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${valor}`} className={estilos.panel}>
        {children}
      </div>
    </div>
  )
}
