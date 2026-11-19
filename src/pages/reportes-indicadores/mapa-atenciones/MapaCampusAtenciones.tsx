/**
 * Mapa de atenciones sobre el mapa del campus de MOD-02 (RF-REP-007): el mismo plano y la misma clasificación por
 * tipo de uso que el mapa de áreas verdes. Lee los datos de MOD-02 por su servicio público (src/README.md, vía 3).
 *
 * - Todos los polígonos del campus; los de las áreas con atenciones del periodo, con el color de su tipo de uso, y el
 *   resto, atenuados.
 * - Los ejemplares con atenciones y coordenadas, como puntos.
 * - Al elegir un polígono o un punto, avisa a la página para que abra su ventana con las atenciones.
 * - Sin permiso para el inventario (403) o con error, lo dice y la lista de atenciones sigue disponible.
 */
import { useMemo } from 'react'
import { enriquecerGeoJSON, nombrePoligonoMapa, nombreUsoMapa } from '@/components/mapa/clasificacionMapa'
import MapaVectorialLocal from '@/components/mapa/MapaVectorialLocal'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import { useConsulta } from '@/hooks/useConsulta'
import { listarPoligonosMapa } from '@/services/api/mapaAsignaciones'
import { cargarAreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import {
  poligonosConAtenciones,
  puntosDeEjemplares,
  type ElementoDibujable,
  type FilaMapa,
  type UsoColoreado,
} from '@/utils/mapaAtenciones'

/** Lo que la página necesita de un polígono elegido para abrir su ventana. */
export interface AreaElegida {
  idFuente: string
  nombre: string
  tipoUso: string
  /** Superficie del polígono en m², si el plano la trae. */
  superficie: number | null
  /** Área de MOD-02 vinculada al polígono; null si el polígono no está vinculado a ninguna. */
  areaInventarioId: number | null
}

export interface MapaCampusAtencionesProps {
  /** Atenciones visibles (ya filtradas por las casillas de tipo). */
  filas: FilaMapa[]
  elementos: ElementoDibujable[]
  usos: UsoColoreado[]
  /** Polígono o ejemplar elegido, para marcarlo. */
  idFuenteElegido: string | null
  ejemplarElegido: number | null
  onElegirArea: (area: AreaElegida) => void
  onElegirEjemplar: (ejemplarId: number) => void
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : typeof valor === 'number' ? String(valor) : ''
}

export default function MapaCampusAtenciones({
  filas,
  elementos,
  usos,
  idFuenteElegido,
  ejemplarElegido,
  onElegirArea,
  onElegirEjemplar,
}: MapaCampusAtencionesProps) {
  // Mismas claves que el mapa de áreas verdes: si ya se cargó en esta visita, no se vuelve a pedir.
  const plano = useConsulta('mapa-areas-verdes', cargarAreasVerdesGeoJSON)
  const vinculos = useConsulta('mapa-poligonos', listarPoligonosMapa)

  const mapa = useMemo(
    () => (plano.datos && vinculos.datos ? enriquecerGeoJSON(plano.datos, vinculos.datos) : null),
    [plano.datos, vinculos.datos],
  )
  const resaltados = useMemo(() => poligonosConAtenciones(filas, vinculos.datos ?? []), [filas, vinculos.datos])
  const puntos = useMemo(() => puntosDeEjemplares(elementos), [elementos])
  const area = useMemo(
    () => new Map((vinculos.datos ?? []).map((v) => [v.id_fuente, v.area_verde_id])),
    [vinculos.datos],
  )
  const elegido = mapa?.features.find((f) => texto(f.properties.mapa_id) === idFuenteElegido)

  const error = plano.error ?? vinculos.error
  if (error) {
    if (error.estado === 403) {
      return (
        <AvisoEnLinea tono="info" titulo="Sin acceso al mapa del campus">
          Tu usuario no puede consultar el inventario de áreas verdes. Las atenciones están en la lista de abajo
        </AvisoEnLinea>
      )
    }
    return (
      <EstadoError
        titulo="No se pudo cargar el mapa del campus"
        descripcion={error.detalle}
        onReintentar={() => {
          if (plano.estado === 'error') plano.reintentar()
          if (vinculos.estado === 'error') vinculos.reintentar()
        }}
      />
    )
  }
  if (!mapa) return <EstadoCarga forma="tarjetas" texto="Cargando el mapa del campus…" />

  return (
    <MapaVectorialLocal
      datos={mapa}
      usos={usos}
      usoSeleccionado=""
      poligonosResaltados={resaltados}
      seleccionado={elegido}
      puntos={puntos}
      ejemplarId={ejemplarElegido}
      onEjemplar={onElegirEjemplar}
      onSeleccionar={(feature) => {
        const idFuente = texto(feature.properties.mapa_id)
        const superficie = Number(feature.properties['Área'])
        onElegirArea({
          idFuente,
          nombre: nombrePoligonoMapa(feature),
          tipoUso: nombreUsoMapa(feature),
          superficie: Number.isFinite(superficie) && superficie > 0 ? superficie : null,
          areaInventarioId: area.get(idFuente) ?? null,
        })
      }}
    />
  )
}
