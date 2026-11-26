import { createContext } from 'react'
import type { AreaCampus } from '@/types/campus3d'
import type { MapaCampusRef } from '../MapaCampus/MapaCampus'
import type { VistaMapa } from '../MapaCampus/escena'

/** Lo que una vista de mapa le pide al escenario. */
export interface EntradaVistaMapa {
  id: string
  areaSeleccionada?: number | string
  vista: VistaMapa
  alSeleccionar: (area: AreaCampus | null) => void
}

export interface RegistroEscenario {
  registrar: (entrada: EntradaVistaMapa) => void
  quitar: (id: string) => void
  /** Controles imperativos del mapa vivo (no hacen nada mientras no está montado). */
  mapa: MapaCampusRef
}

/** Estable durante toda la vida del escenario: usarlo no vuelve a renderizar la vista. */
export const ContextoRegistro = createContext<RegistroEscenario | null>(null)

/** ¿Hay ahora una vista de mapa? El layout lo usa para dejar el fondo liso o transparente. */
export const ContextoMapaVisible = createContext(false)
