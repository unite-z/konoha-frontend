// Excepción al sistema (AV-351): barra de herramientas del lienzo SVG del mapa (seleccionar, mover y zoom), como los controles de maplibre; no son acciones de página.
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { Feature, MultiPolygon } from 'geojson'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import { nombrePoligonoMapa, nombreUsoMapa } from './clasificacionMapa'
import estilos from './MapaAreasVerdesPage.module.css'

type FeatureArea = Feature<MultiPolygon, Record<string, number | string | null>>
type UsoMapaLocal = { nombre: string; color: string }

export interface PuntoEjemplar {
  id: number
  codigo: string
  especie: string
  latitud: number
  longitud: number
}

interface Props {
  datos: AreasVerdesGeoJSON
  usos: UsoMapaLocal[]
  usoSeleccionado: string
  onSeleccionar?: (feature: FeatureArea) => void
  seleccionado?: FeatureArea
  poligonosBloqueados?: ReadonlySet<string>
  puntos?: PuntoEjemplar[]
  ejemplarId?: number | null
  onEjemplar?: (id: number) => void
  onElegirPunto?: (latitud: number, longitud: number) => void
}

interface Limites {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface Hover {
  x: number
  y: number
  feature: FeatureArea
}

const VISTA_GENERAL = { x: 500, y: 350, zoom: 1 }

export default function MapaVectorialLocal({
  datos, usos, usoSeleccionado, onSeleccionar, seleccionado, poligonosBloqueados,
  puntos = [], ejemplarId, onEjemplar, onElegirPunto,
}: Props) {
  const limites = useMemo(() => obtenerLimites(datos.features), [datos.features])
  const svgRef = useRef<SVGSVGElement>(null)
  const [vista, setVista] = useState(() => enfocar(seleccionado, limites))
  const [modo, setModo] = useState<'seleccionar' | 'mover'>('seleccionar')
  const [arrastre, setArrastre] = useState<{ x: number; y: number; centroX: number; centroY: number } | null>(null)
  const [hover, setHover] = useState<Hover | null>(null)
  const trazos = useMemo(() => datos.features.map((feature) => ({
    feature,
    uso: nombreUsoMapa(feature),
    trazo: ruta(feature.geometry, limites),
  })), [datos.features, limites])
  const visibles = trazos.filter(({ uso }) => !usoSeleccionado || uso === usoSeleccionado)
  const colores = new Map(usos.map((uso) => [uso.nombre, uso.color]))
  const viewWidth = 1000 / vista.zoom
  const viewHeight = 700 / vista.zoom

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    function acercarConRueda(evento: WheelEvent) {
      if ((!evento.ctrlKey && !evento.metaKey) || evento.deltaY === 0) return
      const rect = svg?.getBoundingClientRect()
      if (!rect?.width || !rect.height) return
      evento.preventDefault()

      const escala = Math.min(rect.width / 1000, rect.height / 700)
      const x = limitar((evento.clientX - rect.left - rect.width / 2) / escala, -500, 500)
      const y = limitar((evento.clientY - rect.top - rect.height / 2) / escala, -350, 350)
      const unidad = evento.deltaMode === 1 ? 16 : evento.deltaMode === 2 ? rect.height : 1
      const delta = limitar(evento.deltaY * unidad, -160, 160)
      setVista((actual) => {
        const zoom = limitar(actual.zoom * Math.exp(-delta / 500), 1, 8)
        const desplazamiento = 1 / actual.zoom - 1 / zoom
        return ajustarVista(actual.x + x * desplazamiento, actual.y + y * desplazamiento, zoom)
      })
    }

    svg.addEventListener('wheel', acercarConRueda, { passive: false })
    return () => svg.removeEventListener('wheel', acercarConRueda)
  }, [])

  const ejemplar = puntos.find((punto) => punto.id === ejemplarId)
  const latitudEnfocada = ejemplar?.latitud
  const longitudEnfocada = ejemplar?.longitud
  useEffect(() => {
    if (latitudEnfocada === undefined || longitudEnfocada === undefined) return
    const [x, y] = proyectar(longitudEnfocada, latitudEnfocada, limites)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    const cuadro = requestAnimationFrame(() => {
      setVista((actual) => ajustarVista(x, y, Math.max(3, actual.zoom)))
    })
    return () => cancelAnimationFrame(cuadro)
  }, [ejemplarId, latitudEnfocada, longitudEnfocada, limites])

  function cambiarZoom(factor: number) {
    setVista((actual) => ajustarVista(actual.x, actual.y, limitar(actual.zoom * factor, 1, 8)))
  }

  function posicionar(evento: MouseEvent<SVGPathElement>, feature: FeatureArea) {
    const rect = evento.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect()
    if (!rect) return
    setHover({ x: evento.clientX - rect.left + 12, y: evento.clientY - rect.top + 12, feature })
  }

  return (
    <div className={estilos.mapaLocal}>
      <svg
        ref={svgRef}
        className={`${estilos.mapaLocalSvg} ${modo === 'mover' ? estilos.modoMover : estilos.modoSeleccionar}`}
        viewBox={`${vista.x - viewWidth / 2} ${vista.y - viewHeight / 2} ${viewWidth} ${viewHeight}`}
        role="img"
        aria-label={`${visibles.length} polígonos visibles`}
        onClick={(evento) => {
          if (modo !== 'seleccionar' || !onElegirPunto) return
          const svg = evento.currentTarget
          const matriz = svg.getScreenCTM()
          if (!matriz) return
          const punto = svg.createSVGPoint()
          punto.x = evento.clientX
          punto.y = evento.clientY
          const { x, y } = punto.matrixTransform(matriz.inverse())
          if (x < vista.x - viewWidth / 2 || x > vista.x + viewWidth / 2
            || y < vista.y - viewHeight / 2 || y > vista.y + viewHeight / 2) return
          const escala = calcularEscala(limites)
          const [origenX, origenY] = proyectar(limites.minX, limites.maxY, limites)
          onElegirPunto(limites.maxY - (y - origenY) / escala, limites.minX + (x - origenX) / escala)
        }}
        onMouseLeave={() => setHover(null)}
        onPointerDown={(evento) => {
          if (modo !== 'mover' || evento.button !== 0) return
          evento.preventDefault()
          evento.currentTarget.setPointerCapture(evento.pointerId)
          setHover(null)
          setArrastre({ x: evento.clientX, y: evento.clientY, centroX: vista.x, centroY: vista.y })
        }}
        onPointerMove={(evento) => {
          if (!arrastre) return
          const rect = evento.currentTarget.getBoundingClientRect()
          const escala = Math.min(rect.width / viewWidth, rect.height / viewHeight)
          setVista(ajustarVista(
            arrastre.centroX - (evento.clientX - arrastre.x) / escala,
            arrastre.centroY - (evento.clientY - arrastre.y) / escala,
            vista.zoom,
          ))
        }}
        onLostPointerCapture={() => setArrastre(null)}
        onPointerCancel={() => setArrastre(null)}
      >
        <rect x="0" y="0" width="1000" height="700" fill="var(--color-bg-surface)" />
        <image
          href={`${import.meta.env.BASE_URL}datos/fondo-mapa-campus.svg`}
          x="0"
          y="0"
          width="1000"
          height="700"
          opacity="0.28"
          preserveAspectRatio="none"
          pointerEvents="none"
          aria-hidden="true"
        />
        <g className={estilos.fondoMapaLocal} aria-hidden="true">
          <text x="38" y="52">Campus PUCP · vista esquemática</text>
          <text x="940" y="56">N</text>
          <path d="M944 68 L944 104 M944 68 L937 80 M944 68 L951 80" />
          <rect x="38" y="640" width="100" height="7" />
          <text x="38" y="632">Escala relativa</text>
        </g>
        {visibles.map(({ feature, uso, trazo }, indice) => {
          const bloqueado = poligonosBloqueados?.has(texto(feature.properties.mapa_id)) ?? false
          const color = poligonosBloqueados
            ? bloqueado ? 'var(--color-text-secondary)' : 'var(--color-action-primary)'
            : colores.get(uso) ?? 'var(--color-text-secondary)'
          const activo = hover?.feature === feature || seleccionado === feature
          return (
            <path
              key={`${texto(feature.properties?.mapa_id)}-${indice}`}
              className={estilos.poligonoLocal}
              data-bloqueado={bloqueado || undefined}
              d={trazo}
              fill={color}
              fillRule="evenodd"
              fillOpacity={bloqueado ? 0.18 : activo ? 0.95 : 0.58}
              stroke={activo ? 'var(--map-selected-stroke)' : color}
              strokeWidth={activo ? 2.5 : 1}
              onMouseEnter={(evento) => posicionar(evento, feature)}
              onMouseMove={(evento) => posicionar(evento, feature)}
              onClick={() => { if (modo === 'seleccionar' && !bloqueado) onSeleccionar?.(feature) }}
            >
              {poligonosBloqueados && (
                <title>{nombrePoligonoMapa(feature)} · {bloqueado ? 'Ya vinculado' : 'Disponible'}</title>
              )}
            </path>
          )
        })}
        {seleccionado && <path className={estilos.contornoSeleccionado} d={ruta(seleccionado.geometry, limites)} />}
        {puntos.map((punto) => {
          const [x, y] = proyectar(punto.longitud, punto.latitud, limites)
          return <circle key={punto.id} cx={x} cy={y} r={(punto.id === ejemplarId ? 8 : 5) / vista.zoom}
            className={estilos.puntoEjemplar} data-seleccionado={punto.id === ejemplarId}
            onClick={() => { if (modo === 'seleccionar') onEjemplar?.(punto.id) }}>
            <title>{punto.codigo} · {punto.especie}</title>
          </circle>
        })}
      </svg>
      <div className={estilos.controlesMapaLocal}>
        <button type="button" aria-pressed={modo === 'seleccionar'} onClick={() => setModo('seleccionar')} title={onElegirPunto ? 'Elegir ubicación' : 'Seleccionar áreas'}>↖</button>
        <button type="button" aria-pressed={modo === 'mover'} onClick={() => setModo('mover')} title="Mover el mapa">✋</button>
        <button type="button" aria-label="Acercar" onClick={() => cambiarZoom(1.4)}>+</button>
        <button type="button" aria-label="Alejar" onClick={() => cambiarZoom(1 / 1.4)}>−</button>
        <button type="button" aria-label="Restablecer vista general" onClick={() => setVista(VISTA_GENERAL)}>⌂</button>
      </div>
      <p className={estilos.instruccionZoom}>Ctrl o ⌘ + rueda para cambiar el zoom</p>
      {hover && (
        <div className={estilos.tooltipMapa} role="status" style={{ left: hover.x, top: hover.y }}> {/* estilo-calculado: posición del mapa */}
          <strong>{nombrePoligonoMapa(hover.feature)}</strong>
          <span>Tipo de uso: {texto(hover.feature.properties?.clasificacion_efectiva) || 'Sin clasificar'}</span>
          <span>Superficie: {formatearSuperficie(hover.feature.properties?.['Área'])}</span>
        </div>
      )}
    </div>
  )
}

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.max(minimo, Math.min(maximo, valor))
}

function ajustarVista(x: number, y: number, zoom: number) {
  return { x: limitar(x, 500 / zoom, 1000 - 500 / zoom), y: limitar(y, 350 / zoom, 700 - 350 / zoom), zoom }
}

function enfocar(seleccionado: FeatureArea | undefined, limites: Limites) {
  if (!seleccionado) return VISTA_GENERAL
  const { minX, minY, maxX, maxY } = obtenerLimites([seleccionado])
  if (!Number.isFinite(minX)) return VISTA_GENERAL
  const [izquierda, arriba] = proyectar(minX, maxY, limites)
  const [derecha, abajo] = proyectar(maxX, minY, limites)
  const zoom = limitar(Math.min(700 / (derecha - izquierda), 490 / (abajo - arriba)), 1, 8)
  return ajustarVista((izquierda + derecha) / 2, (arriba + abajo) / 2, zoom)
}

function obtenerLimites(features: FeatureArea[]): Limites {
  const limites: Limites = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const feature of features) recorrer(feature.geometry.coordinates, limites)
  return limites
}

function recorrer(coordenadas: unknown, limites: Limites) {
  if (!Array.isArray(coordenadas)) return
  if (typeof coordenadas[0] === 'number' && typeof coordenadas[1] === 'number') {
    limites.minX = Math.min(limites.minX, Number(coordenadas[0]))
    limites.maxX = Math.max(limites.maxX, Number(coordenadas[0]))
    limites.minY = Math.min(limites.minY, Number(coordenadas[1]))
    limites.maxY = Math.max(limites.maxY, Number(coordenadas[1]))
    return
  }
  coordenadas.forEach((coordenada) => recorrer(coordenada, limites))
}

function calcularEscala(limites: Limites) {
  return Math.min(940 / (limites.maxX - limites.minX), 640 / (limites.maxY - limites.minY))
}

function proyectar(longitud: number, latitud: number, limites: Limites) {
  const escala = calcularEscala(limites)
  const offsetX = (1000 - (limites.maxX - limites.minX) * escala) / 2
  const offsetY = (700 - (limites.maxY - limites.minY) * escala) / 2
  return [offsetX + (longitud - limites.minX) * escala, offsetY + (limites.maxY - latitud) * escala]
}

function ruta(geometria: MultiPolygon, limites: Limites) {
  return geometria.coordinates.flatMap((poligono) => poligono.map((anillo) => {
    const puntos = anillo.map(([longitud, latitud]) => proyectar(longitud, latitud, limites))
    return puntos.length ? `M${puntos[0][0].toFixed(2)},${puntos[0][1].toFixed(2)} ${puntos.slice(1).map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}Z` : ''
  })).join(' ')
}

function texto(valor: unknown) {
  return typeof valor === 'string' ? valor.trim() : typeof valor === 'number' ? String(valor) : ''
}

function formatearSuperficie(valor: unknown) {
  if (valor == null || valor === '') return 'No disponible'
  const numero = Number(valor)
  return Number.isFinite(numero) ? `${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(numero)} m²` : 'No disponible'
}
