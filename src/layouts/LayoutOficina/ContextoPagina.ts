/**
 * Contexto con el título y las migas de pan de la página actual (Guía Web 4.2).
 * Cada página los declara con `usePaginaActual`; la cabecera los muestra.
 * Es el único uso del contexto de React en la aplicación (no guarda datos de la API).
 */
import { createContext } from 'react'

/** Un nivel de las migas de pan. Sin `ruta`, el nivel se muestra sin enlace. */
export interface Miga {
  texto: string
  ruta?: string
}

export interface DatosPagina {
  titulo: string
  migas: Miga[]
}

export interface ValorContextoPagina {
  pagina: DatosPagina
  establecerPagina: (pagina: DatosPagina) => void
}

export const ContextoPagina = createContext<ValorContextoPagina | null>(null)
