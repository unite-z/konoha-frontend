/**
 * Contexto del mapa vivo (AV-426). Lo publica el escenario del layout cuando `MapaCampus` tiene la escena lista, y lo
 * leen las tres capas públicas (`CapaColores`, `CapaMarcadores`, `CapaGeometrias`). Fuera de él, `escena` es `null` y
 * las capas no hacen nada.
 */
import { createContext, useContext } from 'react'
import type { DatosCampus } from '@/types/campus3d'
import type { Escena } from './escena'

export interface MapaListo {
  escena: Escena
  datos: DatosCampus
}

export const ContextoMapa = createContext<MapaListo | null>(null)

/** La escena y los datos del campus, o `null` mientras el mapa no está listo. */
export function useMapa(): MapaListo | null {
  return useContext(ContextoMapa)
}
