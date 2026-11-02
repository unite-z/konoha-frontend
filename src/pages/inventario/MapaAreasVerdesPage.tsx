import { useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapaMapLibre, NavigationControl, Popup, ScaleControl, type FilterSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { BotonEnlace } from '../../components/ui/Boton'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import { useConsulta } from '../../hooks/useConsulta'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO } from '../../router/rutasApp'
import {
  asignarPoligonoMapa,
  clasificarUsoFuenteMapa,
  listarPoligonosMapa,
  listarTodasLasAreasVerdes,
  listarTiposUso,
  listarUsosFuenteMapa,
} from '../../services/api/inventario'
import { cargarAreasVerdesGeoJSON, type AreasVerdesGeoJSON } from '../../services/api/mapaInventario'
import { useSesionActiva } from '../../sesion/ContextoSesion'
import { PERMISOS, puede } from '../../config/permisosCore'
import type { UsoFuenteMapa } from '../../types/mod02'
import estilos from './MapaAreasVerdesPage.module.css'
import MapaVectorialLocal from './MapaVectorialLocal'

const ID_CAPA = 'areas-verdes-poligonos'
const ID_FUENTE = 'areas-verdes-campus'
const COLORES_MAPA = ['--map-uso-1', '--map-uso-2', '--map-uso-3', '--map-uso-4', '--map-uso-5', '--map-uso-6']

interface UsoMapa {
  nombre: string
  cantidad: number
  color: string
  tipoUsoId: number | null
}

interface LimitesMapa {
  oeste: number
  sur: number
  este: number
  norte: number
}

interface PoligonoSeleccionado {
  idFuente: string
  usoFuente: string
  nombre: string
  tipoUsoId: number | null
  areaVerdeId: number | null
}

interface HoverMapa {
  x: number
  y: number
  nombre: string
  usoOriginal: string
  tipoSistema: string
}

export default function MapaAreasVerdesPage() {
  usePaginaActual('Mapa del campus', [MIGAS_INVENTARIO.areasVerdes, MIGAS_INVENTARIO.mapa])
  const sesion = useSesionActiva()
  const contenedorMapa = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<MapaMapLibre | null>(null)
  const usoSeleccionadoRef = useRef('')
  const tipoUsoSeleccionadoRef = useRef('')
  const mapa = useConsulta('mapa-areas-verdes', cargarAreasVerdesGeoJSON)
  const categorias = useConsulta('mapa-usos-fuente', listarUsosFuenteMapa)
  const asignaciones = useConsulta('mapa-poligonos', listarPoligonosMapa)
  const tiposUso = useConsulta('mapa-tipos-uso', (signal) => listarTiposUso(false, signal))
  const areas = useConsulta('mapa-inventario-areas', listarTodasLasAreasVerdes)
  const [usoSeleccionado, setUsoSeleccionado] = useState('')
  const [tipoUsoSeleccionado] = useState('')
  const [seleccion, setSeleccion] = useState<PoligonoSeleccionado | null>(null)
  const [, setHoverMapa] = useState<HoverMapa | null>(null)
  const [guardando, setGuardando] = useState<'uso' | 'area' | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [mensajeAccion, setMensajeAccion] = useState<string | null>(null)
  const puedeEditar = puede(sesion, PERMISOS.gestionarCatalogos)

  const consultaConError = [mapa, categorias, asignaciones, tiposUso, areas].find((consulta) => consulta.estado === 'error' && !consulta.datos)
  const consultaPendiente = [mapa, categorias, asignaciones, tiposUso, areas].some((consulta) => !consulta.datos)

  const poligonosPorId = useMemo(() => new Map((asignaciones.datos ?? []).map((asignacion) => [asignacion.id_fuente, asignacion])), [asignaciones.datos])
  const usos = useMemo(
    () => mapa.datos && categorias.datos ? obtenerUsos(mapa.datos, categorias.datos) : [],
    [mapa.datos, categorias.datos],
  )

  useEffect(() => {
    if (!contenedorMapa.current || !mapa.datos) return
    const limites = obtenerLimites(mapa.datos)
    if (!limites) return
    const colorFondo = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg-surface')
      .trim()

    const instancia = new MapaMapLibre({
      container: contenedorMapa.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          { id: 'fondo-campus', type: 'background', paint: { 'background-color': colorFondo } },
        ],
      },
      center: [(limites.oeste + limites.este) / 2, (limites.sur + limites.norte) / 2],
      zoom: 16,
      minZoom: 14,
      maxZoom: 19,
      maxBounds: [
        [limites.oeste - 0.006, limites.sur - 0.006],
        [limites.este + 0.006, limites.norte + 0.006],
      ],
      attributionControl: false,
      cooperativeGestures: true,
    })
    mapaRef.current = instancia
    instancia.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    instancia.addControl(new ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left')
    const capasPorUso = usos.map((_, indice) => `${ID_CAPA}-${indice}`)

    instancia.once('load', () => {
      instancia.addSource(ID_FUENTE, { type: 'geojson', data: mapa.datos as AreasVerdesGeoJSON })
      for (const [indice, uso] of usos.entries()) {
        const idCapaUso = `${ID_CAPA}-${indice}`
        const filtroUso: FilterSpecification = ['==', ['get', 'Uso'], uso.nombre]
        instancia.addLayer({
          id: idCapaUso,
          type: 'fill',
          source: ID_FUENTE,
          filter: filtroUso,
          layout: { visibility: usoVisible(uso, usoSeleccionadoRef.current, tipoUsoSeleccionadoRef.current) ? 'visible' : 'none' },
          paint: { 'fill-color': uso.color, 'fill-opacity': 1, 'fill-outline-color': uso.color },
        })
        instancia.addLayer({
          id: `${idCapaUso}-contorno`,
          type: 'line',
          source: ID_FUENTE,
          filter: filtroUso,
          layout: { visibility: usoVisible(uso, usoSeleccionadoRef.current, tipoUsoSeleccionadoRef.current) ? 'visible' : 'none' },
          paint: { 'line-color': uso.color, 'line-width': 2, 'line-opacity': 1 },
        })
      }
      instancia.on('mousemove', (evento) => {
        const propiedad = instancia.queryRenderedFeatures(evento.point, { layers: capasPorUso })[0]
        const propiedades = propiedad?.properties
        if (!propiedades) {
          instancia.getCanvas().style.cursor = ''
          setHoverMapa(null)
          return
        }
        const usoOriginal = texto(propiedades.Uso)
        if (!usoOriginal) return
        const clasificacion = categorias.datos?.find((categoria) => categoria.uso_fuente === usoOriginal)
        instancia.getCanvas().style.cursor = 'pointer'
        setHoverMapa({
          x: evento.point.x,
          y: evento.point.y,
          nombre: texto(propiedades.Nombre) || 'Área verde del campus',
          usoOriginal,
          tipoSistema: clasificacion?.tipo_uso_nombre ?? 'Sin clasificar',
        })
      })
      instancia.fitBounds(
        [[limites.oeste, limites.sur], [limites.este, limites.norte]],
        { padding: 36, maxZoom: 16.5, duration: 0 },
      )
    })

    instancia.on('click', capasPorUso, (evento) => {
      const propiedades = evento.features?.[0]?.properties
      if (!propiedades) return
      const idFuente = texto(propiedades.mapa_id)
      const usoFuente = texto(propiedades.Uso)
      if (!idFuente || !usoFuente) return
      const asignacion = poligonosPorId.get(idFuente)
      const clasificacion = categorias.datos?.find((uso) => uso.uso_fuente === usoFuente)
      setSeleccion({
        idFuente,
        usoFuente,
        nombre: texto(propiedades.Nombre) || 'Área verde del campus',
        tipoUsoId: clasificacion?.tipo_uso_id ?? null,
        areaVerdeId: asignacion?.area_verde_id ?? null,
      })
      setErrorAccion(null)
      setMensajeAccion(null)
      const contenido = document.createElement('div')
      contenido.className = estilos.popup
      const titulo = document.createElement('strong')
      titulo.textContent = texto(propiedades.Nombre) || 'Área verde del campus'
      contenido.append(titulo)
      for (const [etiqueta, valor] of [
        ['Uso original', propiedades.Uso],
        ['Tipo del sistema', clasificacion?.tipo_uso_nombre ?? 'Sin clasificar'],
        ['Área del inventario', asignacion?.area_verde_nombre ?? 'Sin vincular'],
        ['Código de fuente', propiedades['código']],
        ['Referencia', propiedades.Referenc_1],
        ['Superficie de fuente', propiedades['Área'] == null ? null : `${formatearSuperficie(propiedades['Área'])} m²`],
      ] as const) {
        const valorTexto = texto(valor)
        if (!valorTexto) continue
        const detalle = document.createElement('p')
        detalle.textContent = `${etiqueta}: ${valorTexto}`
        contenido.append(detalle)
      }
      new Popup({ maxWidth: '300px' }).setLngLat(evento.lngLat).setDOMContent(contenido).addTo(instancia)
    })

    return () => {
      setHoverMapa(null)
      instancia.remove()
      mapaRef.current = null
    }
  }, [mapa.datos, usos, categorias.datos, poligonosPorId])

  useEffect(() => {
    usoSeleccionadoRef.current = usoSeleccionado
    tipoUsoSeleccionadoRef.current = tipoUsoSeleccionado
    const instancia = mapaRef.current
    if (!instancia) return
    for (const [indice, uso] of usos.entries()) {
      const visibilidad = usoVisible(uso, usoSeleccionado, tipoUsoSeleccionado) ? 'visible' : 'none'
      const idCapaUso = `${ID_CAPA}-${indice}`
      if (instancia.getLayer(idCapaUso)) instancia.setLayoutProperty(idCapaUso, 'visibility', visibilidad)
      if (instancia.getLayer(`${idCapaUso}-contorno`)) instancia.setLayoutProperty(`${idCapaUso}-contorno`, 'visibility', visibilidad)
    }
  }, [mapa.datos, usoSeleccionado, tipoUsoSeleccionado, usos])

  if (consultaConError) {
    return (
      <div className={estilos.pagina}>
        <BotonEnlace to={RUTAS_INVENTARIO.areasVerdes}>Volver al inventario</BotonEnlace>
        <EstadoError
          titulo="No pudimos cargar los datos del mapa"
          descripcion={consultaConError.error?.detalle ?? ''}
          onReintentar={() => {
            mapa.reintentar()
            categorias.reintentar()
            asignaciones.reintentar()
            tiposUso.reintentar()
            areas.reintentar()
          }}
        />
      </div>
    )
  }
  if (consultaPendiente || !mapa.datos || !categorias.datos || !asignaciones.datos || !tiposUso.datos || !areas.datos) {
    return <EstadoCarga forma="tabla" texto="Cargando mapa del campus…" />
  }

  const catalogoTipos = tiposUso.datos
  const inventarioAreas = areas.datos
  const totalVisible = mapa.datos.features.filter((feature) => {
    const uso = usos.find((item) => item.nombre === texto(feature.properties?.Uso))
    return uso ? usoVisible(uso, usoSeleccionado, tipoUsoSeleccionado) : false
  }).length

  async function guardarClasificacion() {
    if (!seleccion) return
    setGuardando('uso')
    setErrorAccion(null)
    setMensajeAccion(null)
    try {
      const respuesta = await clasificarUsoFuenteMapa(seleccion.usoFuente, seleccion.tipoUsoId)
      setMensajeAccion('Se actualizó la clasificación de todos los polígonos con ese Uso de origen.')
      setSeleccion((actual) => actual ? { ...actual, tipoUsoId: respuesta.tipo_uso_id } : null)
      categorias.reintentar()
    } catch (causa) {
      setErrorAccion(causa instanceof Error ? causa.message : 'No se pudo guardar la clasificación.')
    } finally {
      setGuardando(null)
    }
  }

  async function guardarVinculo() {
    if (!seleccion) return
    setGuardando('area')
    setErrorAccion(null)
    setMensajeAccion(null)
    try {
      const respuesta = await asignarPoligonoMapa(seleccion.idFuente, seleccion.areaVerdeId)
      setMensajeAccion(respuesta.area_verde_id ? `Vinculado con ${respuesta.area_verde_nombre}.` : 'Se quitó el vínculo con el inventario.')
      setSeleccion((actual) => actual ? { ...actual, areaVerdeId: respuesta.area_verde_id } : null)
      asignaciones.reintentar()
    } catch (causa) {
      setErrorAccion(causa instanceof Error ? causa.message : 'No se pudo guardar el vínculo con el inventario.')
    } finally {
      setGuardando(null)
    }
  }

  return (
    <main className={estilos.pagina}>
      <div className={estilos.encabezado}>
        <div>
          <BotonEnlace to={RUTAS_INVENTARIO.areasVerdes}>Volver al inventario</BotonEnlace>
          <h1>Mapa del campus PUCP</h1>
          <p>Las categorías originales se conservan; sus equivalencias y vínculos con el inventario se administran aquí.</p>
        </div>
        <div className={estilos.filtrosMapa}>
          <label className={estilos.filtro}>
            <span>Filtrar por uso</span>
            <select value={usoSeleccionado} onChange={(evento) => setUsoSeleccionado(evento.target.value)}>
              <option value="">Todos los usos</option>
              {usos.map((uso) => <option key={uso.nombre} value={uso.nombre}>{uso.nombre}</option>)}
            </select>
          </label>
        </div>
      </div>

      <section className={estilos.panelMapa} aria-label="Mapa interactivo de áreas verdes del campus">
        <MapaVectorialLocal
          datos={mapa.datos}
          usos={usos}
          categorias={categorias.datos}
          usoSeleccionado={usoSeleccionado}
          tipoUsoSeleccionado={tipoUsoSeleccionado}
          onSeleccionar={(feature) => {
            const propiedades = feature.properties
            const idFuente = texto(propiedades.mapa_id)
            const usoFuente = texto(propiedades.Uso)
            if (!idFuente || !usoFuente) return
            const asignacion = poligonosPorId.get(idFuente)
            const clasificacion = categorias.datos?.find((uso) => uso.uso_fuente === usoFuente)
            setSeleccion({
              idFuente,
              usoFuente,
              nombre: texto(propiedades.Nombre) || 'Área verde del campus',
              tipoUsoId: clasificacion?.tipo_uso_id ?? null,
              areaVerdeId: asignacion?.area_verde_id ?? null,
            })
            setErrorAccion(null)
            setMensajeAccion(null)
          }}
        />
        <div className={estilos.panelFlotante}>
          <h2>Usos</h2>
          <ul className={estilos.leyenda}>
            {usos.map((uso) => (
              <li key={uso.nombre}>
                <span className={estilos.muestraColor} style={{ backgroundColor: uso.color }} aria-hidden="true" /> {/* estilo-calculado: color del uso */}
                <span>{uso.nombre}{uso.tipoUsoId !== null && <small> · {catalogoTipos.find((tipo) => tipo.id === uso.tipoUsoId)?.nombre ?? 'tipo inactivo'}</small>}</span>
                <span className={estilos.cantidad}>{uso.cantidad}</span>
              </li>
            ))}
          </ul>
          <p className={estilos.resumen}>{totalVisible} polígonos visibles de {mapa.datos.features.length}</p>
          {seleccion && (
            <div className={estilos.edicion}>
              <h3>{seleccion.nombre}</h3>
              <p>Uso original: <strong>{seleccion.usoFuente}</strong></p>
              {puedeEditar ? (
                <>
                  <label className={estilos.controlEdicion}>
                    <span>Tipo del catálogo</span>
                    <select
                      value={seleccion.tipoUsoId === null ? '' : String(seleccion.tipoUsoId)}
                      disabled={guardando !== null}
                      onChange={(evento) => setSeleccion({ ...seleccion, tipoUsoId: evento.target.value ? Number(evento.target.value) : null })}
                    >
                      <option value="">Sin clasificar</option>
                      {catalogoTipos.map((tipo) => <option key={tipo.id} value={String(tipo.id)}>{tipo.nombre}</option>)}
                    </select>
                  </label>
                  <button type="button" disabled={guardando !== null} onClick={() => void guardarClasificacion()}>
                    {guardando === 'uso' ? 'Guardando…' : 'Guardar clasificación'}
                  </button>
                  <p className={estilos.ayuda}>Aplica a los {usos.find((uso) => uso.nombre === seleccion.usoFuente)?.cantidad ?? 0} polígonos con esta categoría original.</p>
                  <label className={estilos.controlEdicion}>
                    <span>Área del inventario vinculada</span>
                    <select
                      value={seleccion.areaVerdeId === null ? '' : String(seleccion.areaVerdeId)}
                      disabled={guardando !== null}
                      onChange={(evento) => setSeleccion({ ...seleccion, areaVerdeId: evento.target.value ? Number(evento.target.value) : null })}
                    >
                      <option value="">Sin vincular</option>
                      {inventarioAreas.map((area) => <option key={area.id} value={String(area.id)}>{area.nombre} · {area.lugar}</option>)}
                    </select>
                  </label>
                  <button type="button" disabled={guardando !== null} onClick={() => void guardarVinculo()}>
                    {guardando === 'area' ? 'Guardando…' : 'Guardar vínculo'}
                  </button>
                </>
              ) : (
                <p>Solo el jefe de sección puede editar la clasificación y el vínculo con el inventario.</p>
              )}
              {errorAccion && <p role="alert">{errorAccion}</p>}
              {mensajeAccion && <p role="status">{mensajeAccion}</p>}
            </div>
          )}
        </div>
      </section>
      <p className={estilos.fuente}>Fuente: geometrías del mapa proporcionado por el cliente; equivalencias y vínculos gestionados en el inventario. Fondo cartográfico estático local basado en OpenStreetMap © OpenStreetMap contributors.</p>
    </main>
  )
}

function obtenerUsos(geojson: AreasVerdesGeoJSON, categorias: UsoFuenteMapa[]): UsoMapa[] {
  const cantidades = new Map<string, number>()
  for (const feature of geojson.features) {
    const uso = texto(feature.properties?.Uso)
    if (uso) cantidades.set(uso, (cantidades.get(uso) ?? 0) + 1)
  }
  const estilosRaiz = getComputedStyle(document.documentElement)
  return [...cantidades.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([nombre, cantidad], indice) => ({
      nombre,
      cantidad,
      color: estilosRaiz.getPropertyValue(COLORES_MAPA[indice % COLORES_MAPA.length]).trim(),
      tipoUsoId: categorias.find((categoria) => categoria.uso_fuente === nombre)?.tipo_uso_id ?? null,
    }))
}

function usoVisible(uso: UsoMapa, filtroFuente: string, filtroTipo: string): boolean {
  return (!filtroFuente || uso.nombre === filtroFuente)
    && (!filtroTipo || String(uso.tipoUsoId ?? '') === filtroTipo)
}

function obtenerLimites(geojson: AreasVerdesGeoJSON): LimitesMapa | null {
  const limites: LimitesMapa = {
    oeste: Number.POSITIVE_INFINITY,
    sur: Number.POSITIVE_INFINITY,
    este: Number.NEGATIVE_INFINITY,
    norte: Number.NEGATIVE_INFINITY,
  }
  let halloCoordenada = false

  function recorrer(coordenadas: unknown): void {
    if (!Array.isArray(coordenadas)) return
    if (typeof coordenadas[0] === 'number' && typeof coordenadas[1] === 'number') {
      const [longitud, latitud] = coordenadas
      limites.oeste = Math.min(limites.oeste, longitud)
      limites.este = Math.max(limites.este, longitud)
      limites.sur = Math.min(limites.sur, latitud)
      limites.norte = Math.max(limites.norte, latitud)
      halloCoordenada = true
      return
    }
    for (const coordenada of coordenadas) recorrer(coordenada)
  }

  for (const feature of geojson.features) recorrer(feature.geometry.coordinates)
  return halloCoordenada ? limites : null
}

function texto(valor: unknown): string {
  if (typeof valor === 'string') return valor.trim()
  if (typeof valor === 'number') return String(valor)
  return ''
}

function formatearSuperficie(valor: unknown): string {
  const numero = typeof valor === 'number' ? valor : Number(valor)
  return Number.isFinite(numero) ? new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(numero) : String(valor)
}
