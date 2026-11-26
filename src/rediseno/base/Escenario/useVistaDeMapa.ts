import { useCallback, useContext, useEffect, useId, useRef } from 'react'
import type { AreaCampus } from '@/types/campus3d'
import type { MapaCampusRef } from '../MapaCampus/MapaCampus'
import type { VistaMapa } from '../MapaCampus/escena'
import { ContextoMapaVisible, ContextoRegistro } from './contexto'

export interface OpcionesVistaMapa {
  /** Id (`mapa_id`) o posición del área abierta: la cámara vuela a ella y «Atrás» (área `undefined`) deshace el vuelo. */
  areaSeleccionada?: number | string
  vista?: VistaMapa
  /** Clic o teclado sobre el mapa: el módulo decide qué hace (normalmente poner `?area=` en la URL). */
  onSeleccionarArea: (area: AreaCampus | null) => void
}

const SIN_MAPA: MapaCampusRef = { volarA: () => undefined, volver: () => undefined }

/**
 * Declara que esta vista trabaja sobre el mapa: el escenario del layout se muestra (la primera vez monta el mapa y carga
 * Three.js) y sigue sus opciones. Al desmontarse la vista, el mapa se difumina y deja de dibujar, pero sigue en memoria.
 * Devuelve los controles imperativos del mapa vivo. Fuera del layout del rediseño no hace nada.
 */
export function useVistaDeMapa({
  areaSeleccionada,
  vista = 'iso',
  onSeleccionarArea,
}: OpcionesVistaMapa): MapaCampusRef {
  const registro = useContext(ContextoRegistro)
  const id = useId()
  const reciente = useRef(onSeleccionarArea)
  useEffect(() => {
    reciente.current = onSeleccionarArea
  })
  const alSeleccionar = useCallback((area: AreaCampus | null) => reciente.current(area), [])

  useEffect(() => {
    registro?.registrar({ id, areaSeleccionada, vista, alSeleccionar })
  }, [registro, id, areaSeleccionada, vista, alSeleccionar])
  useEffect(() => () => registro?.quitar(id), [registro, id])

  return registro?.mapa ?? SIN_MAPA
}

/** ¿Está visible el mapa del escenario? */
export function useMapaVisible(): boolean {
  return useContext(ContextoMapaVisible)
}
