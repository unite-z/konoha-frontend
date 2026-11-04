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
  /** Línea bajo el título (por ejemplo, el mes del Resumen de planificación). */
  subtitulo?: string
  /** El h1 queda solo para lectores de pantalla (por ejemplo, «Acceso denegado», donde manda el estado centrado). */
  tituloOculto?: boolean
  /**
   * Ficha de un registro en móvil (Figma «Móvil · Detalle de ciclo» 353-2242): la barra superior lleva `titulo`
   * (el código) y la flecha a `volver` en lugar del menú, y el contenido empieza con `encabezado` (el servicio) y
   * `subtitulo`. El h1 sigue siendo el título completo para lectores de pantalla.
   */
  movil?: DatosMovil
}

export interface DatosMovil {
  titulo?: string
  encabezado?: string
  subtitulo?: string
  volver?: Miga
}

export interface ValorContextoPagina {
  pagina: DatosPagina
  establecerPagina: (pagina: DatosPagina) => void
  /** Hueco a la derecha del título donde `AccionesPagina` pinta la acción principal (null hasta montarse). */
  nodoAcciones?: HTMLElement | null
  /** Hueco pegado al título donde `JuntoTitulo` pinta, por ejemplo, el estado del registro («Programada»). */
  nodoJunto?: HTMLElement | null
  /** Hueco a la derecha de la barra superior móvil donde `AccionMovil` pinta la acción de la página. */
  nodoAccionMovil?: HTMLElement | null
}

export const ContextoPagina = createContext<ValorContextoPagina | null>(null)
