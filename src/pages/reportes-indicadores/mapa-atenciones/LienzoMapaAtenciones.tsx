/**
 * Lienzo del mapa de atenciones (RF-REP-007 · CU-MOD06-003; Guía Web 5.8). Es el único fichero que importa
 * `maplibre-gl`: la página lo carga con `React.lazy`, así MapLibre va en un fragmento aparte (Guía Web 8.3).
 *
 * - Mapa base: el mismo que el mapa de áreas verdes de MOD-02 (teselas ráster de OpenStreetMap).
 * - Espacios de las atenciones (Polygon y MultiPolygon): relleno con el color de su tipo de uso (catálogo de MOD-02,
 *   como en el mapa de áreas verdes) y borde `--map-area-line`; sin tipo de uso, `--map-area-fill`. La leyenda
 *   muestra los tipos de uso de los espacios dibujados.
 * - Atenciones: cuadrado azul de 14 px (`color-info`) como `<button>` propio, accesible con teclado y lector de
 *   pantalla. Al pulsarlo se selecciona; la seleccionada lleva el anillo de foco.
 *   SUPUESTO (pendiente de confirmar): el mismo símbolo para los tres tipos de atención. La guía solo define
 *   «atención» y la simbología está pendiente (pendiente 7 de los mockups); el tipo se distingue en el panel de
 *   capas, en el resumen y en la lista.
 * - Sin elementos (A2) el mapa no se desmonta: se quitan los marcadores y se mantiene la vista.
 * - E1: si MapLibre no se puede crear (por ejemplo, sin WebGL) o falla antes de cargar, avisa con `onError`.
 * - Leyenda siempre visible en la esquina inferior derecha (la escala va abajo a la izquierda).
 */
// Excepción al sistema (AV-351): cada marca del mapa es un <button> posicionado sobre el lienzo; es un dato, no un botón de acción.
import { useEffect, useRef } from 'react'
import {
  Map as MapaMapLibre,
  Marker,
  NavigationControl,
  ScaleControl,
  type GeoJSONSource,
  type GeoJSONSourceSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  claveFilaMapa,
  limitesDeElementos,
  puntoRepresentativo,
  textoMarcador,
  usosDeElementos,
  type ElementoDibujable,
  type Limites,
  type UsoColoreado,
} from '@/utils/mapaAtenciones'
import estilos from './LienzoMapaAtenciones.module.css'

export interface LienzoMapaAtencionesProps {
  /** Elementos dibujables, ya filtrados por las casillas visibles. */
  elementos: ElementoDibujable[]
  /** Encuadre si no hay elementos al crear el mapa (los últimos límites conocidos en esta visita). */
  limitesIniciales: Limites
  /** Catálogo de tipos de uso de MOD-02 con su color: el relleno de cada espacio y la leyenda. */
  usos: UsoColoreado[]
  /** Clave de la fila seleccionada. */
  seleccion: string | null
  onSeleccionar: (clave: string) => void
  /** E1: el componente geográfico no se pudo cargar. */
  onError: () => void
}

const ID_FUENTE = 'atenciones-areas'

/**
 * Valor de un token de `tokens.css`. MapLibre pinta en WebGL y no entiende `var(--…)`: los colores se leen en
 * tiempo de ejecución para no escribir ninguno a mano.
 */
function leerToken(nombre: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim()
}

/**
 * Polígonos de los espacios como FeatureCollection, con la clave y el color de su tipo de uso (el del catálogo de
 * MOD-02, como en el mapa de áreas verdes); sin tipo de uso, el relleno de siempre (`--map-area-fill`).
 */
function coleccionAreas(elementos: ElementoDibujable[], usos: UsoColoreado[]): GeoJSONSourceSpecification['data'] {
  const colores = new Map(usos.map((u) => [u.id, u.color]))
  const porDefecto = leerToken('--map-area-fill')
  return {
    type: 'FeatureCollection',
    features: elementos
      .filter((e) => e.geometry.type !== 'Point')
      .map((e) => ({
        type: 'Feature',
        geometry: e.geometry,
        properties: {
          clave: claveFilaMapa(e.properties),
          color: (e.properties.tipo_uso_id !== null && colores.get(e.properties.tipo_uso_id)) || porDefecto,
        },
      })),
  }
}

export default function LienzoMapaAtenciones({
  elementos,
  limitesIniciales,
  usos,
  seleccion,
  onSeleccionar,
  onError,
}: LienzoMapaAtencionesProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaMapLibre | null>(null)
  const cargado = useRef(false)
  const marcadores = useRef<Marker[]>([])
  const botones = useRef<Map<string, HTMLButtonElement>>(new Map())

  // Últimos valores de las props para los manejadores de MapLibre (que se registran una sola vez).
  const ultimos = useRef({ elementos, limitesIniciales, usos, seleccion, onSeleccionar, onError })
  useEffect(() => {
    ultimos.current = { elementos, limitesIniciales, usos, seleccion, onSeleccionar, onError }
  })

  /** Quita los marcadores y crea uno por elemento. */
  function pintarMarcadores(instancia: MapaMapLibre) {
    for (const marcador of marcadores.current) marcador.remove()
    marcadores.current = []
    botones.current.clear()
    for (const elemento of ultimos.current.elementos) {
      const clave = claveFilaMapa(elemento.properties)
      const boton = document.createElement('button')
      boton.type = 'button'
      boton.className = estilos.marcador
      boton.setAttribute('aria-label', textoMarcador(elemento.properties))
      boton.setAttribute('aria-pressed', String(clave === ultimos.current.seleccion))
      boton.addEventListener('click', (evento) => {
        evento.stopPropagation()
        ultimos.current.onSeleccionar(clave)
      })
      botones.current.set(clave, boton)
      marcadores.current.push(
        new Marker({ element: boton }).setLngLat(puntoRepresentativo(elemento.geometry)).addTo(instancia),
      )
    }
  }

  /** Datos de los polígonos, marcadores y encuadre (al cargar y al cambiar los elementos). */
  function pintar(instancia: MapaMapLibre) {
    const actuales = ultimos.current.elementos
    instancia.getSource<GeoJSONSource>(ID_FUENTE)?.setData(coleccionAreas(actuales, ultimos.current.usos))
    pintarMarcadores(instancia)
    const limites = limitesDeElementos(actuales)
    // A2: sin elementos se mantiene la vista actual.
    if (limites) instancia.fitBounds(limites, { padding: 36, maxZoom: 18, duration: 0 })
  }

  // Creación (una vez).
  useEffect(() => {
    if (!contenedor.current) return
    let instancia: MapaMapLibre
    try {
      instancia = new MapaMapLibre({
        container: contenedor.current,
        style: {
          version: 8,
          sources: {
            openstreetmap: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [
            { id: 'fondo', type: 'background', paint: { 'background-color': leerToken('--color-bg-subtle') } },
            { id: 'calles-openstreetmap', type: 'raster', source: 'openstreetmap' },
          ],
        },
        bounds: limitesDeElementos(ultimos.current.elementos) ?? ultimos.current.limitesIniciales,
        fitBoundsOptions: { padding: 36, maxZoom: 18 },
        minZoom: 14,
        maxZoom: 20,
        attributionControl: { compact: false },
        cooperativeGestures: true,
      })
    } catch {
      ultimos.current.onError()
      return
    }
    mapa.current = instancia
    instancia.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    instancia.addControl(new ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left')

    instancia.on('error', () => {
      // Solo antes de cargar: después, un error de una tesela no impide usar el mapa.
      if (!cargado.current) ultimos.current.onError()
    })
    instancia.once('load', () => {
      cargado.current = true
      instancia.addSource(ID_FUENTE, { type: 'geojson', data: coleccionAreas([], []) })
      instancia.addLayer({
        id: `${ID_FUENTE}-relleno`,
        type: 'fill',
        source: ID_FUENTE,
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.6 },
      })
      instancia.addLayer({
        id: `${ID_FUENTE}-borde`,
        type: 'line',
        source: ID_FUENTE,
        paint: { 'line-color': leerToken('--map-area-line'), 'line-width': 2 },
      })
      pintar(instancia)
    })

    return () => {
      for (const marcador of marcadores.current) marcador.remove()
      marcadores.current = []
      cargado.current = false
      mapa.current = null
      instancia.remove()
    }
    // Se crea una sola vez: los cambios de props se aplican en los efectos de abajo.
  }, [])

  // Cambio de elementos o de colores: polígonos, marcadores y encuadre.
  useEffect(() => {
    if (mapa.current && cargado.current) pintar(mapa.current)
    // `pintar` lee las props desde `ultimos`.
  }, [elementos, usos])

  const usosVisibles = usosDeElementos(elementos, usos)

  // Cambio de selección: solo el estado de los botones.
  useEffect(() => {
    for (const [clave, boton] of botones.current) boton.setAttribute('aria-pressed', String(clave === seleccion))
  }, [seleccion])

  return (
    <div className={estilos.contenedor}>
      <div ref={contenedor} className={estilos.mapa} role="region" aria-label="Mapa de atenciones del periodo" />
      <div className={estilos.leyenda}>
        <p className={estilos.tituloLeyenda}>Leyenda</p>
        <ul className={estilos.listaLeyenda}>
          <li>
            <span className={estilos.simboloAtencion} aria-hidden="true" />
            Atención o actividad
          </li>
          {usosVisibles.length === 0 ? (
            <li>
              <span className={estilos.simboloEspacio} aria-hidden="true" />
              Espacio de la atención
            </li>
          ) : (
            usosVisibles.map((uso) => (
              <li key={uso.id}>
                <svg className={estilos.simboloUso} viewBox="0 0 16 16" aria-hidden="true">
                  <rect width="16" height="16" fill={uso.color} />
                </svg>
                {uso.nombre}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
