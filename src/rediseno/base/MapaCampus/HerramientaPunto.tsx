/**
 * HerramientaPunto (AV-428): devuelve la lon/lat (EPSG:4326) del punto que se toca en el mapa 3D. Sustituye a
 * `SelectorPuntoMapa`. Controlada: el módulo guarda el `punto` y le pasa `validacion` (el resultado de
 * `useUbicacionEnMapa` para ese punto); la base no llama al servidor.
 *
 * - Ratón y táctil: un toque en el suelo marca el punto (mientras la herramienta está montada el toque no elige áreas).
 * - Teclado: «Marcar el centro del mapa» pone el punto en el centro de la vista; con el punto marcado, las flechas
 *   (Mayús: ×5) lo mueven 1 m y el botón «Quitar el punto» lo borra. Las flechas solo actúan con el foco en el botón
 *   del punto, así no chocan con las del lienzo.
 * - Render bajo demanda: solo se pide un fotograma al marcar, mover o quitar (`anclar` lo hace).
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import Boton from '@/design-system/Boton'
import ValidacionUbicacion from '@/pages/inventario/ValidacionUbicacion'
import type { useUbicacionEnMapa } from '@/pages/inventario/useUbicacionEnMapa'
import type { Ancla } from './escena'
import estilos from './Herramientas.module.css'
import { useMapa } from './contexto'
import { lonLatAMetros, metrosALonLat } from './proyeccion'

export interface PuntoLonLat {
  lon: number
  lat: number
}

export interface HerramientaPuntoProps {
  punto: PuntoLonLat | null
  onElegir: (punto: PuntoLonLat | null) => void
  /** Resultado de validar `punto` (lo calcula el módulo con `useUbicacionEnMapa`). Sin él no se enseña ningún aviso. */
  validacion?: ReturnType<typeof useUbicacionEnMapa>
  /** Ubicación guardada (editar la ubicación): se ve como referencia, sin moverse. */
  puntoActual?: PuntoLonLat | null
}

const PASO_M = 1

export default function HerramientaPunto({ punto, onElegir, validacion, puntoActual }: HerramientaPuntoProps) {
  const mapa = useMapa()
  const escena = mapa?.escena
  const proyeccion = mapa?.datos.proyeccion
  const alElegir = useRef(onElegir)
  useEffect(() => {
    alElegir.current = onElegir
  })

  useEffect(() => {
    if (!escena || !proyeccion) return
    return escena.alPulsarSuelo((p) => alElegir.current(metrosALonLat(proyeccion, p.x, p.y)))
  }, [escena, proyeccion])

  // Un solo elemento anclado una vez; al mover el punto solo cambia de sitio, así el botón conserva el foco.
  const [ancla] = useState(() => document.createElement('div'))
  const metros = punto && proyeccion ? lonLatAMetros(proyeccion, punto.lon, punto.lat) : null
  const hayPunto = metros !== null
  const anclaje = useRef<Ancla | null>(null)
  useEffect(() => {
    if (!escena || !hayPunto) return
    anclaje.current = escena.anclar(ancla, 0, 0, 0.5)
    return () => {
      anclaje.current?.()
      anclaje.current = null
    }
  }, [escena, ancla, hayPunto])
  const x = metros?.x
  const y = metros?.y
  useEffect(() => {
    if (x !== undefined && y !== undefined) anclaje.current?.mover(x, y)
  }, [escena, hayPunto, x, y])

  // Ubicación guardada: un marcador fijo de referencia.
  const actual = puntoActual && proyeccion ? lonLatAMetros(proyeccion, puntoActual.lon, puntoActual.lat) : null
  const actualX = actual?.x ?? null
  const actualY = actual?.y ?? null
  useEffect(() => {
    if (!escena || actualX === null || actualY === null) return
    const elemento = document.createElement('div')
    elemento.className = estilos.puntoActual
    elemento.title = 'Ubicación guardada'
    elemento.setAttribute('aria-hidden', 'true')
    return escena.anclar(elemento, actualX, actualY, 0.4)
  }, [escena, actualX, actualY])

  // Con teclado, tras «Marcar el centro del mapa» el foco pasa al punto para ajustarlo con las flechas.
  const boton = useRef<HTMLButtonElement>(null)
  const enfocar = useRef(false)
  useEffect(() => {
    if (!enfocar.current || !boton.current) return
    enfocar.current = false
    boton.current.focus()
  }, [punto])

  function mover(dx: number, dy: number) {
    if (!proyeccion || !metros) return
    alElegir.current(metrosALonLat(proyeccion, metros.x + dx, metros.y + dy))
  }
  function alPulsarTecla(e: KeyboardEvent<HTMLButtonElement>) {
    const paso = (e.shiftKey ? 5 : 1) * PASO_M
    const flechas: Record<string, [number, number]> = {
      ArrowLeft: [-paso, 0],
      ArrowRight: [paso, 0],
      ArrowUp: [0, paso],
      ArrowDown: [0, -paso],
    }
    if (flechas[e.key]) mover(...flechas[e.key])
    else if (e.key === 'Delete' || e.key === 'Backspace') alElegir.current(null)
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  const marcarCentro = () => {
    if (!escena || !proyeccion) return
    const c = escena.centro()
    enfocar.current = true
    alElegir.current(metrosALonLat(proyeccion, c.x, c.y))
  }

  return (
    <section className={estilos.herramienta} aria-label="Elegir un punto en el mapa">
      <p className={estilos.ayuda}>
        Toca el mapa para marcar el punto, o marca el centro de la vista y ajústalo con las flechas.
      </p>
      <div className={estilos.acciones}>
        <Boton variante="secundario" compacto icono="locate" onClick={marcarCentro} deshabilitado={!escena}>
          Marcar el centro del mapa
        </Boton>
        {punto && (
          <Boton variante="fantasma" compacto icono="x" onClick={() => alElegir.current(null)}>
            Quitar el punto
          </Boton>
        )}
      </div>
      {punto && (
        <p className={estilos.coordenadas} role="status">
          Punto elegido: {punto.lat.toFixed(6)}, {punto.lon.toFixed(6)}
        </p>
      )}
      {puntoActual && (
        <p className={estilos.ayuda}>
          Ubicación guardada: {puntoActual.lat.toFixed(6)}, {puntoActual.lon.toFixed(6)} (marcador hueco).
        </p>
      )}
      {punto && validacion && <ValidacionUbicacion ubicacion={validacion} />}
      {punto &&
        createPortal(
          // Excepción al sistema (AV-351): marcador del mapa colgado de CSS2DRenderer.
          <button
            ref={boton}
            type="button"
            className={estilos.punto}
            data-herramienta="punto"
            aria-label="Punto elegido. Flechas para moverlo 1 m (Mayús, 5 m); Suprimir lo quita."
            onKeyDown={alPulsarTecla}
          />,
          ancla,
        )}
    </section>
  )
}
