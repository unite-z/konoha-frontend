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
import { asignarPoligonoMapa, listarPoligonosMapa, listarTodasLasAreasVerdes } from '@/services/api/mapaAsignaciones'
import { cargarAreasVerdesGeoJSON, type AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { PERMISOS, puede } from '@/config/permisosCore'
import estilos from './MapaAreasVerdesPage.module.css'
import MapaVectorialLocal from './MapaVectorialLocal'
import { enriquecerGeoJSON, obtenerClasificacionPoligono } from './clasificacionMapa'

const ID_CAPA = 'areas-verdes-poligonos'
const ID_FUENTE = 'areas-verdes-campus'

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
  nombrePoligono: string
  tipoUsoEfectivo: string
  areaVerdeId: number | null
  areaVerdeNombre: string | null
  superficieRegistradaM2: string | null
  superficieCartografica: string | null
}

export default function MapaAreasVerdesPage() {
  usePaginaActual('Mapa del campus', [MIGAS_INVENTARIO.areasVerdes, MIGAS_INVENTARIO.mapa])
  const sesion = useSesionActiva()
  const contenedorMapa = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<MapaMapLibre | null>(null)
  const usoSeleccionadoRef = useRef('')
  const mapa = useConsulta('mapa-areas-verdes', cargarAreasVerdesGeoJSON)
  const asignaciones = useConsulta('mapa-poligonos', listarPoligonosMapa)
  const tiposUso = useConsulta('mapa-tipos-uso', (signal) => listarTiposUso(true, signal))
  const areas = useConsulta('mapa-inventario-areas', listarTodasLasAreasVerdes)
  const [usoSeleccionado, setUsoSeleccionado] = useState('')
  const [seleccion, setSeleccion] = useState<PoligonoSeleccionado | null>(null)
  const [guardando, setGuardando] = useState<'area' | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [mensajeAccion, setMensajeAccion] = useState<string | null>(null)
  const puedeEditar = puede(sesion, PERMISOS.gestionarCatalogos)

  const consultaConError = [mapa, asignaciones, tiposUso, areas].find((consulta) => consulta.estado === 'error' && !consulta.datos)
  const consultaPendiente = [mapa, asignaciones, tiposUso, areas].some((consulta) => !consulta.datos)

  const poligonosPorId = useMemo(() => new Map((asignaciones.datos ?? []).map((asignacion) => [asignacion.id_fuente, asignacion])), [asignaciones.datos])
  const mapaEfectivo = useMemo(
    () => mapa.datos && asignaciones.datos ? enriquecerGeoJSON(mapa.datos, asignaciones.datos, tiposUso.datos ?? []) : null,
    [mapa.datos, asignaciones.datos, tiposUso.datos],
  )
  const usos = useMemo(
    () => mapaEfectivo ? obtenerUsos(mapaEfectivo, tiposUso.datos ?? []) : [],
    [mapaEfectivo, tiposUso.datos],
  )

  useEffect(() => {
    if (!contenedorMapa.current || !mapaEfectivo) return
    const limites = obtenerLimites(mapaEfectivo)
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
      instancia.addSource(ID_FUENTE, { type: 'geojson', data: mapaEfectivo as AreasVerdesGeoJSON })
      for (const [indice, uso] of usos.entries()) {
        const idCapaUso = `${ID_CAPA}-${indice}`
        const filtroUso: FilterSpecification = ['==', ['coalesce', ['get', 'tipo_uso_efectivo_id'], -1], uso.tipoUsoId ?? -1]
        instancia.addLayer({
          id: idCapaUso,
          type: 'fill',
          source: ID_FUENTE,
          filter: filtroUso,
          layout: { visibility: usoVisible(uso, usoSeleccionadoRef.current) ? 'visible' : 'none' },
          paint: { 'fill-color': uso.color, 'fill-opacity': 1, 'fill-outline-color': uso.color },
        })
        instancia.addLayer({
          id: `${idCapaUso}-contorno`,
          type: 'line',
          source: ID_FUENTE,
          filter: filtroUso,
          layout: { visibility: usoVisible(uso, usoSeleccionadoRef.current) ? 'visible' : 'none' },
          paint: { 'line-color': uso.color, 'line-width': 2, 'line-opacity': 1 },
        })
      }
      instancia.on('mousemove', (evento) => {
        const propiedad = instancia.queryRenderedFeatures(evento.point, { layers: capasPorUso })[0]
        const propiedades = propiedad?.properties
        if (!propiedades) {
          instancia.getCanvas().style.cursor = ''
          return
        }
        instancia.getCanvas().style.cursor = 'pointer'
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
      if (!idFuente) return
      const asignacion = poligonosPorId.get(idFuente)
      const clasificacion = obtenerClasificacionPoligono(usoFuente, asignacion)
      const tipoUsoEfectivo = clasificacion.origenClasificacion === 'area-vinculada'
        ? tiposUso.datos?.find((tipo) => tipo.id === clasificacion.tipoUsoEfectivoId)?.nombre ?? 'Sin clasificar'
        : tiposUso.datos?.find((tipo) => tipo.nombre.toLocaleLowerCase('es') === usoFuente.toLocaleLowerCase('es'))?.nombre ?? 'Sin clasificar'
      setSeleccion({
        idFuente,
        usoFuente,
        nombrePoligono: texto(propiedades.Nombre),
        tipoUsoEfectivo,
        areaVerdeId: asignacion?.area_verde_id ?? null,
        areaVerdeNombre: asignacion?.area_verde_nombre ?? null,
        superficieRegistradaM2: asignacion?.superficie_registrada_m2 ?? null,
        superficieCartografica: texto(propiedades['Área']) || null,
      })
      setErrorAccion(null)
      setMensajeAccion(null)
      const contenido = document.createElement('div')
      contenido.className = estilos.popup
      const titulo = document.createElement('strong')
      titulo.textContent = asignacion?.area_verde_id
        ? asignacion.area_verde_nombre ?? (texto(propiedades.Nombre) || 'Área verde vinculada')
        : texto(propiedades.Nombre) || 'Polígono del mapa'
      contenido.append(titulo)
      for (const [etiqueta, valor] of [
        ['Tipo de uso', tipoUsoEfectivo],
        ['Superficie', asignacion?.area_verde_id
          ? asignacion.superficie_registrada_m2 == null ? 'Sin registro' : `${formatearSuperficie(asignacion.superficie_registrada_m2)} m² (inventario)`
          : propiedades['Área'] == null ? 'Sin dato' : `${formatearSuperficie(propiedades['Área'])} m² (polígono)`],
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
      instancia.remove()
      mapaRef.current = null
    }
  }, [mapaEfectivo, usos, poligonosPorId])

  useEffect(() => {
    usoSeleccionadoRef.current = usoSeleccionado
    const instancia = mapaRef.current
    if (!instancia) return
    for (const [indice, uso] of usos.entries()) {
      const visibilidad = usoVisible(uso, usoSeleccionado) ? 'visible' : 'none'
      const idCapaUso = `${ID_CAPA}-${indice}`
      if (instancia.getLayer(idCapaUso)) instancia.setLayoutProperty(idCapaUso, 'visibility', visibilidad)
      if (instancia.getLayer(`${idCapaUso}-contorno`)) instancia.setLayoutProperty(`${idCapaUso}-contorno`, 'visibility', visibilidad)
    }
  }, [mapaEfectivo, usoSeleccionado, usos])

  if (consultaConError) {
    return (
      <div className={estilos.pagina}>
        <BotonEnlace to={RUTAS_INVENTARIO.areasVerdes}>Volver al inventario</BotonEnlace>
        <EstadoError
          titulo="No pudimos cargar los datos del mapa"
          descripcion={consultaConError.error?.detalle ?? ''}
          onReintentar={() => {
            mapa.reintentar()
            asignaciones.reintentar()
            tiposUso.reintentar()
            areas.reintentar()
          }}
        />
      </div>
    )
  }
  if (consultaPendiente || !mapa.datos || !asignaciones.datos || !tiposUso.datos || !areas.datos) {
    return <EstadoCarga forma="tabla" texto="Cargando mapa del campus…" />
  }

  const inventarioAreas = areas.datos
  const totalVisible = mapaEfectivo?.features.filter((feature) => {
    const tipoId = numero(feature.properties?.tipo_uso_efectivo_id)
    const uso = usos.find((item) => item.tipoUsoId === tipoId)
    return uso ? usoVisible(uso, usoSeleccionado) : false
  }).length ?? 0

  async function guardarVinculo() {
    if (!seleccion) return
    setGuardando('area')
    setErrorAccion(null)
    setMensajeAccion(null)
    try {
      const respuesta = await asignarPoligonoMapa(seleccion.idFuente, seleccion.areaVerdeId)
      setMensajeAccion(respuesta.area_verde_id ? 'Vínculo guardado.' : 'Se quitó el vínculo con el inventario.')
      const clasificacion = obtenerClasificacionPoligono(seleccion.usoFuente, respuesta)
      const tipoUsoEfectivo = clasificacion.origenClasificacion === 'area-vinculada'
        ? tiposUso.datos.find((tipo) => tipo.id === clasificacion.tipoUsoEfectivoId)?.nombre ?? 'Sin clasificar'
        : tiposUso.datos.find((tipo) => tipo.nombre.toLocaleLowerCase('es') === seleccion.usoFuente.toLocaleLowerCase('es'))?.nombre ?? 'Sin clasificar'
      setSeleccion((actual) => actual ? {
        ...actual,
        areaVerdeId: respuesta.area_verde_id,
        areaVerdeNombre: respuesta.area_verde_nombre,
        superficieRegistradaM2: respuesta.superficie_registrada_m2,
        tipoUsoEfectivo,
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
        <div className={estilos.filtrosMapa}>
          <Selector
            id="filtro-uso-mapa"
            etiqueta="Filtrar por tipo de uso"
            valor={usoSeleccionado}
            onCambiar={setUsoSeleccionado}
            opcionTodos="Todos los usos"
            opciones={usos.map((uso) => ({ valor: uso.nombre, texto: uso.nombre }))}
          />
        </div>
      </div>

      <section className={estilos.panelMapa} aria-label="Mapa interactivo de áreas verdes del campus">
        <MapaVectorialLocal
          datos={mapaEfectivo ?? mapa.datos}
          usos={usos}
          usoSeleccionado={usoSeleccionado}
          onSeleccionar={(feature) => {
            const propiedades = feature.properties
            const idFuente = texto(propiedades.mapa_id)
            const usoFuente = texto(propiedades.Uso)
            if (!idFuente) return
            const asignacion = poligonosPorId.get(idFuente)
            const clasificacion = obtenerClasificacionPoligono(usoFuente, asignacion)
            const tipoUsoEfectivo = clasificacion.origenClasificacion === 'area-vinculada'
              ? tiposUso.datos?.find((tipo) => tipo.id === clasificacion.tipoUsoEfectivoId)?.nombre ?? 'Sin clasificar'
              : tiposUso.datos?.find((tipo) => tipo.nombre.toLocaleLowerCase('es') === usoFuente.toLocaleLowerCase('es'))?.nombre ?? 'Sin clasificar'
            setSeleccion({
              idFuente,
              usoFuente,
              nombrePoligono: texto(propiedades.Nombre),
              tipoUsoEfectivo,
              areaVerdeId: asignacion?.area_verde_id ?? null,
              areaVerdeNombre: asignacion?.area_verde_nombre ?? null,
              superficieRegistradaM2: asignacion?.superficie_registrada_m2 ?? null,
              superficieCartografica: texto(propiedades['Área']) || null,
            })
            setErrorAccion(null)
            setMensajeAccion(null)
          }}
        />
        <div className={estilos.panelFlotante}>
          <h2>Tipos de uso</h2>
          <ul className={estilos.leyenda}>
            {usos.map((uso) => (
              <li key={uso.tipoUsoId ?? 'sin-clasificar'}>
                <span className={estilos.muestraColor} style={{ backgroundColor: uso.color }} aria-hidden="true" /> {/* estilo-calculado: color del uso */}
                <span>{uso.nombre}</span>
                <span className={estilos.cantidad}>{uso.cantidad}</span>
              </li>
            ))}
          </ul>
          <p className={estilos.resumen}>{totalVisible} polígonos visibles de {mapaEfectivo?.features.length ?? 0}</p>
          {seleccion && (
            <div className={estilos.edicion}>
              <h3>{seleccion.areaVerdeId ? seleccion.areaVerdeNombre ?? (seleccion.nombrePoligono || 'Área verde vinculada') : seleccion.nombrePoligono || 'Polígono del mapa'}</h3>
              <p>Tipo de uso: <strong>{seleccion.tipoUsoEfectivo}</strong></p>
              <p>Superficie: <strong>{seleccion.areaVerdeId
                ? seleccion.superficieRegistradaM2 ? `${formatearSuperficie(seleccion.superficieRegistradaM2)} m² (inventario)` : 'Sin registro en inventario'
                : seleccion.superficieCartografica ? `${formatearSuperficie(seleccion.superficieCartografica)} m² (polígono)` : 'Sin dato del polígono'}</strong></p>
              {puedeEditar ? (
                <>
                  <Selector
                    id="area-poligono"
                    etiqueta="Cambiar área vinculada"
                    compacto
                    valor={seleccion.areaVerdeId === null ? '' : String(seleccion.areaVerdeId)}
                    disabled={guardando !== null}
                    onCambiar={(valor) => {
                      const area = valor ? inventarioAreas.find((elemento) => elemento.id === Number(valor)) : null
                      const tipoUso = area?.tipo_uso_id
                        ? tiposUso.datos.find((tipo) => tipo.id === area.tipo_uso_id)
                        : null
                      setSeleccion({
                        ...seleccion,
                        areaVerdeId: area?.id ?? null,
                        areaVerdeNombre: area?.nombre ?? null,
                        superficieRegistradaM2: area?.superficie_m2 ?? null,
                        tipoUsoEfectivo: tipoUso?.nombre ?? tiposUso.datos.find(
                          (tipo) => tipo.nombre.toLocaleLowerCase('es') === seleccion.usoFuente.toLocaleLowerCase('es'),
                        )?.nombre ?? 'Sin clasificar',
                      })
                    }}
                    opcionTodos="Sin vincular"
                    opciones={inventarioAreas.map((area) => ({ valor: String(area.id), texto: `${area.nombre} · ${area.lugar}` }))}
                  />
                  <Boton variante="secundario" compacto cargando={guardando === 'area'} deshabilitado={guardando !== null} onClick={() => void guardarVinculo()}>
                    Guardar vínculo
                  </Boton>
                </>
              ) : (
                <p>Solo el jefe de sección puede modificar el vínculo con el inventario.</p>
              )}
              {errorAccion && <AvisoEnLinea tono="error">{errorAccion}</AvisoEnLinea>}
              {mensajeAccion && <AvisoEnLinea tono="exito">{mensajeAccion}</AvisoEnLinea>}
            </div>
          )}
        </div>
      </section>
      <p className={estilos.fuente}>Fuente: geometrías del mapa proporcionado por el cliente; vínculos gestionados en el inventario. Fondo cartográfico estático local basado en OpenStreetMap © OpenStreetMap contributors.</p>
    </div>
  )
}

function obtenerUsos(geojson: AreasVerdesGeoJSON, tiposUso: { id: number; nombre: string }[]): UsoMapa[] {
  const cantidades = new Map<number | null, number>()
  for (const feature of geojson.features) {
    const tipoUsoId = numero(feature.properties?.tipo_uso_efectivo_id)
    cantidades.set(tipoUsoId, (cantidades.get(tipoUsoId) ?? 0) + 1)
  }
  return [...cantidades.entries()]
    .map(([tipoUsoId, cantidad]) => {
      const nombre = tipoUsoId === null ? 'Sin clasificar' : tiposUso.find((tipo) => tipo.id === tipoUsoId)?.nombre ?? 'Sin clasificar'
      const tipo = tipoUsoId === null ? null : tiposUso.find((elemento) => elemento.id === tipoUsoId)
      return {
        nombre: tipoUsoId === null ? `${nombre} (sin tipo vinculado)` : nombre,
        cantidad,
        color: tipo?.color ?? '#455A64',
        tipoUsoId,
      }
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

function usoVisible(uso: UsoMapa, filtroFuente: string): boolean {
  return !filtroFuente || uso.nombre === filtroFuente || (filtroFuente === 'Sin clasificar' && uso.nombre.startsWith('Sin clasificar'))
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

function numero(valor: unknown): number | null {
  const resultado = typeof valor === 'number' ? valor : typeof valor === 'string' ? Number(valor) : Number.NaN
  return Number.isFinite(resultado) ? resultado : null
}

function formatearSuperficie(valor: unknown): string {
  const numero = typeof valor === 'number' ? valor : Number(valor)
  return Number.isFinite(numero) ? new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(numero) : String(valor)
}
