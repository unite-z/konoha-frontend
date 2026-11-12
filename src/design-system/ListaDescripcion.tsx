/**
 * ListaDescripcion: pares etiqueta-valor de una ficha (`<dl>`), en una cuadrícula que se adapta al ancho.
 * Los valores vacíos se muestran con «—».
 */
import type { ReactNode } from 'react'
import { SIN_VALOR } from '@/utils/formato'
import estilos from './ListaDescripcion.module.css'

export interface ElementoDescripcion {
  etiqueta: string
  valor: ReactNode
  /** Ocupa todo el ancho (textos largos). */
  ancho?: boolean
}

export interface ListaDescripcionProps {
  elementos: (ElementoDescripcion | false | null | undefined)[]
  /**
   * Columnas mínimas de 12rem (por defecto), una sola columna o `filas`: una fila por par, con la etiqueta a la
   * izquierda y una línea entre filas, dentro de un marco (ficha de incidencia, Figma 388-7305).
   */
  columnas?: 'auto' | 'una' | 'filas'
}

export default function ListaDescripcion({ elementos, columnas = 'auto' }: ListaDescripcionProps) {
  const visibles = elementos.filter((e): e is ElementoDescripcion => Boolean(e))
  return (
    <dl className={`${estilos.lista} ${columnas === 'auto' ? '' : estilos[columnas]}`}>
      {visibles.map((e) => (
        <div key={e.etiqueta} className={e.ancho ? estilos.ancho : undefined}>
          <dt className={estilos.etiqueta}>{e.etiqueta}</dt>
          <dd className={estilos.valor}>{e.valor === null || e.valor === undefined || e.valor === '' ? SIN_VALOR : e.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
