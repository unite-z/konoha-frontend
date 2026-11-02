import { useMemo, useState, type MouseEvent, type WheelEvent } from 'react'
import type { Feature, MultiPolygon } from 'geojson'
import type { UsoFuenteMapa } from '../../types/mod02'
import type { AreasVerdesGeoJSON } from '../../services/api/mapaInventario'
import estilos from './MapaAreasVerdesPage.module.css'

type FeatureArea = Feature<MultiPolygon, Record<string, number | string | null>>
type UsoMapaLocal = { nombre: string; color: string; tipoUsoId: number | null }

interface Props {
  datos: AreasVerdesGeoJSON
  usos: UsoMapaLocal[]
  categorias: UsoFuenteMapa[]
  usoSeleccionado: string
  tipoUsoSeleccionado: string
  onSeleccionar: (feature: FeatureArea) => void
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

export default function MapaVectorialLocal({ datos, usos, categorias, usoSeleccionado, tipoUsoSeleccionado, onSeleccionar }: Props) {
  const [zoom, setZoom] = useState(1)
  const [modo, setModo] = useState<'seleccionar' | 'mover'>('seleccionar')
  const [centro, setCentro] = useState({ x: 500, y: 350 })
  const [arrastre, setArrastre] = useState<{ x: number; y: number; centroX: number; centroY: number } | null>(null)
  const [hover, setHover] = useState<Hover | null>(null)
  const limites = useMemo(() => obtenerLimites(datos.features), [datos.features])
  const visibles = datos.features.filter((feature) => {
    const uso = usos.find((item) => item.nombre === texto(feature.properties?.Uso))
    return uso ? usoVisible(uso, usoSeleccionado, tipoUsoSeleccionado) : false
  })
  const viewWidth = 1000 / zoom
  const viewHeight = 700 / zoom

  function posicionar(evento: MouseEvent<SVGPathElement>, feature: FeatureArea) {
    const rect = evento.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect()
    if (!rect) return
    setHover({ x: evento.clientX - rect.left + 12, y: evento.clientY - rect.top + 12, feature })
  }

  return (
    <div className={estilos.mapaLocal}>
      <svg
        className={`${estilos.mapaLocalSvg} ${modo === 'mover' ? estilos.modoMover : estilos.modoSeleccionar}`}
        viewBox={`${centro.x - viewWidth / 2} ${centro.y - viewHeight / 2} ${viewWidth} ${viewHeight}`}
        role="img"
        aria-label={`${visibles.length} polígonos visibles`}
        onMouseLeave={() => setHover(null)}
        onMouseDown={(evento) => {
          if (modo !== 'mover') return
          evento.preventDefault()
          setHover(null)
          setArrastre({ x: evento.clientX, y: evento.clientY, centroX: centro.x, centroY: centro.y })
        }}
        onMouseMove={(evento) => {
          if (!arrastre) return
          const rect = evento.currentTarget.getBoundingClientRect()
          const deltaX = (evento.clientX - arrastre.x) / rect.width * viewWidth
          const deltaY = (evento.clientY - arrastre.y) / rect.height * viewHeight
          setCentro({
            x: limitar(arrastre.centroX - deltaX, viewWidth / 2, 1000 - viewWidth / 2),
            y: limitar(arrastre.centroY - deltaY, viewHeight / 2, 700 - viewHeight / 2),
          })
        }}
        onMouseUp={() => setArrastre(null)}
        onWheel={(evento: WheelEvent<SVGSVGElement>) => {
          evento.preventDefault()
          setZoom((actual) => Math.max(1, Math.min(8, actual * (evento.deltaY < 0 ? 1.25 : 0.8))))
        }}
      >
        <rect x="0" y="0" width="1000" height="700" fill="var(--color-bg-surface)" />
        <image
          href="/datos/fondo-mapa-campus.svg"
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
          {Array.from({ length: 11 }, (_, indice) => <line key={`v-${indice}`} x1={indice * 100} y1="0" x2={indice * 100} y2="700" />)}
          {Array.from({ length: 8 }, (_, indice) => <line key={`h-${indice}`} x1="0" y1={indice * 100} x2="1000" y2={indice * 100} />)}
          <rect x="18" y="18" width="964" height="664" rx="8" />
          <text x="38" y="52">Campus PUCP · vista esquemática</text>
          <text x="940" y="56">N</text>
          <path d="M944 68 L944 104 M944 68 L937 80 M944 68 L951 80" />
          <rect x="38" y="640" width="100" height="7" />
          <text x="38" y="632">Escala relativa</text>
        </g>
        {visibles.map((feature, indice) => {
          const uso = usos.find((item) => item.nombre === texto(feature.properties?.Uso))
          if (!uso) return null
          const activo = hover?.feature === feature
          return (
            <path
              key={`${texto(feature.properties?.mapa_id)}-${indice}`}
              className={estilos.poligonoLocal}
              d={ruta(feature.geometry, limites)}
              fill={uso.color}
              fillOpacity={activo ? 1 : 0.78}
              stroke={activo ? 'var(--neutral-950)' : uso.color}
              strokeWidth={activo ? 3 : 1.3}
              onMouseEnter={(evento) => posicionar(evento, feature)}
              onMouseMove={(evento) => posicionar(evento, feature)}
              onClick={() => { if (modo === 'seleccionar') onSeleccionar(feature) }}
            />
          )
        })}
      </svg>
      <div className={estilos.controlesMapaLocal}>
        <button type="button" aria-pressed={modo === 'seleccionar'} onClick={() => setModo('seleccionar')} title="Seleccionar áreas">↖</button>
        <button type="button" aria-pressed={modo === 'mover'} onClick={() => setModo('mover')} title="Mover el mapa">✋</button>
        <button type="button" aria-label="Acercar" onClick={() => setZoom((actual) => Math.min(actual * 1.4, 8))}>+</button>
        <button type="button" aria-label="Alejar" onClick={() => setZoom((actual) => Math.max(actual / 1.4, 1))}>−</button>
        <button type="button" aria-label="Restablecer zoom" onClick={() => setZoom(1)}>⌂</button>
      </div>
      {hover && (
        <div className={estilos.tooltipMapa} role="status" style={{ left: hover.x, top: hover.y }}> {/* estilo-calculado: posición del mapa */}
          <strong>{texto(hover.feature.properties?.Nombre) || 'Área verde del campus'}</strong>
          <span>Uso: {texto(hover.feature.properties?.Uso) || 'Sin uso'}</span>
          {categorias.find((categoria) => categoria.uso_fuente === texto(hover.feature.properties?.Uso))?.tipo_uso_nombre && (
            <span>Tipo del sistema: {categorias.find((categoria) => categoria.uso_fuente === texto(hover.feature.properties?.Uso))?.tipo_uso_nombre}</span>
          )}
          <span>Superficie: {formatearSuperficie(hover.feature.properties?.['Área'])}</span>
        </div>
      )}
    </div>
  )
}

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.max(minimo, Math.min(maximo, valor))
}

function usoVisible(uso: UsoMapaLocal, filtroFuente: string, filtroTipo: string) {
  return (!filtroFuente || uso.nombre === filtroFuente) && (!filtroTipo || String(uso.tipoUsoId ?? '') === filtroTipo)
}

function obtenerLimites(features: FeatureArea[]): Limites {
  const limites: Limites = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const feature of features) recorrer(feature.geometry.coordinates, limites)
  return limites
}

function recorrer(coordenadas: unknown, limites: Limites, puntos?: number[][]) {
  if (!Array.isArray(coordenadas)) return
  if (typeof coordenadas[0] === 'number' && typeof coordenadas[1] === 'number') {
    limites.minX = Math.min(limites.minX, Number(coordenadas[0]))
    limites.maxX = Math.max(limites.maxX, Number(coordenadas[0]))
    limites.minY = Math.min(limites.minY, Number(coordenadas[1]))
    limites.maxY = Math.max(limites.maxY, Number(coordenadas[1]))
    puntos?.push([Number(coordenadas[0]), Number(coordenadas[1])])
    return
  }
  coordenadas.forEach((coordenada) => recorrer(coordenada, limites, puntos))
}

function calcularEscala(limites: Limites) {
  return Math.min(940 / (limites.maxX - limites.minX), 640 / (limites.maxY - limites.minY))
}

function ruta(geometria: MultiPolygon, limites: Limites) {
  const escala = calcularEscala(limites)
  const offsetX = (1000 - (limites.maxX - limites.minX) * escala) / 2
  const offsetY = (700 - (limites.maxY - limites.minY) * escala) / 2
  const proyectar = ([x, y]: number[]) => [offsetX + (x - limites.minX) * escala, offsetY + (limites.maxY - y) * escala]
  return geometria.coordinates.flatMap((poligono) => poligono.map((anillo) => {
    const puntos = anillo.map((punto) => proyectar(punto))
    return puntos.length ? `M${puntos[0][0].toFixed(2)},${puntos[0][1].toFixed(2)} ${puntos.slice(1).map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}Z` : ''
  })).join(' ')
}

function texto(valor: unknown) {
  return typeof valor === 'string' ? valor.trim() : typeof valor === 'number' ? String(valor) : ''
}

function formatearSuperficie(valor: unknown) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? `${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(numero)} m²` : 'No disponible'
}
