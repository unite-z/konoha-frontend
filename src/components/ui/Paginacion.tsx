/**
 * Paginacion: componente «Paginación» del sistema de diseño de Figma (DESIGN.md, 4.2).
 *
 * Resumen «Mostrando 11 a 20 de 128» a la izquierda; a la derecha, «Anterior», hasta tres números alrededor
 * de la página actual (marcada con `aria-current`) y «Siguiente». En la primera y la última página el botón
 * que no lleva a ningún sitio queda deshabilitado. `TablaDatos` la usa; también vale para listas propias.
 */
import type { ReactNode } from 'react'
import Boton from './Boton'
import { formatearNumero } from '@/utils/formato'
import estilos from './Paginacion.module.css'

export interface PaginacionProps {
  /** Página actual, desde 1. */
  pagina: number
  porPagina: number
  total: number
  onCambiar: (pagina: number) => void
  /** Control extra junto a los botones (por ejemplo, «Filas por página»). */
  extra?: ReactNode
}

/** Números de página visibles: la actual y una a cada lado, sin salirse del rango. */
export function paginasVisibles(pagina: number, totalPaginas: number): number[] {
  const inicio = Math.max(1, Math.min(pagina - 1, totalPaginas - 2))
  const fin = Math.min(totalPaginas, inicio + 2)
  return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i)
}

export default function Paginacion({ pagina, porPagina, total, onCambiar, extra }: PaginacionProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const primero = total === 0 ? 0 : (pagina - 1) * porPagina + 1
  const ultimo = Math.min(total, pagina * porPagina)

  return (
    <div className={estilos.paginacion}>
      <p className={`${estilos.resumen} cifra`}>
        Mostrando {formatearNumero(primero)} a {formatearNumero(ultimo)} de {formatearNumero(total)}
      </p>
      <div className={estilos.controles}>
        {extra}
        <nav aria-label="Paginación" className={estilos.paginas}>
          <Boton variante="fantasma" compacto deshabilitado={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
            Anterior
          </Boton>
          {paginasVisibles(pagina, totalPaginas).map((numero) => (
            <button
              key={numero}
              type="button"
              className={`${estilos.numero} ${numero === pagina ? estilos.actual : ''}`}
              aria-current={numero === pagina ? 'page' : undefined}
              aria-label={`Página ${numero}`}
              onClick={() => numero !== pagina && onCambiar(numero)}
            >
              {numero}
            </button>
          ))}
          <Boton
            variante="fantasma"
            compacto
            deshabilitado={pagina >= totalPaginas}
            onClick={() => onCambiar(pagina + 1)}
          >
            Siguiente
          </Boton>
        </nav>
      </div>
    </div>
  )
}
