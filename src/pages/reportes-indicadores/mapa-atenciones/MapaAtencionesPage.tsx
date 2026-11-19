// RF-REP-007 · HU-MOD06-003 · CU-MOD06-003 (sin CP)
/**
 * Mapa de atenciones de mantenimiento, poda y control fitosanitario del periodo (Guía Web 5.8 y 6.1, patrón
 * «Mapa con capas»), sobre el mapa del campus de MOD-02.
 *
 * - Atenciones tercerizadas (MOD-05) y actividades del personal propio (MOD-04) de mantenimiento, poda y manejo
 *   fitosanitario; la modalidad se ve en la lista y en la ventana de cada espacio.
 * - El mapa ocupa el ancho de la pantalla; los filtros (que se pueden ocultar) y las capas flotan encima. En móvil
 *   van encima y debajo del mapa, sin taparlo.
 * - Filtros (criterio 1 y v2): periodo, tipo de atención, tipo de uso (catálogo de MOD-02, en las capas), espacio,
 *   tipo de servicio (actividad), estado (solo atenciones realizadas), modalidad y nivel de riesgo.
 * - Al elegir un espacio o un ejemplar en el mapa, o una fila de la lista, se abre su ventana con sus atenciones y el
 *   acceso al historial del espacio (pasos 6 y 7).
 * - A1: lo que no tiene ubicación no se dibuja, pero está en la lista (ordenable por espacio).
 * - A2: sin atenciones, el mapa sigue visible y un aviso lo informa (por eso no se usa `PlantillaReporte`, que
 *   sustituye todo el contenido).
 * - E1: si el mapa del campus falla, se avisa y se sigue con la lista.
 *
 * Supuesto (pendiente de confirmar): periodo predeterminado = semana actual.
 */
import { useMemo, useState } from 'react'
import AyudaEmergente from '@/components/reportes-indicadores/AyudaEmergente'
import SelectoresFiltroGestion, { type CampoFiltroGestion } from '@/components/reportes-indicadores/SelectoresFiltroGestion'
import { useCatalogosFiltros } from '@/components/reportes-indicadores/useCatalogosFiltros'
import { useEsMovil } from '@/components/reportes-indicadores/useEsMovil'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import { ChipsFiltrosActivos, type FiltroActivo } from '@/design-system/ChipsFiltro'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import FiltroPeriodo from '@/design-system/FiltroPeriodo'
import IndicadorActualizacion from '@/design-system/IndicadorActualizacion'
import Selector, { OPCION_TODOS, type OpcionSelector } from '@/design-system/Selector'
import TablaDatos from '@/design-system/TablaDatos'
import { useConsulta } from '@/hooks/useConsulta'
import { useFiltrosUrl } from '@/hooks/useFiltrosUrl'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS } from '@/router/rutasApp'
import { listarTiposUso } from '@/services/api/catalogosInventario'
import { obtenerMapaAtenciones } from '@/services/api/reportesGestion'
import type { ResultadoMapaAtenciones, TipoAtencion } from '@/types/reportesGestion'
import { OPCIONES_MODALIDAD } from '@/utils/estados'
import { formatearFecha, formatearFechaHora, formatearNumero, semanaActual } from '@/utils/formato'
import {
  aConsultaMapa,
  filasDeArea,
  filasDeEjemplar,
  prepararMapa,
  soloTiposVisibles,
  usosDeFilas,
  type ClaveFiltroMapa,
  type FilaMapa,
} from '@/utils/mapaAtenciones'
import { nombreEjemplar } from '@/utils/nombreEjemplar'
import { ESTADOS_FILTRO_MAPA, TIPOS_ATENCION } from '@/utils/reportesGestion'
import { erroresDePeriodo } from '../reportes/erroresPeriodo'
import estilosReportes from '../reportes/Reportes.module.css'
import { COLUMNAS_LISTA } from './columnasAtenciones'
import ListaAtencionesMovil from './ListaAtencionesMovil'
import MapaCampusAtenciones, { type AreaElegida } from './MapaCampusAtenciones'
import estilos from './MapaAtenciones.module.css'
import PanelCapas from './PanelCapas'
import VentanaAtencionesEspacio, { type EleccionMapa } from './VentanaAtencionesEspacio'

const TITULO = 'Mapa de atenciones'

const TITULO_ERROR_CARGA = 'No se pudieron cargar las atenciones'

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

function textoOpcion(opciones: OpcionSelector[], valor: string): string {
  return opciones.find((o) => o.valor === valor)?.texto ?? `n.º ${valor}`
}

/** Lo elegido en el mapa o en la lista: qué marcar en el mapa y qué abrir en la ventana. */
interface Eleccion {
  idFuente: string | null
  ejemplarId: number | null
  ventana: EleccionMapa
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
  const [filtrosVisibles, setFiltrosVisibles] = useState(true)

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

  const [tiposVisibles, setTiposVisibles] = useState<ReadonlySet<TipoAtencion>>(() => new Set(TIPOS_ATENCION))
  const elementosVisibles = useMemo(
    () => elementos.filter((e) => tiposVisibles.has(e.properties.tipo_atencion)),
    [elementos, tiposVisibles],
  )
  const filasVisibles = useMemo(() => soloTiposVisibles(filas, tiposVisibles), [filas, tiposVisibles])
  const leyenda = useMemo(() => usosDeFilas(filasVisibles, usos), [filasVisibles, usos])

  const [eleccion, setEleccion] = useState<Eleccion | null>(null)
  const nombreUso = (id: number | null) => usos.find((u) => u.id === id)?.nombre

  function elegirArea(area: AreaElegida) {
    const delArea = area.areaInventarioId === null ? [] : filasDeArea(filasVisibles, area.areaInventarioId)
    setEleccion({
      idFuente: area.idFuente,
      ejemplarId: null,
      ventana: {
        titulo: area.nombre,
        datos: [
          { etiqueta: 'Tipo de uso', valor: area.tipoUso },
          ...(area.superficie !== null
            ? [{ etiqueta: 'Superficie', valor: `${formatearNumero(area.superficie, 2)} m²` }]
            : []),
          ...(area.areaInventarioId === null
            ? [{ etiqueta: 'Inventario', valor: 'Polígono sin área del inventario vinculada' }]
            : []),
        ],
        filas: delArea,
      },
    })
  }

  function elegirEjemplar(ejemplarId: number) {
    const delEjemplar = filasDeEjemplar(filasVisibles, ejemplarId)
    const primera = delEjemplar[0]
    setEleccion({
      idFuente: null,
      ejemplarId,
      ventana: {
        titulo: primera?.ejemplar_codigo
          ? `Ejemplar ${nombreEjemplar(primera.ejemplar_codigo, primera.ejemplar_alias)}`
          : 'Ejemplar',
        datos: primera ? [{ etiqueta: 'Espacio', valor: primera.espacio }] : [],
        filas: delEjemplar,
      },
    })
  }

  /** Una fila de la lista abre su ejemplar o su espacio (o, sin ubicación, solo esa atención). */
  function elegirFila(fila: FilaMapa) {
    if (fila.ejemplar_id !== null) {
      elegirEjemplar(fila.ejemplar_id)
      return
    }
    const delArea = fila.area_inventario_id === null ? [fila] : filasDeArea(filasVisibles, fila.area_inventario_id)
    const uso = nombreUso(fila.tipo_uso_id)
    setEleccion({
      idFuente: null,
      ejemplarId: null,
      ventana: { titulo: fila.espacio, datos: uso ? [{ etiqueta: 'Tipo de uso', valor: uso }] : [], filas: delArea },
    })
  }

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

  // Estado de las atenciones (el mapa del campus se ve igualmente).
  let avisoAtenciones = null
  if (estado === 'error' && error && !erroresDePeriodo(error)) {
    avisoAtenciones =
      error.estado === 403 || error.estado === 400 ? (
        <AvisoEnLinea tono="error">{error.detalle}</AvisoEnLinea>
      ) : (
        <EstadoError titulo={TITULO_ERROR_CARGA} descripcion={error.detalle} onReintentar={reintentar} />
      )
  } else if (datos?.sin_datos) {
    avisoAtenciones = (
      <AvisoEnLinea tono="info" titulo="Sin atenciones en el periodo">
        {datos.mensaje_sin_datos}
      </AvisoEnLinea>
    )
  }
  const periodo = `Periodo del ${formatearFecha(filtros.desde)} al ${formatearFecha(filtros.hasta)}`

  return (
    <div className={estilosReportes.pagina} aria-busy={estado === 'cargando' || undefined}>
      <div className={estilos.escenario}>
        <div className={estilos.lienzo}>
          <MapaCampusAtenciones
            filas={filasVisibles}
            elementos={elementosVisibles}
            usos={usos}
            idFuenteElegido={eleccion?.idFuente ?? null}
            ejemplarElegido={eleccion?.ejemplarId ?? null}
            onElegirArea={elegirArea}
            onElegirEjemplar={elegirEjemplar}
          />
        </div>

        <section className={estilos.capaFiltros} aria-label="Filtros del mapa">
          <div className={estilos.cabeceraCapa}>
            <p className={estilos.subtitulo}>Filtros</p>
            {!esMovil && (
              <Boton
                variante="fantasma"
                aria-expanded={filtrosVisibles}
                onClick={() => setFiltrosVisibles((v) => !v)}
              >
                {filtrosVisibles ? 'Ocultar filtros' : 'Mostrar filtros'}
              </Boton>
            )}
          </div>
          {(filtrosVisibles || esMovil) && barra}
        </section>

        <div className={estilos.capaCapas}>
          <PanelCapas
            totales={datos?.totales_por_tipo ?? []}
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
            leyenda={leyenda}
          />
        </div>
      </div>

      {datos && (
        <IndicadorActualizacion
          actualizadoEl={formatearFechaHora(datos.generado_en)}
          onActualizar={reintentar}
          cargando={estado === 'cargando'}
        />
      )}
      {avisoAtenciones}

      <section className={estilosReportes.seccion} aria-labelledby="titulo-lista">
        <h2 id="titulo-lista" className={estilosReportes.tituloSeccion}>
          Lista de atenciones
        </h2>
        {estado === 'cargando' && !datos ? (
          cargaVisible && <EstadoCarga forma="tabla" />
        ) : esMovil && filasVisibles.length > 0 ? (
          <ListaAtencionesMovil
            // Al cambiar los datos o los tipos visibles, la lista vuelve a las primeras 25.
            key={`${datos?.generado_en}|${[...tiposVisibles].join(',')}`}
            filas={filasVisibles}
            seleccion={null}
            onSeleccionar={(clave) => {
              const fila = filasVisibles.find((f) => f.clave === clave)
              if (fila) elegirFila(fila)
            }}
          />
        ) : (
          <TablaDatos
            titulo="Lista de atenciones"
            columnas={COLUMNAS_LISTA}
            filas={filasVisibles}
            claveFila={(f) => f.clave}
            onFilaClick={elegirFila}
            estado={filasVisibles.length === 0 ? 'vacio' : 'exito'}
            vacio={{
              titulo: filas.length === 0 ? 'Sin atenciones en el periodo' : 'Sin atenciones de los tipos seleccionados',
            }}
          />
        )}
      </section>

      {datos?.notas.map((nota) => (
        <AvisoEnLinea key={nota} tono="info">
          {nota}
        </AvisoEnLinea>
      ))}

      <VentanaAtencionesEspacio
        eleccion={eleccion?.ventana ?? null}
        periodo={periodo}
        onCerrar={() => setEleccion(null)}
        onVerHistorial={(areaVerdeId) => establecer({ area_verde_id: String(areaVerdeId) })}
      />
    </div>
  )
}
