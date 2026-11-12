// RF-REP-007 · HU-MOD06-003 · CU-MOD06-003 (sin CP)
/**
 * Mapa de atenciones de mantenimiento, poda y control fitosanitario del periodo (Guía Web 5.8 y 6.1, patrón
 * «Mapa con capas»; mockup, pantallas 2 y 3 solo como referencia de composición).
 *
 * - Atenciones tercerizadas (MOD-05) y actividades del personal propio (MOD-04) de mantenimiento, poda y manejo
 *   fitosanitario; la modalidad se ve en la lista y en el resumen.
 * - Filtros (criterio 1 y v2): periodo, tipo de atención, tipo de uso (catálogo de MOD-02, en el panel de capas),
 *   espacio, tipo de servicio (actividad), estado (solo atenciones realizadas), modalidad y nivel de riesgo.
 * - Mapa con MapLibre (cargado aparte), con los espacios coloreados por su tipo de uso, panel de capas con totales y
 *   resumen de la selección, y lista.
 * - A1: lo que no tiene coordenadas no se dibuja, pero está en la lista (ordenable por espacio) y se puede filtrar
 *   por el nombre del espacio. Si nada tiene ubicación, no se carga MapLibre y se avisa.
 * - A2: sin atenciones, el mapa sigue visible y un aviso lo informa (por eso no se usa `PlantillaReporte`, que
 *   sustituye todo el contenido).
 * - E1: si el mapa falla, se avisa y se sigue con la lista, con «Reintentar mapa».
 * - Móvil: filtros a todo el ancho, mapa más bajo y la lista como fichas (ListaAtencionesMovil).
 *
 * Supuestos (pendientes de confirmar): periodo predeterminado = semana actual; mismo símbolo para los tres tipos
 * de atención; marcador de un área en el centro de su caja.
 */
import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import { ChipsFiltrosActivos, type FiltroActivo } from '@/components/ui/ChipsFiltro'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import FiltroPeriodo from '@/components/ui/FiltroPeriodo'
import IndicadorActualizacion from '@/components/ui/IndicadorActualizacion'
import Selector, { OPCION_TODOS, type OpcionSelector } from '@/components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import AyudaEmergente from '@/components/reportes-indicadores/AyudaEmergente'
import SelectoresFiltroGestion, {
  type CampoFiltroGestion,
} from '@/components/reportes-indicadores/SelectoresFiltroGestion'
import { useCatalogosFiltros } from '@/components/reportes-indicadores/useCatalogosFiltros'
import { useEsMovil } from '@/components/reportes-indicadores/useEsMovil'
import { useConsulta } from '@/hooks/useConsulta'
import { useFiltrosUrl } from '@/hooks/useFiltrosUrl'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS, rutaDetalleAtencion } from '@/router/rutasApp'
import { listarTiposUso } from '@/services/api/catalogosInventario'
import { obtenerMapaAtenciones } from '@/services/api/reportesGestion'
import type { ResultadoMapaAtenciones, TipoAtencion } from '@/types/reportesGestion'
import { OPCIONES_MODALIDAD } from '@/utils/estados'
import { formatearFecha, formatearFechaHora, semanaActual, SIN_VALOR } from '@/utils/formato'
import {
  aConsultaMapa,
  esAtencionTercerizada,
  limitesDeElementos,
  prepararMapa,
  soloTiposVisibles,
  type ClaveFiltroMapa,
  type FilaMapa,
  type Limites,
} from '@/utils/mapaAtenciones'
import { ESTADOS_FILTRO_MAPA, insigniaEstadoAtencion, TIPOS_ATENCION } from '@/utils/reportesGestion'
import { erroresDePeriodo } from '../reportes/erroresPeriodo'
import estilosReportes from '../reportes/Reportes.module.css'
import ListaAtencionesMovil from './ListaAtencionesMovil'
import PanelCapas from './PanelCapas'
import estilos from './MapaAtenciones.module.css'
import Estado from '@/components/ui/Estado'
import { insigniaAEstado } from '@/components/ui/tonos'

// MapLibre solo se descarga cuando hay algo que dibujar (Guía Web 8.3).
const LienzoMapaAtenciones = lazy(() => import('./LienzoMapaAtenciones'))

const TITULO = 'Mapa de atenciones'

const TITULO_ERROR_CARGA = 'No se pudo cargar el mapa de atenciones'

type CampoOpcionalMapa = Exclude<ClaveFiltroMapa, 'desde' | 'hasta'>

type BorradorMapa = Record<CampoOpcionalMapa, string>

const CAMPOS_OPCIONALES: CampoOpcionalMapa[] = [
  'tipo_atencion',
  'tipo_uso_id',
  'area_verde_id',
  'tipo_servicio_id',
  'estado',
  'modalidad',
  'es_riesgo',
]

const OPCIONES_TIPO_ATENCION: OpcionSelector[] = TIPOS_ATENCION.map((t) => ({ valor: t, texto: t }))

const AYUDA_RIESGO = 'Atenciones que exigen prevencionista'

const OPCIONES_RIESGO: OpcionSelector[] = [
  { valor: 'true', texto: 'Atención de riesgo' },
  { valor: 'false', texto: 'Sin riesgo' },
]

const COLUMNAS: ColumnaTabla<FilaMapa>[] = [
  { clave: 'fecha', titulo: 'Fecha', ordenable: true, render: (f) => formatearFecha(f.fecha) },
  {
    clave: 'codigo',
    titulo: 'Atención',
    // El clic en el enlace abre la atención sin seleccionar la fila. Una actividad propia no tiene ficha aquí.
    render: (f) =>
      esAtencionTercerizada(f) ? (
        <Link to={rutaDetalleAtencion(f.atencion_id)} onClick={(e) => e.stopPropagation()}>
          {f.codigo}
        </Link>
      ) : (
        f.codigo
      ),
  },
  { clave: 'tipo_atencion', titulo: 'Tipo de atención', ordenable: true },
  {
    clave: 'modalidad',
    titulo: 'Modalidad',
    ordenable: true,
    render: (f) => (esAtencionTercerizada(f) ? 'Tercerizado' : 'Personal propio'),
  },
  { clave: 'tipo_servicio', titulo: 'Servicio o actividad' },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (f) =>
      esAtencionTercerizada(f) ? (
        <Estado {...insigniaAEstado(insigniaEstadoAtencion(f.estado))} />
      ) : (
        <Estado tono="neutro" texto={`Parte ${f.estado.toLocaleLowerCase('es')}`} />
      ),
  },
  { clave: 'espacio', titulo: 'Espacio', ordenable: true },
  { clave: 'ejemplar_codigo', titulo: 'Ejemplar', render: (f) => f.ejemplar_codigo ?? SIN_VALOR },
  {
    clave: 'con_ubicacion',
    titulo: 'Ubicación',
    render: (f) =>
      f.con_ubicacion ? <Estado tono="info" texto="En el mapa" /> : <Estado tono="neutro" texto="Sin ubicación" />,
  },
]

function textoOpcion(opciones: OpcionSelector[], valor: string): string {
  return opciones.find((o) => o.valor === valor)?.texto ?? `n.º ${valor}`
}

export default function MapaAtencionesPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, { texto: 'Mapa de atenciones' }])
  const esMovil = useEsMovil()

  // SUPUESTO (pendiente de confirmar): periodo predeterminado = semana actual, como el panel.
  const predeterminado = useMemo(() => semanaActual(), [])
  const { filtros, establecer } = useFiltrosUrl<ClaveFiltroMapa>({
    ...predeterminado,
    tipo_atencion: '',
    tipo_uso_id: '',
    area_verde_id: '',
    tipo_servicio_id: '',
    estado: '',
    modalidad: '',
    es_riesgo: '',
  })
  const aplicados: BorradorMapa = {
    tipo_atencion: filtros.tipo_atencion,
    tipo_uso_id: filtros.tipo_uso_id,
    area_verde_id: filtros.area_verde_id,
    tipo_servicio_id: filtros.tipo_servicio_id,
    estado: filtros.estado,
    modalidad: filtros.modalidad,
    es_riesgo: filtros.es_riesgo,
  }
  const claveAplicados = JSON.stringify(aplicados)
  const catalogos = useCatalogosFiltros()
  // Catálogo de tipos de uso de MOD-02 (filtro y colores del mapa). Si falla, el filtro se bloquea con su motivo.
  const catalogoUsos = useConsulta('catalogo-tipos-uso', (signal) => listarTiposUso(false, signal))
  const usos = useMemo(() => catalogoUsos.datos ?? [], [catalogoUsos.datos])
  const opcionesUso: OpcionSelector[] = useMemo(
    () => usos.map((u) => ({ valor: String(u.id), texto: u.nombre })),
    [usos],
  )

  // Borrador de los filtros opcionales, sincronizado con la URL (al quitar un chip, el selector lo refleja).
  const [borrador, setBorrador] = useState<BorradorMapa>(aplicados)
  const [origenBorrador, setOrigenBorrador] = useState(claveAplicados)
  if (origenBorrador !== claveAplicados) {
    setOrigenBorrador(claveAplicados)
    setBorrador(aplicados)
  }

  // Sin `esVacio`: con `sin_datos` el mapa sigue visible (A2).
  const consulta = useConsulta<ResultadoMapaAtenciones>(
    `mapa|${filtros.desde}|${filtros.hasta}|${claveAplicados}`,
    (signal) => obtenerMapaAtenciones(aConsultaMapa(filtros), signal),
  )
  const { estado, datos, error, cargaVisible } = consulta
  function reintentar() {
    consulta.reintentar()
    catalogos.reintentar()
    if (catalogoUsos.estado === 'error') catalogoUsos.reintentar()
  }

  const { elementos, filas } = useMemo(() => (datos ? prepararMapa(datos) : { elementos: [], filas: [] }), [datos])

  // Si alguna vez hubo algo que dibujar en esta visita, el mapa se mantiene (A2) con el último encuadre.
  const limitesActuales = useMemo(() => limitesDeElementos(elementos), [elementos])
  const [limitesConocidos, setLimitesConocidos] = useState<Limites | null>(null)
  if (limitesActuales && !limitesConocidos) setLimitesConocidos(limitesActuales)

  const [tiposVisibles, setTiposVisibles] = useState<ReadonlySet<TipoAtencion>>(() => new Set(TIPOS_ATENCION))
  const elementosVisibles = useMemo(
    () => elementos.filter((e) => tiposVisibles.has(e.properties.tipo_atencion)),
    [elementos, tiposVisibles],
  )
  const filasVisibles = useMemo(() => soloTiposVisibles(filas, tiposVisibles), [filas, tiposVisibles])

  // Selección: se borra si la fila desaparece tras una consulta (ajuste durante el render).
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const seleccionada = filas.find((f) => f.clave === seleccion) ?? null
  if (seleccion && !seleccionada && estado !== 'cargando') setSeleccion(null)

  const [falloMapa, setFalloMapa] = useState(false)
  const [intentoMapa, setIntentoMapa] = useState(0)

  function cambiarVisible(tipo: TipoAtencion, visible: boolean) {
    setTiposVisibles((actuales) => {
      const nuevos = new Set(actuales)
      if (visible) nuevos.add(tipo)
      else nuevos.delete(tipo)
      return nuevos
    })
  }

  const filtrosActivos: FiltroActivo[] = [
    aplicados.tipo_atencion && { clave: 'tipo_atencion', texto: `Tipo de atención: ${aplicados.tipo_atencion}` },
    aplicados.tipo_uso_id && {
      clave: 'tipo_uso_id',
      texto: `Tipo de uso: ${textoOpcion(opcionesUso, aplicados.tipo_uso_id)}`,
    },
    aplicados.area_verde_id && {
      clave: 'area_verde_id',
      texto: `Espacio: ${textoOpcion(catalogos.espacios, aplicados.area_verde_id)}`,
    },
    aplicados.tipo_servicio_id && {
      clave: 'tipo_servicio_id',
      texto: `Tipo de servicio: ${textoOpcion(catalogos.tiposServicio, aplicados.tipo_servicio_id)}`,
    },
    aplicados.estado && { clave: 'estado', texto: `Estado: ${aplicados.estado}` },
    aplicados.modalidad && {
      clave: 'modalidad',
      texto: `Modalidad: ${textoOpcion(OPCIONES_MODALIDAD, aplicados.modalidad)}`,
    },
    aplicados.es_riesgo && {
      clave: 'es_riesgo',
      texto: `Nivel de riesgo: ${textoOpcion(OPCIONES_RIESGO, aplicados.es_riesgo)}`,
    },
  ].filter((f): f is FiltroActivo => Boolean(f))

  function quitar(clave: string) {
    const campo = CAMPOS_OPCIONALES.find((c) => c === clave)
    if (campo) establecer({ [campo]: null })
  }

  function limpiar() {
    establecer(Object.fromEntries(CAMPOS_OPCIONALES.map((c) => [c, null])))
  }

  const barra = (
    <div className={estilos.filtros}>
      <FiltroPeriodo
        idBase="periodo-mapa"
        desde={filtros.desde}
        hasta={filtros.hasta}
        erroresServidor={erroresDePeriodo(error)}
        cargando={estado === 'cargando' && cargaVisible}
        onAplicar={(periodo) => {
          const sinCambios =
            periodo.desde === filtros.desde &&
            periodo.hasta === filtros.hasta &&
            JSON.stringify(borrador) === claveAplicados
          if (sinCambios) reintentar()
          else establecer({ ...periodo, ...borrador })
        }}
      >
        <Selector
          id="filtro-mapa-tipo-atencion"
          etiqueta="Tipo de atención"
          valor={borrador.tipo_atencion}
          opciones={OPCIONES_TIPO_ATENCION}
          opcionTodos={OPCION_TODOS}
          onCambiar={(valor) => setBorrador((b) => ({ ...b, tipo_atencion: valor }))}
        />
        <SelectoresFiltroGestion
          idBase="filtro-mapa"
          borrador={borrador}
          onCambiar={(campo: CampoFiltroGestion, valor) => setBorrador((b) => ({ ...b, [campo]: valor }))}
          catalogos={catalogos}
          estados={ESTADOS_FILTRO_MAPA}
        />
        <div className={estilos.campoConAyuda}>
          <Selector
            id="filtro-mapa-riesgo"
            etiqueta="Nivel de riesgo"
            valor={borrador.es_riesgo}
            opciones={OPCIONES_RIESGO}
            opcionTodos={OPCION_TODOS}
            onCambiar={(valor) => setBorrador((b) => ({ ...b, es_riesgo: valor }))}
          />
          <span className={estilos.iconoAyuda}>
            <AyudaEmergente id="filtro-mapa-ayuda-riesgo" tema="el nivel de riesgo" texto={AYUDA_RIESGO} />
          </span>
        </div>
      </FiltroPeriodo>
      <ChipsFiltrosActivos filtros={filtrosActivos} onQuitar={quitar} onLimpiar={limpiar} />
    </div>
  )

  // Estados de toda la página, como `PlantillaReporte`.
  let contenido = null
  if (estado === 'error' && error) {
    if (erroresDePeriodo(error)) contenido = null // el mensaje va junto al campo del periodo
    else if (error.estado === 403 || error.estado === 400)
      contenido = <AvisoEnLinea tono="error">{error.detalle}</AvisoEnLinea>
    else contenido = <EstadoError titulo={TITULO_ERROR_CARGA} descripcion={error.detalle} onReintentar={reintentar} />
  } else if (estado === 'cargando' && (cargaVisible || !datos)) {
    contenido = cargaVisible ? <EstadoCarga forma="pagina" /> : null
  } else if (datos) {
    let mapa
    if (falloMapa) {
      mapa = (
        <AvisoEnLinea
          tono="error"
          titulo="No se pudo cargar el mapa"
          accion={{
            texto: 'Reintentar mapa',
            onClick: () => {
              setFalloMapa(false)
              setIntentoMapa((n) => n + 1)
            },
          }}
        >
          Continúa con la lista de atenciones o vuelve a intentarlo
        </AvisoEnLinea>
      )
    } else if (limitesConocidos) {
      mapa = (
        <Suspense fallback={<EstadoCarga forma="tarjetas" texto="Cargando el mapa…" retrasar />}>
          <LienzoMapaAtenciones
            key={intentoMapa}
            elementos={elementosVisibles}
            limitesIniciales={limitesConocidos}
            usos={usos}
            seleccion={seleccion}
            onSeleccionar={setSeleccion}
            onError={() => setFalloMapa(true)}
          />
        </Suspense>
      )
    } else {
      // A1: nada que dibujar (los espacios no tienen polígono en MOD-02 ni los ejemplares, coordenadas): no se
      // descarga MapLibre y las atenciones están en la lista.
      mapa = (
        <AvisoEnLinea tono="info" titulo="Sin ubicaciones en el mapa">
          Las atenciones del periodo no tienen ubicación registrada en el inventario. Búscalas en la lista de abajo
        </AvisoEnLinea>
      )
    }

    contenido = (
      <div className={estilosReportes.pagina} aria-busy={estado === 'cargando' || undefined}>
        <IndicadorActualizacion
          actualizadoEl={formatearFechaHora(datos.generado_en)}
          onActualizar={reintentar}
          cargando={estado === 'cargando'}
        />
        <div className={estilos.composicion}>
          <div className={estilos.columnaMapa}>
            {datos.sin_datos && (
              <AvisoEnLinea tono="info" titulo="Sin atenciones en el periodo">
                {datos.mensaje_sin_datos}
              </AvisoEnLinea>
            )}
            {mapa}
          </div>
          <PanelCapas
            totales={datos.totales_por_tipo}
            visibles={tiposVisibles}
            onCambiarVisible={cambiarVisible}
            tipoUso={{
              valor: filtros.tipo_uso_id,
              opciones: opcionesUso,
              motivoBloqueo:
                catalogoUsos.estado === 'error'
                  ? 'No se pudo cargar el catálogo de tipos de uso del inventario'
                  : undefined,
              onCambiar: (valor) => establecer({ tipo_uso_id: valor || null }),
            }}
            seleccionada={seleccionada}
            onVerHistorial={(areaVerdeId) => establecer({ area_verde_id: String(areaVerdeId) })}
          />
        </div>

        <section className={estilosReportes.seccion} aria-labelledby="titulo-lista">
          <h2 id="titulo-lista" className={estilosReportes.tituloSeccion}>
            Lista de atenciones
          </h2>
          {esMovil && filasVisibles.length > 0 ? (
            <ListaAtencionesMovil
              // Al cambiar los datos o los tipos visibles, la lista vuelve a las primeras 25.
              key={`${datos.generado_en}|${[...tiposVisibles].join(',')}`}
              filas={filasVisibles}
              seleccion={seleccion}
              onSeleccionar={setSeleccion}
            />
          ) : (
            <TablaDatos
              titulo="Lista de atenciones"
              columnas={COLUMNAS}
              filas={filasVisibles}
              claveFila={(f) => f.clave}
              onFilaClick={(f) => setSeleccion(f.clave)}
              estado={filasVisibles.length === 0 ? 'vacio' : 'exito'}
              vacio={{
                titulo:
                  filas.length === 0 ? 'Sin atenciones en el periodo' : 'Sin atenciones de los tipos seleccionados',
              }}
            />
          )}
        </section>

        {datos.notas.map((nota) => (
          <AvisoEnLinea key={nota} tono="info">
            {nota}
          </AvisoEnLinea>
        ))}
      </div>
    )
  }

  return (
    <div className={estilosReportes.pagina}>
      {barra}
      {contenido}
    </div>
  )
}
