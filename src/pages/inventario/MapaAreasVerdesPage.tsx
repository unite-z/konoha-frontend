import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import Selector from '@/components/ui/Selector'
import { PERMISOS, puede } from '@/config/permisosCore'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO } from '@/router/rutasApp'
import { listarTiposUso } from '@/services/api/catalogosInventario'
import { asignarPoligonoMapa, listarEjemplaresDePoligono, listarPoligonosMapa, listarTodasLasAreasVerdes, revisarImpactoPoligono, type ImpactoPoligono } from '@/services/api/mapaAsignaciones'
import { cargarAreasVerdesGeoJSON, type AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type { AreaVerde } from '@/types/areasVerdes'
import type { PoligonoMapaAsignado } from '@/types/mapaInventario'
import { construirIndicePoligonos, enriquecerGeoJSON, nombrePoligonoMapa, nombreUsoMapa, type TipoUsoMapa } from './clasificacionMapa'
import MapaVectorialLocal, { type PuntoEjemplar } from './MapaVectorialLocal'
import estilos from './MapaAreasVerdesPage.module.css'

type Poligono = AreasVerdesGeoJSON['features'][number]

export default function MapaAreasVerdesPage() {
  usePaginaActual('Mapa del campus', [MIGAS_INVENTARIO.areasVerdes, MIGAS_INVENTARIO.mapa])
  const sesion = useSesionActiva()
  const mapa = useConsulta('mapa-areas-verdes', cargarAreasVerdesGeoJSON)
  const asignaciones = useConsulta('mapa-poligonos', listarPoligonosMapa)
  const tiposUso = useConsulta('mapa-tipos-uso', (signal) => listarTiposUso(true, signal))
  const areas = useConsulta('mapa-inventario-areas', listarTodasLasAreasVerdes)
  const fallo = [mapa, asignaciones, tiposUso, areas].find((consulta) => consulta.estado === 'error' && !consulta.datos)

  return (
    <div className={estilos.pagina}>
      <BotonEnlace to={RUTAS_INVENTARIO.areasVerdes} className={estilos.volver}>Volver al inventario</BotonEnlace>
      {fallo?.error?.estado === 403 ? <EstadoSinAcceso /> : fallo ? (
        <EstadoError
          titulo="No pudimos cargar los datos del mapa"
          descripcion={fallo.error?.detalle ?? ''}
          onReintentar={() => {
            mapa.reintentar()
            asignaciones.reintentar()
            tiposUso.reintentar()
            areas.reintentar()
          }}
        />
      ) : mapa.datos && asignaciones.datos && tiposUso.datos && areas.datos ? (
        <MapaInventario datos={mapa.datos} asignaciones={asignaciones.datos} tiposUso={tiposUso.datos}
          areas={areas.datos} puedeEditar={puede(sesion, PERMISOS.gestionarCatalogos)}
          alGuardar={asignaciones.reintentar} />
      ) : <EstadoCarga forma="tabla" texto="Cargando mapa del campus…" />}
    </div>
  )
}

function MapaInventario({ datos, asignaciones, tiposUso, areas, puedeEditar, alGuardar }: {
  datos: AreasVerdesGeoJSON
  asignaciones: PoligonoMapaAsignado[]
  tiposUso: TipoUsoMapa[]
  areas: AreaVerde[]
  puedeEditar: boolean
  alGuardar: () => void
}) {
  const [parametros, setParametros] = useSearchParams()
  const [busqueda, setBusqueda] = useState('')
  const [uso, setUso] = useState('')
  const [panelAbierto, setPanelAbierto] = useState(true)
  const mapa = useMemo(() => enriquecerGeoJSON(datos, asignaciones), [datos, asignaciones])
  const indice = useMemo(() => construirIndicePoligonos(asignaciones), [asignaciones])
  const usos = useMemo(() => obtenerUsos(mapa, tiposUso), [mapa, tiposUso])
  const poligonoEnlace = parametros.get('poligono')
  const areaEnlace = parametros.get('area')
  const solicitado = poligonoEnlace
    ? mapa.features.find((poligono) => idPoligono(poligono) === poligonoEnlace)
    : areaEnlace ? mapa.features.find((poligono) => String(indice.get(idPoligono(poligono))?.area_verde_id) === areaEnlace) : undefined
  const seleccionado = solicitado && (!uso || nombreUsoMapa(solicitado) === uso) ? solicitado : undefined
  const vinculo = seleccionado ? indice.get(idPoligono(seleccionado)) : undefined
  const termino = normalizar(busqueda)
  const resultados = termino ? mapa.features.filter((poligono) => {
    const nombreInventario = indice.get(idPoligono(poligono))?.area_verde_nombre ?? ''
    return idPoligono(poligono) && [nombreInventario, texto(poligono.properties.Nombre)].some((nombre) => normalizar(nombre).includes(termino))
  }) : []
  const totalVisible = uso ? usos.find((tipo) => tipo.nombre === uso)?.cantidad ?? 0 : mapa.features.length

  function seleccionar(poligono: Poligono) {
    const id = idPoligono(poligono)
    if (!id) return
    if (uso && nombreUsoMapa(poligono) !== uso) setUso('')
    setParametros({ poligono: id }, { replace: true })
  }

  return (
    <>
      <div className={estilos.distribucion}>
        <div className={estilos.herramientas}>
          <CampoFormulario id="buscar-jardin-mapa" etiqueta="Buscar jardín" type="search" value={busqueda}
            placeholder="Por ejemplo, Bosque Húmedo" onChange={(evento) => setBusqueda(evento.target.value)} />
          {termino && (resultados.length ? (
            <ul className={estilos.resultados} aria-label="Jardines encontrados">
              {resultados.map((poligono) => {
                const id = idPoligono(poligono)
                const area = indice.get(id)
                const nombre = nombrePoligonoMapa(poligono)
                const superficie = area?.superficie_registrada_m2 ?? poligono.properties['Área']
                return (
                  <li key={id}>
                    <Boton variante="fantasma" aria-pressed={seleccionado === poligono} onClick={() => seleccionar(poligono)}>
                      {nombre} · {nombreUsoMapa(poligono)} · {formatearSuperficie(superficie)}
                    </Boton>
                  </li>
                )
              })}
            </ul>
          ) : <p role="status">No se encontraron jardines con ese nombre.</p>)}
          {(areaEnlace || poligonoEnlace) && !solicitado && <AvisoEnLinea tono="info">No se encontró el área en el mapa del campus.</AvisoEnLinea>}
          <Boton className={estilos.volver} variante="secundario" aria-expanded={panelAbierto} aria-controls="leyenda-mapa-campus"
            onClick={() => setPanelAbierto(!panelAbierto)}>{panelAbierto ? 'Ocultar leyenda' : 'Mostrar leyenda'}</Boton>
          <aside id="leyenda-mapa-campus" className={estilos.leyenda} hidden={!panelAbierto} aria-label="Filtrar por tipo de uso">
            <h2>Tipos de uso</h2>
            <Boton variante="fantasma" aria-pressed={!uso} onClick={() => setUso('')}>Todos los usos</Boton>
            {usos.map((tipo) => (
              <Boton key={tipo.nombre} variante="fantasma" aria-pressed={uso === tipo.nombre}
                onClick={() => setUso(uso === tipo.nombre ? '' : tipo.nombre)}>
                <svg className={estilos.muestraColor} viewBox="0 0 16 16" aria-hidden="true">
                  <rect width="16" height="16" fill={tipo.color} />
                </svg>
                {tipo.nombre} <span className={estilos.cantidad}>{tipo.cantidad}</span>
              </Boton>
            ))}
            <p className={estilos.resumen} role="status">{totalVisible} de {mapa.features.length} polígonos visibles</p>
          </aside>
        </div>
        <VistaJardin key={seleccionado ? idPoligono(seleccionado) : ''} mapa={mapa} usos={usos} uso={uso}
          seleccionado={seleccionado} vinculo={vinculo} onSeleccionar={seleccionar}
          areas={areas} puedeEditar={puedeEditar} alGuardar={alGuardar} />
      </div>
      <p className={estilos.fuente}>Geometrías del mapa proporcionado por el cliente. Fondo cartográfico local basado en OpenStreetMap © OpenStreetMap contributors.</p>
    </>
  )
}

function VistaJardin({ mapa, usos, uso, seleccionado, vinculo, onSeleccionar, areas, puedeEditar, alGuardar }: {
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
  const areaId = vinculo?.area_verde_id ?? null
  const poligonoId = seleccionado ? idPoligono(seleccionado) : ''
  const consulta = useConsulta(mostrarEjemplares && poligonoId ? 'ejemplares-mapa:' + poligonoId : null,
    (signal) => listarEjemplaresDePoligono(poligonoId, signal))
  const puntos = useMemo<(PuntoEjemplar & { nombreArea: string; avisoVinculo: string })[]>(() => {
    if (consulta.estado !== 'exito') return []
    return (consulta.datos ?? []).flatMap((ejemplar) => {
      const { latitud, longitud } = ejemplar
      if (latitud === null || longitud === null || !Number.isFinite(latitud) || !Number.isFinite(longitud)
        || Math.abs(latitud) > 90 || Math.abs(longitud) > 180) return []
      return [{
        id: ejemplar.id, codigo: ejemplar.codigo, latitud, longitud,
        nombreArea: ejemplar.area_verde_nombre ?? areas.find((area) => area.id === ejemplar.area_verde_id)?.nombre ?? '',
        avisoVinculo: ejemplar.area_verde_id == null ? 'Sin área vinculada'
          : ejemplar.area_verde_id !== areaId ? 'Vinculado a otra área' : '',
        especie: ejemplar.especie_nombre_comun ?? ejemplar.especie_nombre_cientifico ?? 'Especie sin registrar',
      }]
    })
  }, [consulta.datos, consulta.estado, areaId, areas])
  const ejemplar = puntos.length === 1 ? puntos[0] : puntos.find((punto) => punto.id === ejemplarId)

  return (
    <div className={estilos.columnaMapa}>
      <section className={estilos.panelMapa} aria-label="Mapa interactivo de áreas verdes del campus">
        <MapaVectorialLocal datos={mapa} usos={usos} usoSeleccionado={uso} seleccionado={seleccionado}
          onSeleccionar={onSeleccionar} puntos={puntos} ejemplarId={ejemplar?.id} onEjemplar={setEjemplarId} />
      </section>
      {seleccionado && (
        <div className={estilos.panelDetalle}>
          <section className={estilos.edicion} aria-label="Detalle del área seleccionada">
            <h2>{nombrePoligonoMapa(seleccionado)}</h2>
            <p>Tipo de uso · {nombreUsoMapa(seleccionado)}</p>
            <p>Origen del tipo de uso · {seleccionado.properties.origen_clasificacion === 'area-vinculada' ? 'Ficha del inventario' : 'Mapa original'}</p>
            <p>Superficie cartográfica · {formatearSuperficie(seleccionado.properties['Área'])}</p>
            {areaId !== null && (
              <>
                <p>Superficie registrada · {formatearSuperficie(vinculo?.superficie_registrada_m2)}</p>
                <BotonEnlace className={estilos.volver} variante="enlace"
                  to={`${RUTAS_INVENTARIO.areasVerdes}?${new URLSearchParams({ q: vinculo?.area_verde_nombre ?? '' })}`}>
                  Ver área en el inventario
                </BotonEnlace>
              </>
            )}
            {puedeEditar && <EditorVinculo seleccionado={seleccionado} vinculo={vinculo} areas={areas} alGuardar={() => {
              alGuardar()
              if (mostrarEjemplares) consulta.reintentar()
            }} />}
          </section>
          <section className={estilos.edicion} aria-label="Ejemplares del polígono">
            <div className={estilos.cabeceraDetalle}>
              <h2>Ejemplares</h2>
              <Boton variante="secundario" compacto aria-pressed={mostrarEjemplares}
                onClick={() => {
                  setEjemplarId(null)
                  setMostrarEjemplares(!mostrarEjemplares)
                }}>{mostrarEjemplares ? 'Ocultar ejemplares' : 'Mostrar ejemplares'}</Boton>
            </div>
            {consulta.estado === 'cargando' && <EstadoCarga forma="tabla" texto="Cargando ejemplares…" />}
            {consulta.error?.estado === 403 ? <EstadoSinAcceso /> : consulta.estado === 'error' && (
              <EstadoError titulo="No pudimos cargar los ejemplares" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
            )}
            {puntos.length > 1 && (
              <Selector id="ejemplar-mapa" etiqueta="Ejemplares con coordenadas" valor={ejemplar ? String(ejemplar.id) : ''}
                opcionTodos="Selecciona un ejemplar" onCambiar={(valor) => setEjemplarId(valor ? Number(valor) : null)}
                opciones={puntos.map((punto) => ({ valor: String(punto.id), texto: punto.codigo + ' · ' + punto.especie }))} />
            )}
            {consulta.estado === 'exito' && !puntos.length && <p role="status">No hay ejemplares ubicados dentro de este polígono.</p>}
            {ejemplar && (
              <div className={estilos.detalleEjemplar}>
                <strong>{ejemplar.codigo} · {ejemplar.especie}</strong>
                <p>{ejemplar.nombreArea || ejemplar.avisoVinculo || 'Área vinculada'}</p>
                {ejemplar.nombreArea && ejemplar.avisoVinculo && <p>{ejemplar.avisoVinculo}</p>}
                <BotonEnlace variante="secundario" compacto
                  to={`${RUTAS_INVENTARIO.ejemplares}?${new URLSearchParams({ ejemplar: ejemplar.codigo })}`}>
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

function EditorVinculo({ seleccionado, vinculo, areas, alGuardar }: {
  seleccionado: Poligono
  vinculo: PoligonoMapaAsignado | undefined
  areas: AreaVerde[]
  alGuardar: () => void
}) {
  const [borrador, setBorrador] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [impacto, setImpacto] = useState<ImpactoPoligono | null>(null)
  const [aviso, setAviso] = useState<{ tono: 'exito' | 'error'; texto: string } | null>(null)
  const vigente = String(vinculo?.area_verde_id ?? '')
  const valor = borrador ?? vigente

  async function guardar(confirmado?: ImpactoPoligono) {
    if (valor === vigente) return
    setGuardando(true)
    setAviso(null)
    try {
      const id = idPoligono(seleccionado)
      const destino = valor ? Number(valor) : null
      const revision = confirmado ?? await revisarImpactoPoligono(id, destino)
      if (revision.conflictos.length) {
        const codigos = revision.conflictos.map(({ codigo }) => codigo).join(', ')
        setAviso({ tono: 'error', texto: 'Revisa el área vinculada o la ubicación de estos ejemplares antes de guardar: ' + codigos })
        return
      }
      if (!confirmado && revision.reasignables.length) {
        setImpacto(revision)
        return
      }
      const respuesta = await asignarPoligonoMapa(id, destino, revision)
      setImpacto(null)
      setBorrador(respuesta.area_verde_id === null ? '' : String(respuesta.area_verde_id))
      setAviso({ tono: 'exito', texto: respuesta.area_verde_id ? 'Vínculo guardado.' : 'Se quitó el vínculo con el inventario.' })
      alGuardar()
    } catch (causa) {
      setImpacto(null)
      setAviso({ tono: 'error', texto: causa instanceof Error ? causa.message : 'No se pudo guardar el vínculo.' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className={estilos.filaVinculo}>
        <Selector id="area-poligono" etiqueta="Cambiar área vinculada" valor={valor} disabled={guardando}
          onCambiar={setBorrador} opcionTodos="Sin vincular"
          opciones={areas.map((area) => ({ valor: String(area.id), texto: area.nombre + ' · ' + area.lugar }))} />
        <Boton variante="secundario" cargando={guardando} deshabilitado={valor === vigente} onClick={() => void guardar()}>Guardar vínculo</Boton>
      </div>
      {aviso && <AvisoEnLinea tono={aviso.tono}>{aviso.texto}</AvisoEnLinea>}
      <DialogoConfirmacion abierto={impacto !== null} titulo="Reasignar polígono y ejemplares"
        consecuencia="Los ejemplares indicados quedarán vinculados a la nueva área y conservarán sus coordenadas."
        textoConfirmar="Confirmar reasignación" cargando={guardando}
        onConfirmar={() => { if (impacto) void guardar(impacto) }}
        onCancelar={() => setImpacto(null)}>
        {impacto && <ul>{impacto.reasignables.map(({ id, codigo }) => <li key={id}>{codigo}</li>)}</ul>}
      </DialogoConfirmacion>
    </>
  )
}

function obtenerUsos(mapa: AreasVerdesGeoJSON, tiposUso: TipoUsoMapa[]) {
  const grupos = new Map<string, number>()
  const colores = new Map(tiposUso.map((tipo) => [tipo.nombre.toLocaleLowerCase('es'), tipo.color]))
  for (const poligono of mapa.features) {
    const nombre = nombreUsoMapa(poligono)
    grupos.set(nombre, (grupos.get(nombre) ?? 0) + 1)
  }
  return [...grupos].map(([nombre, cantidad]) => ({
    nombre,
    cantidad,
    color: colores.get(nombre.toLocaleLowerCase('es')) ?? 'var(--color-text-secondary)',
  })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

function idPoligono(poligono: Poligono) {
  return texto(poligono.properties.mapa_id)
}

function texto(valor: string | number | null | undefined) {
  return valor == null ? '' : String(valor).trim()
}

function normalizar(valor: string) {
  return valor.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es').trim()
}

function formatearSuperficie(valor: string | number | null | undefined) {
  const superficie = texto(valor)
  return superficie && Number.isFinite(Number(superficie))
    ? new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(Number(superficie)) + ' m²'
    : 'Sin dato'
}
