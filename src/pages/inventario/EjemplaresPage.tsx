import { useEffect, useRef, useState, type FormEvent } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import Pestanas from '@/components/ui/Pestanas'
import Adjuntos from '@/components/core/Adjuntos'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Selector from '@/components/ui/Selector'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import ExportarExcel from '@/components/core/ExportarExcel'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_INVENTARIO } from '@/router/rutasApp'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { PERMISOS, puede } from '@/config/permisosCore'
import { EJEMPLARES_POR_PAGINA, cambiarEspecie, crearEjemplar, crearEspecie, guardarAlturaEjemplar, listarEjemplares, listarEspecies, quitarPlacaAntigua, vincularEjemplarConArea } from '@/services/api/ejemplares'
import { listarTodasLasAreasVerdes } from '@/services/api/mapaAsignaciones'
import type { EjemplarInventario, EspecieVegetal } from '@/types/ejemplares'
import SelectorPuntoMapa from './SelectorPuntoMapa'
import EditarUbicacionEjemplar from './EditarUbicacionEjemplar'
import ValidacionUbicacion from './ValidacionUbicacion'
import { useUbicacionEnMapa } from './useUbicacionEnMapa'
import FotoEjemplar from './FotoEjemplar'
import HistorialEjemplar from './HistorialEjemplar'
import SituacionEjemplar, { EtiquetaSituacionEjemplar } from './SituacionEjemplar'
import estilos from './Catalogos.module.css'
import estilosMapa from './MapaAreasVerdesPage.module.css'

const PESTANAS = [{ valor: 'ejemplares', texto: 'Ejemplares' }, { valor: 'especies', texto: 'Especies' }]

function nombreEspecie(especie: EspecieVegetal) {
  return especie.nombre_comun?.trim() || especie.nombre_cientifico?.trim() || 'Especie sin nombre'
}

function normalizarBusqueda(texto: string) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').trim()
}

async function listarPaginaDeEspecie(especie: EspecieVegetal, termino: string, pagina: number, signal: AbortSignal) {
  const consulta = termino || especie.nombre_cientifico?.trim() || especie.nombre_comun?.trim() || ''
  const desde = (pagina - 1) * EJEMPLARES_POR_PAGINA
  const ejemplares: EjemplarInventario[] = []
  let coincidencias = 0

  // La API filtra por texto. El identificador permite distinguir especies con nombres similares.
  for (let paginaApi = 1; ; paginaApi++) {
    const lote = await listarEjemplares(consulta, paginaApi, signal)
    for (const ejemplar of lote) {
      if (ejemplar.especie_id !== especie.id) continue
      if (coincidencias++ < desde) continue
      if (ejemplares.length === EJEMPLARES_POR_PAGINA) return { ejemplares, haySiguiente: true }
      ejemplares.push(ejemplar)
    }
    if (lote.length < EJEMPLARES_POR_PAGINA) return { ejemplares, haySiguiente: false }
  }
}

export default function EjemplaresPage() {
  usePaginaActual('Ejemplares y especies', [MIGAS_INVENTARIO.areasVerdes, { texto: 'Ejemplares y especies' }])
  const sesion = useSesionActiva()
  const puedeRegistrar = puede(sesion, PERMISOS.registrarInventario)
  const puedeGestionar = puede(sesion, PERMISOS.gestionarCatalogos)
  const [pestana, setPestana] = useState('ejemplares')
  const [busquedaEspecie, setBusquedaEspecie] = useState('')
  const [estadoEspecie, setEstadoEspecie] = useState('activas')
  const [especieFiltrada, setEspecieFiltrada] = useState<EspecieVegetal | null>(null)
  const [vista, setVista] = useState<'lista' | 'galeria'>('lista')
  const [alta, setAlta] = useState<'ejemplar' | 'especie' | null>(null)
  const [pagina, setPagina] = useState(1)
  const [revisionFotos, setRevisionFotos] = useState<Record<number, number>>({})
  const [busqueda, setBusqueda] = useState('')
  const [terminoBusqueda, setTerminoBusqueda] = useState('')
  const [ejemplarSeleccionadoId, setEjemplarSeleccionadoId] = useState<number | null>(null)
  const ficha = useRef<HTMLDivElement>(null)
  const botonFicha = useRef<HTMLButtonElement>(null)
  const [alturaFicha, setAlturaFicha] = useState('')
  const claveListado = `ejemplares-inventario|${pagina}|${especieFiltrada?.id ?? ""}|${terminoBusqueda}`
  const consulta = useConsulta(pestana === 'ejemplares' ? claveListado : null, async (signal) => {
    if (especieFiltrada) {
      const resultado = await listarPaginaDeEspecie(especieFiltrada, terminoBusqueda, pagina, signal)
      return { clave: claveListado, ...resultado }
    }
    const ejemplares = await listarEjemplares(terminoBusqueda, pagina, signal)
    const haySiguiente = ejemplares.length === EJEMPLARES_POR_PAGINA
      && (await listarEjemplares(terminoBusqueda, pagina + 1, signal)).length > 0
    return { clave: claveListado, ejemplares, haySiguiente }
  })
  const listado = consulta.datos?.clave === claveListado ? consulta.datos : null
  const ejemplarSeleccionado = listado?.ejemplares.find((ejemplar) => ejemplar.id === ejemplarSeleccionadoId)
  const alturaGuardada = ejemplarSeleccionado?.altura_total_m ?? null
  const alturaSinGuardar = alturaFicha !== '' && Number(alturaFicha) !== alturaGuardada

  useEffect(() => {
    if (ejemplarSeleccionadoId !== null) ficha.current?.focus()
  }, [ejemplarSeleccionadoId])

  function abrirFicha(ejemplar: EjemplarInventario, boton: HTMLButtonElement) {
    botonFicha.current = boton
    if (ejemplarSeleccionadoId === ejemplar.id) {
      ficha.current?.focus()
      return
    }
    setEjemplarSeleccionadoId(ejemplar.id)
    setAreaFicha(String(ejemplar.area_verde_id ?? ''))
    setAlturaFicha(String(ejemplar.altura_total_m ?? ''))
  }

  function cerrarFicha() {
    setEjemplarSeleccionadoId(null)
    botonFicha.current?.focus()
  }

  const especies = useConsulta(`especies-inventario|${puedeGestionar}`, (signal) => listarEspecies(puedeGestionar, signal))
  const especiesActivas = especies.datos?.filter((especie) => especie.activo)
  const terminoEspecie = normalizarBusqueda(busquedaEspecie)
  const especiesVisibles = especies.datos?.filter((especie) => {
    if (!puedeGestionar || estadoEspecie !== 'todas') {
      if (especie.activo !== (!puedeGestionar || estadoEspecie === 'activas')) return false
    }
    return [especie.nombre_comun, especie.nombre_cientifico]
      .some((nombre) => normalizarBusqueda(nombre ?? '').includes(terminoEspecie))
  })
  const areas = useConsulta(puedeRegistrar ? 'ejemplares-areas-verdes' : null, listarTodasLasAreasVerdes)
  const opcionesAreas = (areas.datos ?? []).map((area) => ({ valor: String(area.id), texto: `${area.nombre} · ${area.lugar}` }))
  const [areaId, setAreaId] = useState('')
  const [areaFicha, setAreaFicha] = useState('')
  const [mapaAbierto, setMapaAbierto] = useState(false)
  const [codigoPlaca, setCodigoPlaca] = useState('')
  const [especieId, setEspecieId] = useState('')
  const [vegetacion, setVegetacion] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [latitud, setLatitud] = useState('')
  const [longitud, setLongitud] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [nombreComun, setNombreComun] = useState('')
  const [nombreCientifico, setNombreCientifico] = useState('')
  const [formaBiologica, setFormaBiologica] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const ubicacionAlta = useUbicacionEnMapa(latitud, longitud, areaId, true)
  const cambioArea = Boolean(areaFicha && Number(areaFicha) !== ejemplarSeleccionado?.area_verde_id)
  const areaPorComprobar = cambioArea ? areaFicha : String(ejemplarSeleccionado?.area_verde_id ?? '')
  const ubicacionVinculo = useUbicacionEnMapa(
    areaPorComprobar ? String(ejemplarSeleccionado?.latitud ?? '') : '',
    areaPorComprobar ? String(ejemplarSeleccionado?.longitud ?? '') : '',
    areaPorComprobar,
  )

  async function ejecutar(accion: () => Promise<unknown>, mensaje: string) {
    setError(null)
    setAviso(null)
    setGuardando(true)
    try {
      await accion()
      setAviso(mensaje)
      await Promise.all([consulta.reintentar(), especies.reintentar()])
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el cambio.')
    } finally {
      setGuardando(false)
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>, accion: () => Promise<unknown>, mensaje: string) {
    evento.preventDefault()
    void ejecutar(accion, mensaje)
  }

  function buscar(termino: string) {
    setBusqueda(termino)
    setTerminoBusqueda(termino.trim())
    cambiarPagina(1)
  }

  function verEjemplaresDeEspecie(especie: EspecieVegetal) {
    setEspecieFiltrada(especie)
    setPestana('ejemplares')
    buscar('')
  }

  function cambiarPagina(nuevaPagina: number) {
    setEjemplarSeleccionadoId(null)
    setPagina(nuevaPagina)
  }

  function cerrarAlta() {
    if (alta === 'ejemplar') {
      setCodigoPlaca('')
      setEspecieId('')
      setVegetacion('')
      setUbicacion('')
      setAreaId('')
      setLatitud('')
      setLongitud('')
      setCantidad('1')
      setMapaAbierto(false)
    } else {
      setNombreComun('')
      setNombreCientifico('')
      setFormaBiologica('')
    }
    setAlta(null)
    setError(null)
  }

  function guardarEjemplar() {
    if (Boolean(latitud) !== Boolean(longitud) || Math.abs(Number(latitud)) > 90 || Math.abs(Number(longitud)) > 180) {
      setError('Indica una latitud y una longitud válidas, o deja ambas vacías.')
      return
    }
    void ejecutar(async () => {
      const creado = await crearEjemplar({
        codigo_placa_antigua: codigoPlaca.trim() || null,
        especie_id: especieId ? Number(especieId) : null,
        tipo_vegetacion: vegetacion.trim() || null,
        ubicacion: ubicacion.trim() || null,
        latitud: latitud || null,
        longitud: longitud || null,
        cantidad: Number(cantidad),
        area_verde_id: ubicacionAlta.area ? Number(ubicacionAlta.area) : null,
      })
      cerrarAlta()
      setEspecieFiltrada(null)
      buscar(creado.codigo)
    }, 'Ejemplar registrado. Abre su ficha para añadir una foto.')
  }

  function guardarEspecie() {
    void ejecutar(async () => {
      await crearEspecie({
        nombre_comun: nombreComun.trim(),
        nombre_cientifico: nombreCientifico.trim(),
        forma_biologica: formaBiologica.trim(),
      })
      cerrarAlta()
    }, 'Especie añadida al catálogo.')
  }

  const errorAlta = error ? { titulo: 'No se pudo guardar', detalle: error } : null

  return (
    <div className={estilos.pagina}>
      <AccionesPagina>
        <ExportarExcel listado="ejemplares" />
      </AccionesPagina>
      <p className={estilos.descripcion}>Consulta la ficha de cada ejemplar o búscalo por código o placa antigua.</p>
      {error && !alta && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
      {aviso && <AvisoEnLinea tono="exito">{aviso}</AvisoEnLinea>}

      {puedeRegistrar && (
        <DialogoFormulario abierto={alta === 'ejemplar'} titulo="Registrar ejemplar" ancho="amplio"
          descripcion="El código interno se genera al guardar. Después puedes adjuntar una foto en la ficha."
          textoConfirmar="Registrar ejemplar" enviando={guardando} error={errorAlta}
          hayCambios={Boolean(codigoPlaca || especieId || vegetacion || ubicacion || areaId || latitud || longitud || cantidad !== '1')}
          envioDeshabilitado={!Number.isInteger(Number(cantidad)) || Number(cantidad) < 1
            || ubicacionAlta.cargando || ubicacionAlta.fuera || ubicacionAlta.ambiguo}
          onCerrar={cerrarAlta} onEnviar={guardarEjemplar}>
          {especies.estado === 'error' && <EstadoError titulo="No se pudieron cargar las especies" descripcion={especies.error?.detalle ?? ''} onReintentar={especies.reintentar} nivel={3} />}
          {areas.estado === 'error' && <EstadoError titulo="No se pudieron cargar las áreas verdes" descripcion={areas.error?.detalle ?? ''} onReintentar={areas.reintentar} nivel={3} />}
          <div className={estilosMapa.distribucionFormulario}>
            <div className={estilos.formulario}>
              <CampoFormulario id="placa-antigua" etiqueta="Placa de aluminio antigua (opcional)" value={codigoPlaca} onChange={(evento) => setCodigoPlaca(evento.target.value)} maxLength={80} />
              {especiesActivas && <Selector id="especie-ejemplar" etiqueta="Especie" valor={especieId} onCambiar={setEspecieId} opcionTodos="Sin especie asignada" opciones={especiesActivas.map((especie) => ({ valor: String(especie.id), texto: `${especie.nombre_comun ?? especie.nombre_cientifico ?? 'Sin nombre'}${especie.nombre_cientifico ? ` · ${especie.nombre_cientifico}` : ''}` }))} />}
              <CampoFormulario id="vegetacion-ejemplar" etiqueta="Tipo de vegetación" value={vegetacion} onChange={(evento) => setVegetacion(evento.target.value)} maxLength={80} />
              <CampoFormulario id="ubicacion-ejemplar" etiqueta="Ubicación" value={ubicacion} onChange={(evento) => setUbicacion(evento.target.value)} maxLength={200} />
              <Selector id="area-verde-ejemplar" etiqueta="Área verde" valor={ubicacionAlta.area} onCambiar={setAreaId}
                disabled={!areas.datos} opcionTodos="Sin área vinculada" opciones={opcionesAreas} />
              <ValidacionUbicacion ubicacion={ubicacionAlta} />
              <Boton variante="secundario" aria-expanded={mapaAbierto} aria-controls="mapa-alta-ejemplar" onClick={() => setMapaAbierto(!mapaAbierto)}>
                {mapaAbierto ? 'Ocultar mapa' : 'Elegir ubicación en el mapa'}
              </Boton>
              {latitud && longitud && <p role="status" className={estilos.descripcion}>Ubicación marcada.</p>}
              <details>
                <summary>Introducir coordenadas manualmente</summary>
                <div className={estilos.coordenadas}>
                  <CampoFormulario id="latitud-ejemplar" etiqueta="Latitud" type="number" min="-90" max="90" step="any" value={latitud} onChange={(evento) => setLatitud(evento.target.value)} />
                  <CampoFormulario id="longitud-ejemplar" etiqueta="Longitud" type="number" min="-180" max="180" step="any" value={longitud} onChange={(evento) => setLongitud(evento.target.value)} />
                </div>
              </details>
              <CampoFormulario id="cantidad-ejemplar" etiqueta="Cantidad" type="number" min="1" step="1" value={cantidad} onChange={(evento) => setCantidad(evento.target.value)} required />
            </div>
            <div id="mapa-alta-ejemplar" className={estilosMapa.mapaFormulario} hidden={!mapaAbierto}>
              {mapaAbierto && <SelectorPuntoMapa areaId={areaId ? Number(areaId) : null} latitud={latitud} longitud={longitud}
                onElegir={(nuevaLatitud, nuevaLongitud) => {
                  setLatitud(nuevaLatitud.toFixed(7))
                  setLongitud(nuevaLongitud.toFixed(7))
                }} />}
            </div>
          </div>
        </DialogoFormulario>
      )}
      {puedeGestionar && (
        <DialogoFormulario abierto={alta === 'especie'} titulo="Añadir especie"
          textoConfirmar="Añadir especie" enviando={guardando} error={errorAlta}
          hayCambios={Boolean(nombreComun || nombreCientifico || formaBiologica)}
          envioDeshabilitado={!nombreComun.trim() || !nombreCientifico.trim() || !formaBiologica.trim()}
          onCerrar={cerrarAlta} onEnviar={guardarEspecie}>
          <div className={estilos.formulario}>
            <CampoFormulario id="nombre-comun-especie" etiqueta="Nombre común" value={nombreComun} onChange={(evento) => setNombreComun(evento.target.value)} maxLength={150} required />
            <CampoFormulario id="nombre-cientifico-especie" etiqueta="Nombre científico" value={nombreCientifico} onChange={(evento) => setNombreCientifico(evento.target.value)} maxLength={200} required />
            <CampoFormulario id="forma-biologica-especie" etiqueta="Forma biológica" value={formaBiologica} onChange={(evento) => setFormaBiologica(evento.target.value)} maxLength={80} required />
          </div>
        </DialogoFormulario>
      )}

      <Pestanas etiqueta="Catastro del campus" pestanas={PESTANAS} valor={pestana}
        onCambiar={(valor) => {
          setPestana(valor)
          setEjemplarSeleccionadoId(null)
        }}
        derecha={pestana === 'ejemplares'
          ? puedeRegistrar && <Boton onClick={() => { setError(null); setAlta('ejemplar') }}>Registrar ejemplar</Boton>
          : puedeGestionar && <Boton onClick={() => { setError(null); setAlta('especie') }}>Añadir especie</Boton>}
      >
        {pestana === 'especies' ? (
          <Tarjeta titulo="Catálogo de especies" relleno="amplio">
            <div className={estilos.alta}>
              <CampoFormulario id="buscar-especies" etiqueta="Buscar especie" type="search"
                placeholder="Nombre común o científico" value={busquedaEspecie}
                onChange={(evento) => setBusquedaEspecie(evento.target.value)} />
              {puedeGestionar && <Selector id="estado-especie" etiqueta="Estado"
                valor={estadoEspecie} onCambiar={setEstadoEspecie}
                opciones={[{ valor: 'activas', texto: 'Activas' }, { valor: 'inactivas', texto: 'Inactivas' }, { valor: 'todas', texto: 'Todas' }]} />}
            </div>
            {especies.error?.estado === 403 ? <EstadoSinAcceso nivel={3} />
              : especies.estado === 'error' ? <EstadoError titulo="No se pudieron cargar las especies" descripcion={especies.error?.detalle ?? ''} onReintentar={especies.reintentar} nivel={3} />
                : !especiesVisibles ? <EstadoCarga forma="tabla" texto="Cargando especies…" retrasar />
                  : especiesVisibles.length === 0 ? <EstadoVacio titulo="Sin especies para esta búsqueda" descripcion="Prueba con otro nombre o cambia el filtro de estado." nivel={3} />
                    : (
                      <>
                        <p className={estilos.descripcion} role="status">{especiesVisibles.length} {especiesVisibles.length === 1 ? 'especie' : 'especies'}</p>
                        <ul className={estilos.lista}>
                          {especiesVisibles.map((especie) => (
                            <li className={estilos.fila} key={especie.id}>
                              <dl className={estilos.datosEspecie}>
                                <div>
                                  <dt>Nombre común</dt>
                                  <dd><strong>{especie.nombre_comun?.trim() || 'Sin registrar'}</strong></dd>
                                </div>
                                <div>
                                  <dt>Nombre científico</dt>
                                  <dd>{especie.nombre_cientifico?.trim() ? <i>{especie.nombre_cientifico}</i> : 'Sin registrar'}</dd>
                                </div>
                                <div>
                                  <dt>Forma biológica</dt>
                                  <dd>{especie.forma_biologica?.trim()
                                    ? <Estado tono="neutro" punto={false} texto={especie.forma_biologica} /> : 'Sin registrar'}</dd>
                                </div>
                              </dl>
                              <div className={estilos.accionesFila}>
                                {!especie.activo && <Estado tono="neutro" texto="Inactiva" />}
                                <Boton variante="secundario" compacto aria-label={`Ver ejemplares de ${nombreEspecie(especie)}`}
                                  onClick={() => verEjemplaresDeEspecie(especie)}>Ver ejemplares</Boton>
                                {puedeGestionar && especie.activo && <Boton variante="fantasma" compacto deshabilitado={guardando}
                                  onClick={() => void ejecutar(() => cambiarEspecie(especie.id, { activo: false }), 'Especie desactivada.')}>Desactivar</Boton>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
          </Tarjeta>
        ) : (
          <div className={estilos.pagina}>
            <Tarjeta titulo="Buscar ejemplares" relleno="amplio">
              <p className={estilos.descripcion}>Busca por código nuevo o placa antigua; las placas repetidas muestran cada ejemplar por separado.</p>
              <form className={estilos.alta} role="search" aria-label="Buscar ejemplares" onSubmit={(evento) => { evento.preventDefault(); buscar(busqueda) }}>
                <CampoFormulario id="buscar-ejemplares" etiqueta="Código nuevo o placa antigua" type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
                <Boton type="submit" variante="secundario">Buscar</Boton>
              </form>
              {especieFiltrada && (
                <div className={estilos.accionesFila}>
                  <Estado tono="info" punto={false} texto={`Especie: ${nombreEspecie(especieFiltrada)}`} />
                  <Boton variante="fantasma" compacto onClick={() => {
                    setEspecieFiltrada(null)
                    cambiarPagina(1)
                  }}>Quitar filtro de especie</Boton>
                </div>
              )}
            </Tarjeta>

            <Tarjeta
              titulo={terminoBusqueda || especieFiltrada ? 'Coincidencias' : 'Ejemplares'}
              relleno="amplio"
              acciones={<>
                {terminoBusqueda && <Boton variante="fantasma" onClick={() => buscar('')}>Limpiar búsqueda</Boton>}
                <div className={estilos.accionesFila} role="group" aria-label="Vista de ejemplares">
                  <Boton variante="secundario" aria-pressed={vista === 'lista'} onClick={() => setVista('lista')}>Lista</Boton>
                  <Boton variante="secundario" aria-pressed={vista === 'galeria'} onClick={() => setVista('galeria')}>Galería</Boton>
                </div>
              </>}
            >
              {consulta.error?.estado === 403 ? <EstadoSinAcceso nivel={3} />
                : consulta.estado === 'error' ? <EstadoError titulo="No pudimos cargar los ejemplares" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} nivel={3} />
                  : !listado ? <EstadoCarga forma="tabla" texto="Cargando ejemplares…" retrasar />
                    : listado.ejemplares.length === 0 ? (
                terminoBusqueda || especieFiltrada
                  ? <EstadoVacio titulo="Sin coincidencias" descripcion={especieFiltrada ? 'No hay ejemplares de esta especie que coincidan con la búsqueda.' : 'No se encontró un ejemplar. Comprueba el código o la placa.'} nivel={3} />
                  : <EstadoVacio titulo="Aún no hay ejemplares" descripcion="Los ejemplares registrados aparecerán aquí." nivel={3} />
              ) : (
                <ul className={vista === 'galeria' ? estilos.galeria : estilos.lista}>
                  {listado.ejemplares.map((ejemplar) => {
                    const datosEspecie = [ejemplar.especie_nombre_cientifico, ejemplar.especie_forma_biologica ?? ejemplar.tipo_vegetacion].filter(Boolean).join(' · ')
                    const datosIdentificacion = [
                      ejemplar.referencia_catastro?.trim() && `Referencia de catastro: ${ejemplar.referencia_catastro}`,
                      ejemplar.codigo_catastro?.trim() && `Código de catastro: ${ejemplar.codigo_catastro}`,
                      ejemplar.codigo_placa_antigua?.trim() && `Placa antigua: ${ejemplar.codigo_placa_antigua}`,
                    ].filter(Boolean).join(' · ')
                    return (
                      <li className={vista === 'galeria' ? estilos.tarjetaGaleria : estilos.fila} key={ejemplar.id}>
                        {vista === 'galeria' && <FotoEjemplar ejemplar={ejemplar} revision={revisionFotos[ejemplar.id] ?? 0} miniatura />}
                        <div>
                          <strong>{ejemplar.codigo}</strong> · {ejemplar.especie_nombre_comun ?? 'Especie sin asignar'}
                          {datosEspecie && <div className={estilos.detalle}>{datosEspecie}</div>}
                          {datosIdentificacion && <div className={estilos.detalle}>{datosIdentificacion}</div>}
                          <div className={estilos.detalle}>{ejemplar.ubicacion ?? 'Sin ubicación'}{ejemplar.latitud !== null && ejemplar.longitud !== null ? ` · ${ejemplar.latitud}, ${ejemplar.longitud}` : ''}</div>
                          {ejemplar.advertencia_placa_repetida && <div className={estilos.avisoFila}><AvisoEnLinea tono="advertencia">Aviso: esta placa antigua también figura en otro ejemplar.</AvisoEnLinea></div>}
                        </div>
                        <div className={estilos.accionesFila}>
                          {!terminoBusqueda && puedeRegistrar && ejemplar.codigo_placa_antigua && <Boton variante="fantasma" compacto deshabilitado={guardando} onClick={() => void ejecutar(() => quitarPlacaAntigua(ejemplar.id), 'Placa antigua quitada.')}>Quitar placa</Boton>}
                          <Boton variante="secundario" compacto aria-label={`Abrir ficha de ${ejemplar.codigo}`}
                            aria-expanded={ejemplarSeleccionadoId === ejemplar.id}
                            onClick={(evento) => abrirFicha(ejemplar, evento.currentTarget)}>Abrir ficha</Boton>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              {(pagina > 1 || listado?.haySiguiente) && (
                <nav aria-label="Paginación de ejemplares" className={estilos.cabeceraSeccionFicha}>
                  <span role="status">Página {pagina}</span>
                  <div className={estilos.accionesFila}>
                    <Boton variante="secundario" deshabilitado={pagina <= 1} onClick={() => cambiarPagina(pagina - 1)}>Anterior</Boton>
                    <Boton variante="secundario" deshabilitado={!listado?.haySiguiente || consulta.estado === 'error'} onClick={() => cambiarPagina(pagina + 1)}>Siguiente</Boton>
                  </div>
                </nav>
              )}
            </Tarjeta>

            {ejemplarSeleccionado && (
              <div ref={ficha} tabIndex={-1} role="group" aria-label={`Ficha de ${ejemplarSeleccionado.codigo}`}>
                <Tarjeta
                  titulo={`${ejemplarSeleccionado.especie_nombre_comun ?? 'Ejemplar'} · ${ejemplarSeleccionado.codigo}`}
                  descripcion={ejemplarSeleccionado.ubicacion ?? 'Sin ubicación registrada'}
                  junto={<EtiquetaSituacionEjemplar situacion={ejemplarSeleccionado.situacion} />}
                  acciones={<Boton variante="fantasma" compacto onClick={cerrarFicha}>Cerrar ficha</Boton>}
                  className={estilos.tarjetaFicha}
                  relleno="amplio"
                >
                  <div className={estilos.seccionesFicha}>
                    <section className={estilos.seccionFicha} aria-labelledby="identificacion-ejemplar">
                      <h3 id="identificacion-ejemplar">Identificación y ubicación</h3>
                      <dl className={estilos.ficha}>
                        {ejemplarSeleccionado.especie_nombre_cientifico && <><dt>Nombre científico</dt><dd>{ejemplarSeleccionado.especie_nombre_cientifico}</dd></>}
                        {ejemplarSeleccionado.codigo_placa_antigua && <><dt>Placa antigua</dt><dd>{ejemplarSeleccionado.codigo_placa_antigua}</dd></>}
                        {ejemplarSeleccionado.referencia_catastro?.trim() && <><dt>Referencia de catastro</dt><dd>{ejemplarSeleccionado.referencia_catastro}</dd></>}
                        {ejemplarSeleccionado.codigo_catastro?.trim() && <><dt>Código de catastro</dt><dd>{ejemplarSeleccionado.codigo_catastro}</dd></>}
                        <dt>Área verde</dt><dd>{ejemplarSeleccionado.area_verde_id === null ? 'Sin área vinculada'
                          : opcionesAreas.find((area) => area.valor === String(ejemplarSeleccionado.area_verde_id))?.texto ?? 'Área vinculada'}</dd>
                        <dt>Coordenadas</dt><dd>{ejemplarSeleccionado.latitud !== null && ejemplarSeleccionado.longitud !== null ? `${ejemplarSeleccionado.latitud}, ${ejemplarSeleccionado.longitud}` : 'Sin coordenadas'}</dd>
                      </dl>
                      {puedeRegistrar && <EditarUbicacionEjemplar key={ejemplarSeleccionado.id}
                        ejemplar={ejemplarSeleccionado} areas={opcionesAreas} alGuardar={(actualizado) => {
                          setAreaFicha(String(actualizado.area_verde_id ?? ''))
                          setAviso('Ubicación actualizada.')
                          consulta.reintentar()
                        }} />}
                      {puedeRegistrar && areas.datos && (
                        <div className={estilos.alta}>
                          <Selector id="area-ficha-ejemplar" etiqueta="Área verde del ejemplar" valor={areaFicha} onCambiar={setAreaFicha}
                            opcionTodos="Selecciona un área verde" opciones={opcionesAreas} disabled={guardando} />
                          <Boton variante="secundario" deshabilitado={guardando || !cambioArea || ubicacionVinculo.fuera || ubicacionVinculo.cargando}
                            onClick={() => void ejecutar(() => vincularEjemplarConArea(ejemplarSeleccionado.id, Number(areaFicha)), 'Área vinculada al ejemplar.')}>
                            Guardar vínculo
                          </Boton>
                        </div>
                      )}
                      {areaPorComprobar && <ValidacionUbicacion ubicacion={ubicacionVinculo} guardada={!cambioArea} />}
                    </section>
                    <section className={estilos.seccionFicha} aria-labelledby="medicion-ejemplar">
                      <h3 id="medicion-ejemplar">Altura y sugerencia de poda</h3>
                      <dl className={estilos.ficha}>
                        <dt>Altura guardada</dt><dd>{alturaGuardada === null ? 'Pendiente de medir' : `${alturaGuardada} m`}</dd>
                        <dt>Sugerencia de poda</dt><dd>{alturaGuardada === null
                          ? 'Pendiente de medir la altura'
                          : alturaGuardada < 5 ? 'Poda menor · menos de 5 m' : 'Poda de altura mediante proveedor · 5 m o más'}</dd>
                      </dl>
                      {puedeRegistrar && (
                        <form className={estilos.alta} onSubmit={(evento) => enviar(evento,
                          () => guardarAlturaEjemplar(ejemplarSeleccionado.id, Number(alturaFicha)), 'Altura actualizada.')}>
                          <CampoFormulario id="altura-ficha-ejemplar" etiqueta="Altura total (m)" type="number"
                            min="0.01" max="9999.99" step="0.01" required value={alturaFicha}
                            onChange={(evento) => setAlturaFicha(evento.target.value)} />
                          <Boton type="submit" variante="secundario" deshabilitado={guardando || !alturaSinGuardar}>Guardar altura</Boton>
                        </form>
                      )}
                      {alturaSinGuardar && <p className={estilos.descripcion} role="status">Altura sin guardar. La sugerencia se actualiza al guardar.</p>}
                    </section>
                  </div>
                  <section key={`fotos-${ejemplarSeleccionado.id}`} className={estilos.seccionFicha} aria-labelledby="foto-del-ejemplar">
                    <h3 id="foto-del-ejemplar">Fotografía del ejemplar</h3>
                    <FotoEjemplar ejemplar={ejemplarSeleccionado} revision={revisionFotos[ejemplarSeleccionado.id] ?? 0} />
                    <Adjuntos entidad="ejemplar" registroId={ejemplarSeleccionado.id} presentacion="foto"
                      puedeAdjuntar={puedeRegistrar} tiposAceptados=".jpg,.jpeg,.png" ayudaCarga="Fotografías JPEG o PNG, de hasta 20 MB."
                      prepararArchivo={(archivo) => archivo.type === 'image/jpeg' || archivo.type === 'image/png'
                        ? Promise.resolve(archivo) : Promise.reject(new Error('Selecciona una fotografía JPEG o PNG.'))}
                      onCambio={() => setRevisionFotos((actual) => ({
                        ...actual, [ejemplarSeleccionado.id]: (actual[ejemplarSeleccionado.id] ?? 0) + 1,
                      }))} />
                  </section>
                  <SituacionEjemplar key={`situacion-${ejemplarSeleccionado.id}`} ejemplar={ejemplarSeleccionado}
                    editable={puedeGestionar} areas={opcionesAreas}
                    alGuardar={(actualizado) => {
                      setAreaFicha(String(actualizado.area_verde_id ?? ''))
                      consulta.reintentar()
                    }} />
                  <HistorialEjemplar key={ejemplarSeleccionado.id} ejemplarId={ejemplarSeleccionado.id} />
                </Tarjeta>
              </div>
            )}
          </div>
        )}
      </Pestanas>
    </div>
  )
}
