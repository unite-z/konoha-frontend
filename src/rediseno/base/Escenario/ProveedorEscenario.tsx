/**
 * Escenario persistente (AV-426): el `MapaCampus` 3D se monta una sola vez en el layout del rediseño y no se desmonta
 * al navegar entre vistas. Las vistas de mapa lo declaran con `useVistaDeMapa`; con alguna activa el mapa se ve y dibuja,
 * sin ninguna se difumina y se pausa (sigue en memoria). El mapa (y con él Three.js) no se monta hasta la primera vista
 * de mapa. Las capas leen la escena con `useMapa()` (`ContextoMapa`).
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AreaCampus } from '@/types/campus3d'
import { ContextoMapa, type MapaListo } from '../MapaCampus/contexto'
import type { MapaCampusRef } from '../MapaCampus/MapaCampus'
import { ContextoMapaVisible, ContextoRegistro, type EntradaVistaMapa, type RegistroEscenario } from './contexto'
import estilos from './Escenario.module.css'

// El envoltorio de MapaCampus es ligero; Three.js sigue en su propio chunk (`import('./escena')`).
const MapaCampus = lazy(() => import('../MapaCampus/MapaCampus'))

const iguales = (a: EntradaVistaMapa, b: EntradaVistaMapa) =>
  a.id === b.id &&
  a.areaSeleccionada === b.areaSeleccionada &&
  a.vista === b.vista &&
  a.alSeleccionar === b.alSeleccionar

export default function ProveedorEscenario({ children }: { children: ReactNode }) {
  const [entradas, setEntradas] = useState<EntradaVistaMapa[]>([])
  const [ultima, setUltima] = useState<EntradaVistaMapa | null>(null)
  const [montado, setMontado] = useState(false)
  const [listo, setListo] = useState<MapaListo | null>(null)
  const mapa = useRef<MapaCampusRef>(null)
  const activa = entradas.at(-1)
  const visible = activa !== undefined
  // Sin vista de mapa se conserva la última posición de cámara pedida: no hay vuelo mientras está oculto.
  const config = activa ?? ultima

  const registro = useMemo<RegistroEscenario>(
    () => ({
      registrar: (entrada) => {
        setMontado(true)
        setUltima(entrada)
        setEntradas((previas) => {
          const actual = previas.find((e) => e.id === entrada.id)
          if (actual && iguales(actual, entrada)) return previas
          return [...previas.filter((e) => e.id !== entrada.id), entrada]
        })
      },
      quitar: (id) =>
        setEntradas((previas) => (previas.some((e) => e.id === id) ? previas.filter((e) => e.id !== id) : previas)),
      mapa: {
        volarA: (destino) => mapa.current?.volarA(destino),
        volver: () => mapa.current?.volver(),
      },
    }),
    [],
  )

  const alSeleccionarActiva = useRef<EntradaVistaMapa['alSeleccionar'] | undefined>(undefined)
  useEffect(() => {
    alSeleccionarActiva.current = activa?.alSeleccionar
  })
  const seleccionar = useCallback((area: AreaCampus | null) => alSeleccionarActiva.current?.(area), [])

  return (
    <ContextoRegistro value={registro}>
      <ContextoMapaVisible value={visible}>
        <ContextoMapa value={listo}>
          <div
            className={estilos.escenario}
            data-visible={visible}
            inert={!visible}
            aria-hidden={visible ? undefined : true}
          >
            {montado ? (
              <Suspense fallback={null}>
                <MapaCampus
                  ref={mapa}
                  areaSeleccionada={config?.areaSeleccionada}
                  vista={config?.vista}
                  onSeleccionarArea={seleccionar}
                  activo={visible}
                  onEscena={setListo}
                />
              </Suspense>
            ) : null}
          </div>
          {children}
        </ContextoMapa>
      </ContextoMapaVisible>
    </ContextoRegistro>
  )
}
