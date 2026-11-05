import { useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapaMapLibre, NavigationControl, Popup, ScaleControl, type FilterSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import Selector from '@/components/ui/Selector'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO } from '@/router/rutasApp'
import { listarTiposUso } from '@/services/api/catalogosInventario'
import { asignarPoligonoMapa, clasificarUsoFuenteMapa, listarPoligonosMapa, listarTodasLasAreasVerdes, listarUsosFuenteMapa } from '@/services/api/mapaAsignaciones'
import { cargarAreasVerdesGeoJSON, type AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { PERMISOS, puede } from '@/config/permisosCore'
import type { ElementoInventario } from '@/types/catalogosInventario'
import type { PoligonoMapaAsignado } from '@/types/mapaInventario'
import { colorEstableClasificacion, enriquecerMapaAreasVerdes, etiquetaClasificacionMapa, filtrarMapaPorClasificacion, listarClasificacionesMapa, type ClasificacionMapa } from '@/utils/mapaAreasVerdes'
import estilos from './MapaAreasVerdesPage.module.css'
import MapaVectorialLocal from './MapaVectorialLocal'

const ID_CAPA = 'areas-verdes-poligonos'
const ID_FUENTE = 'areas-verdes-campus'
const COLORES_MAPA = ['--map-uso-1', '--map-uso-2', '--map-uso-3', '--map-uso-4', '--map-uso-5', '--map-uso-6']

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
  areaVerdeNombre: string | null
  superficieRegistrada: string | null
  superficieCartografica: string | null
  clasificacionNombre: string
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
  const clasificacionSeleccionadaRef = useRef('')
  const mapa = useConsulta('mapa-areas-verdes', cargarAreasVerdesGeoJSON)
  const categorias = useConsulta('mapa-usos-fuente', listarUsosFuenteMapa)
  const asignaciones = useConsulta('mapa-poligonos', listarPoligonosMapa)
  const tiposUso = useConsulta('mapa-tipos-uso', (signal) => listarTiposUso(false, signal))
  const areas = useConsulta('mapa-inventario-areas', listarTodasLasAreasVerdes)
  const [clasificacionSeleccionada, setClasificacionSeleccionada] = useState('')
  const [seleccion, setSeleccion] = useState<PoligonoSeleccionado | null>(null)
  const [, setHoverMapa] = useState<HoverMapa | null>(null)
  const [guardando, setGuardando] = useState<'uso' | 'area' | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [mensajeAccion, setMensajeAccion] = useState<string | null>(null)
  const puedeEditar = puede(sesion, PERMISOS.gestionarCatalogos)

  const consultaConError = [mapa, categorias, asignaciones, tiposUso, areas].find((consulta) => consulta.estado === 'error' && !consulta.datos)
  const consultaPendiente = [mapa, categorias, asignaciones, tiposUso, areas].some((consulta) => !consulta.datos)

  const poligonosPorId = useMemo(() => new Map((asignaciones.datos ?? []).map((asignacion) => [asignacion.id_fuente, asignacion])), [asignaciones.datos])
  const mapaEnriquecido = useMemo(
    () => mapa.datos && asignaciones.datos && tiposUso.datos
      ? enriquecerMapa(mapa.datos, asignaciones.datos, tiposUso.datos)
      : null,
    [mapa.datos, asignaciones.datos, tiposUso.datos],
  )
  const clasificaciones = useMemo(
    () => mapaEnriquecido ? listarClasificacionesMapa(mapaEnriquecido) : [],
    [mapaEnriquecido],
  )

  useEffect(() => {
    if (!contenedorMapa.current || !mapaEnriquecido) return
    const limites = obtenerLimites(mapaEnriquecido)
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
    const capasPorClasificacion = clasificaciones.map((_, indice) => `${ID_CAPA}-${indice}`)

    instancia.once('load', () => {
      instancia.addSource(ID_FUENTE, { type: 'geojson', data: mapaEnriquecido })
      for (const [indice, clasificacion] of clasificaciones.entries()) {
        const idCapaUso = `${ID_CAPA}-${indice}`
        const filtroClasificacion: FilterSpecification = ['==', ['get', 'clasificacion_mapa_id'], clasificacion.id]
        instancia.addLayer({
          id: idCapaUso,
          type: 'fill',
          source: ID_FUENTE,
          filter: filtroClasificacion,
          layout: { visibility: clasificacionVisible(clasificacion, clasificacionSeleccionadaRef.current) ? 'visible' : 'none' },
          paint: { 'fill-color': clasificacion.color, 'fill-opacity': 1, 'fill-outline-color': clasificacion.color },
        })
        instancia.addLayer({
          id: `${idCapaUso}-contorno`,
          type: 'line',
          source: ID_FUENTE,
          filter: filtroClasificacion,
          layout: { visibility: clasificacionVisible(clasificacion, clasificacionSeleccionadaRef.current) ? 'visible' : 'none' },
          paint: { 'line-color': clasificacion.color, 'line-width': 2, 'line-opacity': 1 },
        })
      }
      instancia.on('mousemove', (evento) => {
        const propiedad = instancia.queryRenderedFeatures(evento.point, { layers: capasPorClasificacion })[0]
        const propiedades = propiedad?.properties
        if (!propiedades) {
          instancia.getCanvas().style.cursor = ''
          setHoverMapa(null)
          return
        }
        const usoOriginal = texto(propiedades.Uso)
        if (!usoOriginal) return
        instancia.getCanvas().style.cursor = 'pointer'
        setHoverMapa({
          x: evento.point.x,
          y: evento.point.y,
          nombre: texto(propiedades.inventario_nombre) || texto(propiedades.Nombre) || 'Área verde del campus',
          usoOriginal,
          tipoSistema: texto(propiedades.clasificacion_mapa_nombre) || 'Sin clasificar',
        })
      })
      instancia.fitBounds(
        [[limites.oeste, limites.sur], [limites.este, limites.norte]],
        { padding: 36, maxZoom: 16.5, duration: 0 },
      )
    })

    instancia.on('click', capasPorClasificacion, (evento) => {
      const propiedades = evento.features?.[0]?.properties
      if (!propiedades) return
      const idFuente = texto(propiedades.mapa_id)
      const usoFuente = texto(propiedades.Uso)
      if (!idFuente || !usoFuente) return
      const asignacion = poligonosPorId.get(idFuente)
      const clasificacion = categorias.datos?.find((uso) => uso.uso_fuente === usoFuente)
      const tipoFichaId = asignacion?.area_verde_id == null ? null : asignacion.area_verde_tipo_uso_id
      setSeleccion({
        idFuente,
        usoFuente,
        nombre: (asignacion?.area_verde_nombre ?? texto(propiedades.Nombre)) || 'Área verde del campus',
        tipoUsoId: clasificacion?.tipo_uso_id ?? null,
        areaVerdeId: asignacion?.area_verde_id ?? null,
        areaVerdeNombre: asignacion?.area_verde_nombre ?? null,
        superficieRegistrada: asignacion?.area_verde_superficie_m2 ?? null,
        superficieCartografica: texto(propiedades['Área']) || null,
        clasificacionNombre: tipoFichaId !== null
          ? asignacion?.area_verde_tipo_uso_nombre ?? `Tipo ${tipoFichaId}`
          : `${usoFuente} · categoría de origen`,
      })
      setErrorAccion(null)
      setMensajeAccion(null)
      const contenido = document.createElement('div')
      contenido.className = estilos.popup
      const titulo = document.createElement('strong')
      titulo.textContent = texto(propiedades.inventario_nombre) || texto(propiedades.Nombre) || 'Área verde del campus'
      contenido.append(titulo)
      for (const [etiqueta, valor] of [
        ['Uso original', propiedades.Uso],
        ['Tipo de uso o categoría de origen', texto(propiedades.clasificacion_mapa_nombre) || 'Sin clasificar'],
        ['Área del inventario', asignacion?.area_verde_nombre ?? 'Sin vincular'],
        ['Código de fuente', propiedades['código']],
        ['Referencia', propiedades.Referenc_1],
        ['Superficie registrada', asignacion?.area_verde_superficie_m2 == null ? null : `${formatearSuperficie(asignacion.area_verde_superficie_m2)} m²`],
        ['Superficie de origen', propiedades['Área'] == null ? null : `${formatearSuperficie(propiedades['Área'])} m²`],
      ] as const) {
        const valorTexto = texto(valor)
        if (!valorTexto) continue
        const detalle = document.createElement('p')
        detalle.textContent = `${etiqueta}: ${valorTexto}`
        contenido.append(detalle)
      }
      new Popup({ maxWidth: '18.75rem' }).setLngLat(evento.lngLat).setDOMContent(contenido).addTo(instancia)
    })

    return () => {
      setHoverMapa(null)
      instancia.remove()
      mapaRef.current = null
    }
  }, [mapaEnriquecido, clasificaciones, categorias.datos, poligonosPorId])

  useEffect(() => {
    clasificacionSeleccionadaRef.current = clasificacionSeleccionada
    const instancia = mapaRef.current
    if (!instancia) return
    for (const [indice, clasificacion] of clasificaciones.entries()) {
      const visibilidad = clasificacionVisible(clasificacion, clasificacionSeleccionada) ? 'visible' : 'none'
      const idCapaUso = `${ID_CAPA}-${indice}`
      if (instancia.getLayer(idCapaUso)) instancia.setLayoutProperty(idCapaUso, 'visibility', visibilidad)
      if (instancia.getLayer(`${idCapaUso}-contorno`)) instancia.setLayoutProperty(`${idCapaUso}-contorno`, 'visibility', visibilidad)
    }
  }, [clasificacionSeleccionada, clasificaciones])

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
  const totalVisible = mapaEnriquecido
    ? filtrarMapaPorClasificacion(mapaEnriquecido, clasificacionSeleccionada).features.length
    : 0

  async function guardarClasificacion() {
    if (!seleccion) return
    setGuardando('uso')
    setErrorAccion(null)
    setMensajeAccion(null)
    try {
      const respuesta = await clasificarUsoFuenteMapa(seleccion.usoFuente, seleccion.tipoUsoId)
      setMensajeAccion(`Se actualizó la equivalencia del catálogo para todos los polígonos con la categoría «${seleccion.usoFuente}». No cambia la clasificación efectiva ni el tipo de las fichas vinculadas.`)
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
      const clasificacionOrigen = categorias.datos?.find((item) => item.uso_fuente === seleccion.usoFuente)
      setSeleccion((actual) => actual ? {
        ...actual,
        areaVerdeId: respuesta.area_verde_id,
        nombre: respuesta.area_verde_nombre ?? actual.nombre,
        areaVerdeNombre: respuesta.area_verde_nombre,
        superficieRegistrada: respuesta.area_verde_superficie_m2,
        clasificacionNombre: respuesta.area_verde_id === null || respuesta.area_verde_tipo_uso_id === null
          ? `${actual.usoFuente} · categoría de origen`
          : respuesta.area_verde_tipo_uso_nombre ?? `Tipo ${respuesta.area_verde_tipo_uso_id}`,
        tipoUsoId: respuesta.area_verde_id === null ? clasificacionOrigen?.tipo_uso_id ?? null : actual.tipoUsoId,
      } : null)
      asignaciones.reintentar()
    } catch (causa) {
      setErrorAccion(causa instanceof Error ? causa.message : 'No se pudo guardar el vínculo con el inventario.')
    } finally {
      setGuardando(null)
    }
  }

  return (
    <div className={estilos.pagina}>
      <BotonEnlace to={RUTAS_INVENTARIO.areasVerdes} className={estilos.volver}>Volver al inventario</BotonEnlace>
      <div className={estilos.encabezado}>
        <p>La clasificación usa el tipo vigente de la ficha vinculada; si falta, conserva como referencia la categoría original del GeoJSON.</p>
        <div className={estilos.filtrosMapa}>
          <Selector
            id="filtro-clasificacion-mapa"
            etiqueta="Filtrar por clasificación"
            valor={clasificacionSeleccionada}
            onCambiar={setClasificacionSeleccionada}
            opcionTodos="Todas las clasificaciones"
            opciones={clasificaciones.map((clasificacion) => ({ valor: clasificacion.id, texto: etiquetaClasificacionMapa(clasificacion) }))}
          />
        </div>
      </div>

      <section className={estilos.panelMapa} aria-label="Mapa interactivo de áreas verdes del campus">
        <MapaVectorialLocal
          datos={mapaEnriquecido ?? mapa.datos}
          usos={clasificaciones}
          usoSeleccionado={clasificacionSeleccionada}
          onSeleccionar={(feature) => {
            const propiedades = feature.properties
            const idFuente = texto(propiedades.mapa_id)
            const usoFuente = texto(propiedades.Uso)
            if (!idFuente || !usoFuente) return
            const asignacion = poligonosPorId.get(idFuente)
            const clasificacion = categorias.datos?.find((uso) => uso.uso_fuente === usoFuente)
            const tipoFichaId = asignacion?.area_verde_id == null ? null : asignacion.area_verde_tipo_uso_id
            setSeleccion({
              idFuente,
              usoFuente,
              nombre: (asignacion?.area_verde_nombre ?? texto(propiedades.Nombre)) || 'Área verde del campus',
              tipoUsoId: clasificacion?.tipo_uso_id ?? null,
              areaVerdeId: asignacion?.area_verde_id ?? null,
              areaVerdeNombre: asignacion?.area_verde_nombre ?? null,
              superficieRegistrada: asignacion?.area_verde_superficie_m2 ?? null,
              superficieCartografica: texto(propiedades['Área']) || null,
              clasificacionNombre: tipoFichaId !== null
                ? asignacion?.area_verde_tipo_uso_nombre ?? `Tipo ${tipoFichaId}`
                : `${usoFuente} · categoría de origen`,
            })
            setErrorAccion(null)
            setMensajeAccion(null)
          }}
        />
        <div className={estilos.panelFlotante}>
          <h2>Clasificación</h2>
          <ul className={estilos.leyenda}>
            {clasificaciones.map((clasificacion) => (
              <li key={clasificacion.id}>
                <span className={estilos.muestraColor} style={{ backgroundColor: clasificacion.color }} aria-hidden="true" /> {/* estilo-calculado: color de la clasificación vigente */}
                <span>{etiquetaClasificacionMapa(clasificacion)}</span>
                <span className={estilos.cantidad}>{clasificacion.cantidad}</span>
              </li>
            ))}
          </ul>
          <p className={estilos.resumen}>{totalVisible} polígonos visibles de {mapa.datos.features.length}</p>
          {seleccion && (
            <div className={estilos.edicion}>
              <h3>{seleccion.nombre}</h3>
              <p>Uso original: <strong>{seleccion.usoFuente}</strong></p>
              <p>Clasificación efectiva: <strong>{seleccion.clasificacionNombre}</strong></p>
              {seleccion.areaVerdeId !== null && (
                <>
                  <p>Superficie registrada en la ficha: <strong>{seleccion.superficieRegistrada === null ? 'No disponible' : `${formatearSuperficie(seleccion.superficieRegistrada)} m²`}</strong></p>
                  <p>Superficie cartográfica del GeoJSON: <strong>{seleccion.superficieCartografica === null ? 'No disponible' : `${formatearSuperficie(seleccion.superficieCartografica)} m²`}</strong></p>
                  <BotonEnlace variante="enlace" to={`${RUTAS_INVENTARIO.areasVerdes}?buscar=${encodeURIComponent(seleccion.areaVerdeNombre ?? seleccion.nombre)}`}>
                    Buscar ficha en el inventario
                  </BotonEnlace>
                </>
              )}
              {puedeEditar ? (
                <>
                  {seleccion.areaVerdeId !== null && (poligonosPorId.get(seleccion.idFuente)?.area_verde_tipo_uso_id ?? null) !== null ? (
                    <div className={estilos.ayuda}>
                      <p>Tipo vigente de la ficha: <strong>{poligonosPorId.get(seleccion.idFuente)?.area_verde_tipo_uso_nombre ?? 'Sin tipo asignado'}</strong></p>
                      <p>Para cambiar el tipo o la superficie registrada, edita la ficha del inventario. La edición desde esta interfaz está pendiente en AV-111.</p>
                    </div>
                  ) : <p className={estilos.ayuda}>Sin un tipo vigente en la ficha, este polígono conserva «{seleccion.usoFuente}» como categoría de origen.</p>}
                  <details>
                    <summary>Equivalencia global de «Tipo del catálogo»</summary>
                    <p className={estilos.ayuda}>Este dato de referencia se aplica a toda la categoría original «{seleccion.usoFuente}». No edita una ficha ni cambia la clasificación efectiva del mapa; para modificar un área vinculada, abre su ficha en el inventario.</p>
                    <Selector
                      id="tipo-uso-poligono"
                      etiqueta="Tipo de referencia para toda la categoría"
                      compacto
                      valor={seleccion.tipoUsoId === null ? '' : String(seleccion.tipoUsoId)}
                      disabled={guardando !== null}
                      onCambiar={(valor) => setSeleccion({ ...seleccion, tipoUsoId: valor ? Number(valor) : null })}
                      opcionTodos="Sin equivalencia de referencia"
                      opciones={catalogoTipos.map((tipo) => ({ valor: String(tipo.id), texto: tipo.nombre }))}
                    />
                    <Boton variante="secundario" compacto cargando={guardando === 'uso'} deshabilitado={guardando !== null} onClick={() => void guardarClasificacion()}>
                      Guardar equivalencia de categoría
                    </Boton>
                  </details>
                  <Selector
                    id="area-poligono"
                    etiqueta="Área del inventario vinculada"
                    compacto
                    valor={seleccion.areaVerdeId === null ? '' : String(seleccion.areaVerdeId)}
                    disabled={guardando !== null}
                    onCambiar={(valor) => setSeleccion({ ...seleccion, areaVerdeId: valor ? Number(valor) : null })}
                    opcionTodos="Sin vincular"
                    opciones={inventarioAreas.map((area) => ({ valor: String(area.id), texto: `${area.nombre} · ${area.lugar}` }))}
                  />
                  <Boton variante="secundario" compacto cargando={guardando === 'area'} deshabilitado={guardando !== null} onClick={() => void guardarVinculo()}>
                    Guardar vínculo
                  </Boton>
                </>
              ) : (
                <p>Solo el jefe de sección puede editar la clasificación y el vínculo con el inventario.</p>
              )}
              {errorAccion && <AvisoEnLinea tono="error">{errorAccion}</AvisoEnLinea>}
              {mensajeAccion && <AvisoEnLinea tono="exito">{mensajeAccion}</AvisoEnLinea>}
            </div>
          )}
        </div>
      </section>
      <p className={estilos.fuente}>Fuente: geometrías del mapa proporcionado por el cliente; equivalencias y vínculos gestionados en el inventario. Fondo cartográfico estático local basado en OpenStreetMap © OpenStreetMap contributors.</p>
    </div>
  )
}

function obtenerColoresOrigen(geojson: AreasVerdesGeoJSON): Map<string, string> {
  const nombres = new Set<string>()
  for (const feature of geojson.features) {
    const uso = texto(feature.properties?.Uso)
    if (uso) nombres.add(uso)
  }
  const estilosRaiz = getComputedStyle(document.documentElement)
  const paleta = COLORES_MAPA.map((token) => estilosRaiz.getPropertyValue(token).trim())
  return new Map([...nombres].map((nombre) => [
    nombre,
    colorEstableClasificacion(`origen:${nombre}`, paleta),
  ]))
}

function enriquecerMapa(
  geojson: AreasVerdesGeoJSON,
  asignaciones: PoligonoMapaAsignado[],
  tipos: ElementoInventario[],
): AreasVerdesGeoJSON {
  const estilosRaiz = getComputedStyle(document.documentElement)
  const paleta = COLORES_MAPA.map((token) => estilosRaiz.getPropertyValue(token).trim())
  const idsTipo = new Set([
    ...tipos.map((tipo) => tipo.id),
    ...asignaciones.flatMap((asignacion) => asignacion.area_verde_tipo_uso_id === null ? [] : [asignacion.area_verde_tipo_uso_id]),
  ])
  const coloresTipo = new Map([...idsTipo].map((tipoId) => [
    tipoId,
    colorEstableClasificacion(`tipo:${tipoId}`, paleta),
  ]))
  const coloresOrigen = obtenerColoresOrigen(geojson)
  return enriquecerMapaAreasVerdes(geojson, asignaciones, coloresTipo, coloresOrigen)
}

function clasificacionVisible(clasificacion: ClasificacionMapa, filtro: string): boolean {
  return !filtro || clasificacion.id === filtro
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
