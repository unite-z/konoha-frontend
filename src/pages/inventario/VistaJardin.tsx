import { useMemo, useState } from 'react'
import { nombreEjemplar } from '@/utils/nombreEjemplar'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import Selector from '@/components/ui/Selector'
import { useConsulta } from '@/hooks/useConsulta'
import { RUTAS_INVENTARIO } from '@/router/rutasApp'
import { listarEjemplaresDePoligono } from '@/services/api/mapaAsignaciones'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import type { AreaVerde } from '@/types/areasVerdes'
import type { PoligonoMapaAsignado } from '@/types/mapaInventario'
import { nombrePoligonoMapa, nombreUsoMapa } from '@/components/mapa/clasificacionMapa'
import MapaVectorialLocal, { type PuntoEjemplar } from '@/components/mapa/MapaVectorialLocal'
import { EditorVinculo } from './EditorVinculo'
import { formatearSuperficie, idPoligono, normalizar, type Poligono, type obtenerUsos } from './mapaAreasVerdesUtils'
import estilos from './MapaAreasVerdesPage.module.css'

export function VistaJardin({
  mapa,
  usos,
  uso,
  seleccionado,
  vinculo,
  onSeleccionar,
  areas,
  puedeEditar,
  alGuardar,
}: {
  mapa: AreasVerdesGeoJSON
  usos: ReturnType<typeof obtenerUsos>
  uso: string
  seleccionado: Poligono | undefined
  vinculo: PoligonoMapaAsignado | undefined
  onSeleccionar: (poligono: Poligono) => void
  areas: AreaVerde[]
  puedeEditar: boolean
  alGuardar: () => void
}) {
  const [mostrarEjemplares, setMostrarEjemplares] = useState(false)
  const [ejemplarId, setEjemplarId] = useState<number | null>(null)
  const [busquedaEjemplar, setBusquedaEjemplar] = useState('')
  const areaId = vinculo?.area_verde_id ?? null
  const poligonoId = seleccionado ? idPoligono(seleccionado) : ''
  const consulta = useConsulta(mostrarEjemplares && poligonoId ? 'ejemplares-mapa:' + poligonoId : null, (signal) =>
    listarEjemplaresDePoligono(poligonoId, signal),
  )
  const puntos = useMemo<
    (PuntoEjemplar & { nombre: string; nombreArea: string; avisoVinculo: string; nombreCientifico: string })[]
  >(() => {
    if (consulta.estado !== 'exito') return []
    return (consulta.datos ?? []).flatMap((ejemplar) => {
      const { latitud, longitud } = ejemplar
      if (
        latitud === null ||
        longitud === null ||
        !Number.isFinite(latitud) ||
        !Number.isFinite(longitud) ||
        Math.abs(latitud) > 90 ||
        Math.abs(longitud) > 180
      )
        return []
      return [
        {
          id: ejemplar.id,
          codigo: ejemplar.codigo,
          nombre: nombreEjemplar(ejemplar.codigo, ejemplar.alias),
          latitud,
          longitud,
          nombreArea:
            ejemplar.area_verde_nombre ?? areas.find((area) => area.id === ejemplar.area_verde_id)?.nombre ?? '',
          avisoVinculo:
            ejemplar.area_verde_id == null
              ? 'Sin área vinculada'
              : ejemplar.area_verde_id !== areaId
                ? 'Vinculado a otra área'
                : '',
          especie: ejemplar.especie_nombre_comun ?? ejemplar.especie_nombre_cientifico ?? 'Especie sin registrar',
          nombreCientifico: ejemplar.especie_nombre_cientifico ?? '',
        },
      ]
    })
  }, [consulta.datos, consulta.estado, areaId, areas])
  const terminoEjemplar = normalizar(busquedaEjemplar)
  const puntosVisibles = terminoEjemplar
    ? puntos.filter((punto) =>
        [punto.codigo, punto.especie, punto.nombreCientifico].some((dato) =>
          normalizar(dato).includes(terminoEjemplar),
        ),
      )
    : puntos
  const ejemplar =
    puntosVisibles.length === 1 ? puntosVisibles[0] : puntosVisibles.find((punto) => punto.id === ejemplarId)

  return (
    <div className={estilos.columnaMapa}>
      <section className={estilos.panelMapa} aria-label="Mapa interactivo de áreas verdes del campus">
        <MapaVectorialLocal
          datos={mapa}
          usos={usos}
          usoSeleccionado={uso}
          seleccionado={seleccionado}
          onSeleccionar={onSeleccionar}
          puntos={puntosVisibles}
          ejemplarId={ejemplar?.id}
          onEjemplar={setEjemplarId}
        />
      </section>
      {seleccionado && (
        <div className={estilos.panelDetalle}>
          <section className={estilos.edicion} aria-label="Detalle del área seleccionada">
            <h2>{nombrePoligonoMapa(seleccionado)}</h2>
            <p>Tipo de uso · {nombreUsoMapa(seleccionado)}</p>
            <p>
              Origen del tipo de uso ·{' '}
              {seleccionado.properties.origen_clasificacion === 'area-vinculada'
                ? 'Ficha del inventario'
                : 'Mapa original'}
            </p>
            <p>Superficie cartográfica · {formatearSuperficie(seleccionado.properties['Área'])}</p>
            {areaId !== null && (
              <>
                <p>Superficie registrada · {formatearSuperficie(vinculo?.superficie_registrada_m2)}</p>
                <BotonEnlace
                  className={estilos.volver}
                  variante="enlace"
                  to={`${RUTAS_INVENTARIO.areasVerdes}?${new URLSearchParams({ q: vinculo?.area_verde_nombre ?? '' })}`}
                >
                  Ver área en el inventario
                </BotonEnlace>
              </>
            )}
            {puedeEditar && (
              <EditorVinculo
                seleccionado={seleccionado}
                vinculo={vinculo}
                areas={areas}
                alGuardar={() => {
                  alGuardar()
                  if (mostrarEjemplares) consulta.reintentar()
                }}
              />
            )}
          </section>
          <section className={estilos.edicion} aria-label="Ejemplares en el área seleccionada">
            <div className={estilos.cabeceraDetalle}>
              <h2>Ejemplares</h2>
              <Boton
                variante="secundario"
                compacto
                aria-pressed={mostrarEjemplares}
                onClick={() => {
                  setEjemplarId(null)
                  setBusquedaEjemplar('')
                  setMostrarEjemplares(!mostrarEjemplares)
                }}
              >
                {mostrarEjemplares ? 'Ocultar ejemplares' : 'Mostrar ejemplares'}
              </Boton>
            </div>
            {consulta.estado === 'cargando' && <EstadoCarga forma="tabla" texto="Cargando ejemplares…" />}
            {consulta.error?.estado === 403 ? (
              <EstadoSinAcceso />
            ) : (
              consulta.estado === 'error' && (
                <EstadoError
                  titulo="No pudimos cargar los ejemplares"
                  descripcion={consulta.error?.detalle ?? ''}
                  onReintentar={consulta.reintentar}
                />
              )
            )}
            {puntos.length > 1 && (
              <CampoFormulario
                id="buscar-ejemplar-mapa"
                etiqueta="Buscar ejemplares en esta área"
                type="search"
                value={busquedaEjemplar}
                placeholder="Código, nombre común o científico"
                onChange={(evento) => setBusquedaEjemplar(evento.target.value)}
              />
            )}
            {terminoEjemplar && puntos.length > 1 && (
              <p role="status">
                {puntosVisibles.length === 0
                  ? 'No hay ejemplares que coincidan con la búsqueda.'
                  : puntosVisibles.length === 1
                    ? '1 ejemplar encontrado'
                    : puntosVisibles.length + ' ejemplares encontrados'}
              </p>
            )}
            {puntosVisibles.length > 1 && (
              <Selector
                id="ejemplar-mapa"
                etiqueta="Ejemplares con coordenadas"
                valor={ejemplar ? String(ejemplar.id) : ''}
                opcionTodos="Selecciona un ejemplar"
                onCambiar={(valor) => setEjemplarId(valor ? Number(valor) : null)}
                opciones={puntosVisibles.map((punto) => ({
                  valor: String(punto.id),
                  texto: punto.nombre + ' · ' + punto.especie,
                }))}
              />
            )}
            {consulta.estado === 'exito' && !puntos.length && (
              <p role="status">No hay ejemplares con coordenadas dentro de esta área del mapa.</p>
            )}
            {ejemplar && (
              <div className={estilos.detalleEjemplar}>
                <strong>
                  {ejemplar.nombre} · {ejemplar.especie}
                </strong>
                <p>{ejemplar.nombreArea || ejemplar.avisoVinculo || 'Área vinculada'}</p>
                {ejemplar.nombreArea && ejemplar.avisoVinculo && <p>{ejemplar.avisoVinculo}</p>}
                <BotonEnlace
                  variante="secundario"
                  compacto
                  to={`${RUTAS_INVENTARIO.ejemplares}?${new URLSearchParams({ ejemplar: ejemplar.codigo })}`}
                >
                  Abrir ficha
                </BotonEnlace>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
