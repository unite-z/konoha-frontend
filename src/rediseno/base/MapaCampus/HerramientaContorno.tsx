/**
 * HerramientaContorno (AV-428): dibuja un polígono sobre el mapa 3D y devuelve GeoJSON en EPSG:4326 con su superficie
 * aproximada en m². Se dibuja en vista planta: al montarse lleva la cámara a `planta`; devolverla a donde estaba
 * es cosa de la vista (`useVistaDeMapa`).
 *
 * - Dibujar: un toque en el suelo añade un vértice (mientras está montada el toque no elige áreas). Con teclado,
 *   «Añadir vértice en el centro» pone uno en el centro de la vista.
 * - Mover: arrastra un vértice (ratón o táctil) o, con el foco en él, flechas (1 m; Mayús, 5 m).
 * - Deshacer: «Deshacer» revierte la última acción (añadir, mover un vértice entero o cerrar).
 * - Cerrar: «Cerrar contorno» con 3 o más vértices; llama a `onCerrar` con el resultado. Un contorno cerrado sigue
 *   editable y vuelve a llamar a `onCerrar` con cada cambio.
 * - Se rechaza todo lo que haga que el contorno se cruce consigo mismo, con un aviso.
 * - Render bajo demanda: el trazo y los vértices solo piden fotograma cuando cambian.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import {
  deGeoJSON,
  distancia,
  resultadoDe,
  seAutointersecta,
  superficieM2,
  type PoligonoGeoJSON,
  type ResultadoContorno,
} from './contorno'
import { useMapa } from './contexto'
import type { Ancla } from './escena'
import estilos from './Herramientas.module.css'

export interface HerramientaContornoProps {
  /** Se llama al cerrar el contorno (y con cada cambio posterior mientras siga cerrado). */
  onCerrar: (resultado: ResultadoContorno) => void
  onCancelar?: () => void
  /** Contorno de partida (editar un área): arranca cerrado. */
  inicial?: PoligonoGeoJSON
  /** Token CSS del color del trazo. */
  token?: string
}

interface VerticeId {
  id: number
  x: number
  y: number
  /** Elemento donde se pinta su botón; la escena lo cuelga de su punto. */
  elemento: HTMLDivElement
}

interface Estado {
  vertices: readonly VerticeId[]
  cerrado: boolean
}

/** Los ids no se repiten entre contornos: el botón de cada vértice cuelga de su elemento. */
let siguienteId = 0

const nuevoVertice = (id: number, x: number, y: number): VerticeId => ({
  id,
  x,
  y,
  elemento: document.createElement('div'),
})

const MENSAJE_CRUCE = 'El contorno se cruzaría consigo mismo. Mueve o quita el vértice y vuelve a intentarlo.'
/** Distancia (m) bajo la cual un vértice nuevo se toma por un toque repetido. */
const DISTANCIA_MINIMA_M = 0.3

export default function HerramientaContorno({
  onCerrar,
  onCancelar,
  inicial,
  token = '--color-action-primary',
}: HerramientaContornoProps) {
  const mapa = useMapa()
  const escena = mapa?.escena
  const proyeccion = mapa?.datos.proyeccion
  const [estado, setEstado] = useState<Estado>({ vertices: [], cerrado: false })
  const estadoActual = useRef(estado)
  const [historial, setHistorial] = useState<Estado[]>([])
  const [aviso, setAviso] = useState<string | null>(null)
  const alCerrar = useRef(onCerrar)
  const anclajes = useRef(new Map<number, Ancla>())
  const arrastre = useRef<{ id: number; registrado: boolean } | null>(null)

  useEffect(() => {
    alCerrar.current = onCerrar
    estadoActual.current = estado
  })

  function poner(nuevo: Estado, registrar: boolean) {
    const previo = estadoActual.current
    if (registrar) setHistorial((h) => [...h, previo])
    estadoActual.current = nuevo
    setEstado(nuevo)
    setAviso(null)
    if (nuevo.cerrado && proyeccion) alCerrar.current(resultadoDe(proyeccion, nuevo.vertices))
  }

  // Contorno de partida: se carga una sola vez, en cuanto hay proyección.
  const [cargado, setCargado] = useState(false)
  if (!cargado && inicial && proyeccion) {
    setCargado(true)
    const vertices = deGeoJSON(proyeccion, inicial).map((v) => nuevoVertice(siguienteId++, v.x, v.y))
    setEstado({ vertices, cerrado: vertices.length >= 3 })
  }

  useEffect(() => {
    escena?.irAVista('planta')
  }, [escena])

  // Toque en el suelo: añade un vértice.
  const anadir = (x: number, y: number) => {
    const actual = estadoActual.current
    if (actual.cerrado) return
    const ultimo = actual.vertices[actual.vertices.length - 1]
    if (ultimo && distancia(ultimo, { x, y }) < DISTANCIA_MINIMA_M) return
    const vertices = [...actual.vertices, nuevoVertice(siguienteId++, x, y)]
    if (seAutointersecta(vertices, false)) {
      setAviso(MENSAJE_CRUCE)
      return
    }
    poner({ vertices, cerrado: false }, true)
  }
  const alAnadir = useRef(anadir)
  useEffect(() => {
    alAnadir.current = anadir
  })
  useEffect(() => {
    if (!escena) return
    return escena.alPulsarSuelo((p) => alAnadir.current(p.x, p.y))
  }, [escena])

  // Trazo sobre el suelo.
  useEffect(() => {
    if (!escena || estado.vertices.length < 2) return
    return escena.dibujarTrazo(
      estado.vertices.flatMap((v) => [v.x, v.y]),
      estado.cerrado,
      token,
    )
  }, [escena, estado, token])

  // Un botón anclado por vértice: se ancla al aparecer, se mueve al cambiar y se quita al desaparecer.
  useEffect(() => {
    if (!escena) return
    const vigentes = new Set(estado.vertices.map((v) => v.id))
    for (const [id, ancla] of anclajes.current) {
      if (vigentes.has(id)) continue
      ancla()
      anclajes.current.delete(id)
    }
    for (const v of estado.vertices) {
      const ancla = anclajes.current.get(v.id)
      if (ancla) ancla.mover(v.x, v.y)
      else anclajes.current.set(v.id, escena.anclar(v.elemento, v.x, v.y, 0.5))
    }
  }, [escena, estado])
  useEffect(() => {
    const actuales = anclajes.current
    return () => {
      for (const ancla of actuales.values()) ancla()
      actuales.clear()
    }
  }, [escena])

  function moverA(id: number, x: number, y: number, registrar: boolean) {
    const actual = estadoActual.current
    const vertices = actual.vertices.map((v) => (v.id === id ? { ...v, x, y } : v))
    if (seAutointersecta(vertices, actual.cerrado)) {
      setAviso(MENSAJE_CRUCE)
      return false
    }
    poner({ ...actual, vertices }, registrar)
    return true
  }

  function alBajar(e: PointerEvent<HTMLButtonElement>, id: number) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    arrastre.current = { id, registrado: false }
  }
  function alMoverPuntero(e: PointerEvent<HTMLButtonElement>) {
    const en = arrastre.current
    if (!en || !escena) return
    const punto = escena.suelo(e.clientX, e.clientY)
    if (!punto) return
    if (moverA(en.id, punto.x, punto.y, !en.registrado)) en.registrado = true
  }
  function alSoltar(e: PointerEvent<HTMLButtonElement>) {
    arrastre.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }
  function alPulsarTecla(e: KeyboardEvent<HTMLButtonElement>, v: VerticeId) {
    const paso = e.shiftKey ? 5 : 1
    const flechas: Record<string, [number, number]> = {
      ArrowLeft: [-paso, 0],
      ArrowRight: [paso, 0],
      ArrowUp: [0, paso],
      ArrowDown: [0, -paso],
    }
    if (!flechas[e.key]) return
    moverA(v.id, v.x + flechas[e.key][0], v.y + flechas[e.key][1], true)
    e.preventDefault()
    e.stopPropagation()
  }

  function deshacer() {
    const anterior = historial[historial.length - 1]
    if (!anterior) return
    setHistorial(historial.slice(0, -1))
    estadoActual.current = anterior
    setEstado(anterior)
    setAviso(null)
    if (anterior.cerrado && proyeccion) alCerrar.current(resultadoDe(proyeccion, anterior.vertices))
  }

  function cerrar() {
    const actual = estadoActual.current
    if (actual.vertices.length < 3 || actual.cerrado) return
    if (seAutointersecta(actual.vertices, true)) {
      setAviso(MENSAJE_CRUCE)
      return
    }
    poner({ ...actual, cerrado: true }, true)
  }

  const { vertices, cerrado } = estado
  const superficie = vertices.length >= 3 ? superficieM2(vertices) : null
  return (
    <section className={estilos.herramienta} aria-label="Dibujar un contorno en el mapa">
      <p className={estilos.ayuda}>
        {cerrado
          ? 'Contorno cerrado. Arrastra un vértice, o usa las flechas con el foco en él, para ajustarlo.'
          : 'Toca el mapa para añadir vértices, o añade uno en el centro de la vista. Cierra el contorno con tres o más.'}
      </p>
      <p className={estilos.dato} role="status">
        {vertices.length === 0
          ? 'Sin vértices todavía.'
          : `${vertices.length} ${vertices.length === 1 ? 'vértice' : 'vértices'}` +
            (superficie === null ? '' : ` · Superficie aproximada: ${Math.round(superficie).toLocaleString('es')} m²`)}
      </p>
      {aviso && (
        <AvisoEnLinea compacto tono="error">
          {aviso}
        </AvisoEnLinea>
      )}
      <div className={estilos.acciones}>
        {!cerrado && (
          <Boton
            variante="secundario"
            compacto
            icono="plus"
            deshabilitado={!escena}
            onClick={() => {
              const c = escena?.centro()
              if (c) anadir(c.x, c.y)
            }}
          >
            Añadir vértice en el centro
          </Boton>
        )}
        <Boton variante="fantasma" compacto icono="history" deshabilitado={historial.length === 0} onClick={deshacer}>
          Deshacer
        </Boton>
        {!cerrado && (
          <Boton variante="primario" compacto icono="check" deshabilitado={vertices.length < 3} onClick={cerrar}>
            Cerrar contorno
          </Boton>
        )}
        {onCancelar && (
          <Boton variante="fantasma" compacto icono="x" onClick={onCancelar}>
            Cancelar
          </Boton>
        )}
      </div>
      {vertices.map((v, posicion) =>
        createPortal(
          // Excepción al sistema (AV-351): vértice del mapa, un botón propio colgado de CSS2DRenderer.
          <button
            type="button"
            className={estilos.vertice}
            data-primero={posicion === 0}
            aria-label={`Vértice ${posicion + 1} de ${vertices.length}. Arrástralo o usa las flechas para moverlo 1 m (Mayús, 5 m).`}
            onPointerDown={(e) => alBajar(e, v.id)}
            onPointerMove={alMoverPuntero}
            onPointerUp={alSoltar}
            onPointerCancel={alSoltar}
            onKeyDown={(e) => alPulsarTecla(e, v)}
          />,
          v.elemento,
          v.id,
        ),
      )}
    </section>
  )
}
