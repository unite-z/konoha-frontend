import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import { useConsulta } from '@/hooks/useConsulta'
import { listarPoligonosMapa } from '@/services/api/mapaAsignaciones'
import { cargarAreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import MapaVectorialLocal from './MapaVectorialLocal'
import estilos from './MapaAreasVerdesPage.module.css'

export default function SelectorPuntoMapa({ areaId, latitud, longitud, puntoActual, compacto = false, onElegir }: {
  areaId: number | null
  latitud: string
  longitud: string
  puntoActual?: { latitud: number; longitud: number }
  compacto?: boolean
  onElegir: (latitud: number, longitud: number) => void
}) {
  const mapa = useConsulta('seleccionar-punto-mapa', cargarAreasVerdesGeoJSON)
  const vinculos = useConsulta(areaId === null ? null : 'seleccionar-punto-vinculos', listarPoligonosMapa)
  if (mapa.estado === 'error') {
    return <EstadoError titulo="No pudimos cargar el mapa" descripcion={mapa.error?.detalle ?? ''} onReintentar={mapa.reintentar} nivel={3} />
  }
  if (!mapa.datos) return <EstadoCarga forma="tabla" texto="Cargando mapa del campus…" />

  const poligonos = new Set(vinculos.datos?.filter((vinculo) => vinculo.area_verde_id === areaId).map((vinculo) => vinculo.id_fuente))
  const seleccionado = mapa.datos.features.find((poligono) => poligonos.has(String(poligono.properties.mapa_id)))
  const puntoNuevo = latitud && longitud && Number.isFinite(Number(latitud)) && Number.isFinite(Number(longitud))
    ? [{ id: 0, codigo: puntoActual ? 'Punto nuevo' : 'Ubicación elegida', especie: '', latitud: Number(latitud), longitud: Number(longitud) }]
    : []
  const puntos = puntoActual
    ? [{ id: -1, codigo: 'Punto actual', especie: '', ...puntoActual }, ...puntoNuevo]
    : puntoNuevo

  return (
    <section aria-label="Elegir ubicación del ejemplar">
      <p>Toca el mapa para marcar la ubicación. Puedes acercar la vista con los controles.</p>
      <div className={compacto ? `${estilos.panelMapa} ${estilos.panelMapaCompacto}` : estilos.panelMapa}>
        <MapaVectorialLocal key={String(seleccionado?.properties.mapa_id ?? '')}
          datos={mapa.datos} usos={[]} usoSeleccionado="" seleccionado={seleccionado}
          puntos={puntos} ejemplarId={0} onElegirPunto={onElegir} />
      </div>
    </section>
  )
}
