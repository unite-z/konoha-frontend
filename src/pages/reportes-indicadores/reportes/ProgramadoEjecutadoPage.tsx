// RF-REP-010 · HU-MOD06-012 · CP-TR-MOD06-012
/**
 * Programado frente a ejecutado: los trabajos programados de un periodo con sus ejecuciones vinculadas, los
 * pendientes (sin ejecución) y las desviaciones.
 *
 * - Periodo por defecto: el mes en curso; los chips de meses dan acceso rápido a los anteriores.
 * - Los filtros (servicio, espacio y modalidad) van al backend, que los aplica a lo programado y a lo ejecutado
 *   (criterio 3). La situación es un filtro local de toda la página (gráfico y pestañas), en la URL: se elige con
 *   los chips de la tabla o con las tarjetas «Pendientes» y «Con desviación». La tarjeta «Ejecuciones sin
 *   programar» deja en la página solo esas ejecuciones.
 * - Solo consulta (GET).
 */
import { useMemo, useState } from 'react'
import AvisoDatosSimulados from '../../../components/reportes-indicadores/AvisoDatosSimulados'
import DialogoDetalle from '../../../components/reportes-indicadores/DialogoDetalle'
import SelectoresFiltroGestion, { type CampoFiltroGestion } from '../../../components/reportes-indicadores/SelectoresFiltroGestion'
import { AYUDA_CATALOGO_INCOMPLETO, MOTIVO_CATALOGO_NO_DISPONIBLE, type CatalogosFiltros } from '../../../components/reportes-indicadores/useCatalogosFiltros'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Boton from '../../../components/ui/Boton'
import { ChipsFiltrosActivos, GrupoChips } from '../../../components/ui/ChipsFiltro'
import FiltroPeriodo from '../../../components/ui/FiltroPeriodo'
import Pestanas from '../../../components/ui/Pestanas'
import { useConsulta } from '../../../hooks/useConsulta'
import { useFiltrosUrl } from '../../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS } from '../../../router/rutasApp'
import { obtenerCatalogoComparacion, obtenerProgramadoEjecutado } from '../../../services/api/reportesGestion'
import type { FilaProgramadoEjecutado, ResultadoProgramadoEjecutado } from '../../../types/reportesGestion'
import { textoModalidad } from '../../../utils/estados'
import { formatearFecha, formatearNumero } from '../../../utils/formato'
import { hoyLima } from '../../../utils/instanteLima'
import {
  consultaProgramado,
  contarPorSituacion,
  mesesRecientes,
  ordenarPendientes,
  porServicioDe,
  SITUACIONES,
  type FiltroTarjeta,
} from '../../../utils/programadoEjecutado'
import { erroresDePeriodo } from './erroresPeriodo'
import PlantillaReporte from './PlantillaReporte'
import GraficoPorServicio from './programado-ejecutado/GraficoPorServicio'
import estilosPagina from './programado-ejecutado/ProgramadoEjecutado.module.css'
import SinProgramar from './programado-ejecutado/SinProgramar'
import TablaComparacion from './programado-ejecutado/TablaComparacion'
import TarjetasProgramado from './programado-ejecutado/TarjetasProgramado'
import estilos from './Reportes.module.css'

/** Pestaña de situación sin filtro. */
const TODAS = 'todas'

const TITULO = 'Programado frente a ejecutado'

type Vista = 'comparacion' | 'pendientes' | 'sin-programar'

const leerVista = (valor: string): Vista => (valor === 'pendientes' || valor === 'sin-programar' ? valor : 'comparacion')

type Borrador = Pick<Record<CampoFiltroGestion, string>, 'tipo_servicio_id' | 'area_verde_id' | 'modalidad'>

/** Contenido de la comparación: gráfico, aviso del personal propio, pestañas y notas. */
function Comparacion({
  datos,
  vista,
  situacion,
  soloSinProgramar,
  onVista,
  onSituacion,
  onVerTodo,
}: {
  datos: ResultadoProgramadoEjecutado
  vista: Vista
  situacion: string
  soloSinProgramar: boolean
  onVista: (vista: string) => void
  onSituacion: (situacion: string) => void
  onVerTodo: () => void
}) {
  const [detalle, setDetalle] = useState<{ titulo: string; filas: FilaProgramadoEjecutado[] } | null>(null)
  const hoy = hoyLima()
  const cuenta = contarPorSituacion(datos.filas)
  const situacionValida = SITUACIONES.find((s) => s.valor === situacion)?.valor
  // El filtro de situación se aplica a toda la página: gráfico, pestañas y «Ver detalles».
  const filasVista = situacionValida ? datos.filas.filter((f) => f.situacion === situacionValida) : datos.filas
  const pendientes = ordenarPendientes(filasVista, hoy)
  const servicios = situacionValida ? porServicioDe(filasVista, datos.por_servicio) : datos.por_servicio

  if (soloSinProgramar) {
    return (
      <section className={estilos.seccion} aria-labelledby="titulo-sin-programar">
        <div className={estilosPagina.cabeceraFiltrada}>
          <h2 id="titulo-sin-programar" className={estilos.tituloSeccion}>
            Ejecuciones sin programar ({formatearNumero(datos.sin_programacion.length)})
          </h2>
          <Boton variante="secundario" onClick={onVerTodo}>
            Ver todos los trabajos
          </Boton>
        </div>
        <SinProgramar ejecuciones={datos.sin_programacion} />
      </section>
    )
  }

  return (
    <>
      {servicios.length > 0 && (
        <GraficoPorServicio
          key={`${datos.generado_en}|${situacionValida ?? ''}`}
          servicios={servicios}
          filas={filasVista}
          onVerDetalle={(titulo, filas) => setDetalle({ titulo, filas })}
        />
      )}

      {datos.personal_propio.sin_datos && (
        <AvisoEnLinea tono="info" titulo="Personal propio sin datos">
          {datos.personal_propio.mensaje_sin_datos ?? 'Las actividades de personal propio aún no están disponibles'}
        </AvisoEnLinea>
      )}

      <section className={estilos.seccion} aria-labelledby="titulo-trabajos">
        <h2 id="titulo-trabajos" className={estilos.tituloSeccion}>
          Trabajos del periodo
        </h2>
        <Pestanas
          etiqueta="Trabajos del periodo"
          valor={vista}
          onCambiar={onVista}
          pestanas={[
            { valor: 'comparacion', texto: 'Comparación' },
            { valor: 'pendientes', texto: 'Pendientes', contador: pendientes.length },
            { valor: 'sin-programar', texto: 'Ejecuciones sin programar', contador: datos.sin_programacion.length },
          ]}
        >
          {vista === 'comparacion' && (
            <Pestanas
              etiqueta="Situación"
              pestanas={[
                { valor: TODAS, texto: 'Todas', contador: datos.filas.length },
                ...SITUACIONES.map((s) => ({ valor: s.valor, texto: s.texto, contador: cuenta[s.valor] })),
              ]}
              valor={situacionValida ?? TODAS}
              onCambiar={(valor) => onSituacion(valor === TODAS ? '' : valor)}
            >
              <TablaComparacion titulo="Comparación de lo programado con lo ejecutado" filas={filasVista} />
            </Pestanas>
          )}
          {vista === 'pendientes' && <TablaComparacion titulo="Trabajos pendientes" filas={pendientes} hoy={hoy} sinOrdenInicial />}
          {vista === 'sin-programar' && <SinProgramar ejecuciones={datos.sin_programacion} />}
        </Pestanas>
      </section>

      {datos.notas.length > 0 && (
        <ul className={`${estilos.listaSimple} ${estilos.ayuda}`} aria-label="Notas del reporte">
          {datos.notas.map((nota) => (
            <li key={nota}>{nota}</li>
          ))}
        </ul>
      )}

      <DialogoDetalle
        abierto={detalle !== null}
        titulo={detalle?.titulo ?? ''}
        descripcion={`Del ${formatearFecha(datos.periodo.desde)} al ${formatearFecha(datos.periodo.hasta)}`}
        onCerrar={() => setDetalle(null)}
      >
        {detalle && <TablaComparacion titulo={detalle.titulo} filas={detalle.filas} hoy={hoy} />}
      </DialogoDetalle>
    </>
  )
}

export default function ProgramadoEjecutadoPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.reportes, { texto: TITULO }])

  const meses = useMemo(() => mesesRecientes(3), [])
  const { filtros, establecer } = useFiltrosUrl({
    desde: meses[0].desde,
    hasta: meses[0].hasta,
    tipo_servicio_id: '',
    area_verde_id: '',
    modalidad: '',
    vista: 'comparacion',
    situacion: '',
    ver: '',
  })
  const { desde, hasta } = filtros
  const consultaApi = consultaProgramado(filtros)
  const aplicados: Borrador = { tipo_servicio_id: filtros.tipo_servicio_id, area_verde_id: filtros.area_verde_id, modalidad: filtros.modalidad }
  const claveAplicados = JSON.stringify(aplicados)

  // Borrador de los selectores: se aplica con el botón de la barra; si la URL cambia, lo refleja.
  const [borrador, setBorrador] = useState<Borrador>(aplicados)
  const [origen, setOrigen] = useState(claveAplicados)
  if (origen !== claveAplicados) {
    setOrigen(claveAplicados)
    setBorrador(aplicados)
  }

  const catalogo = useConsulta('catalogo-comparacion', obtenerCatalogoComparacion)
  const opciones = (lista: { id: number; nombre: string }[] | undefined) =>
    (lista ?? []).map((e) => ({ valor: String(e.id), texto: e.nombre })).sort((a, b) => a.texto.localeCompare(b.texto, 'es'))
  const bloqueo = catalogo.estado === 'error' ? MOTIVO_CATALOGO_NO_DISPONIBLE : undefined
  const ayuda = catalogo.datos && !catalogo.datos.completo ? AYUDA_CATALOGO_INCOMPLETO : undefined
  const catalogos: CatalogosFiltros = {
    espacios: opciones(catalogo.datos?.espacios),
    tiposServicio: opciones(catalogo.datos?.tipos_servicio),
    motivoBloqueoEspacios: bloqueo,
    motivoBloqueoTipos: bloqueo,
    ayudaEspacios: ayuda,
    ayudaTipos: ayuda,
    reintentar: catalogo.reintentar,
  }

  const consulta = useConsulta<ResultadoProgramadoEjecutado>(
    `programado|${desde}|${hasta}|${claveAplicados}`,
    (signal) => obtenerProgramadoEjecutado(consultaApi, signal),
    (datos) => datos.sin_datos,
  )

  const textoDe = (lista: { valor: string; texto: string }[], valor: string) => lista.find((o) => o.valor === valor)?.texto ?? `n.º ${valor}`
  const filtrosActivos = [
    aplicados.tipo_servicio_id && { clave: 'tipo_servicio_id', texto: `Servicio: ${textoDe(catalogos.tiposServicio, aplicados.tipo_servicio_id)}` },
    aplicados.area_verde_id && { clave: 'area_verde_id', texto: `Espacio: ${textoDe(catalogos.espacios, aplicados.area_verde_id)}` },
    consultaApi.modalidad && { clave: 'modalidad', texto: `Modalidad: ${textoModalidad(consultaApi.modalidad)}` },
  ].filter((f): f is { clave: string; texto: string } => Boolean(f))
  const limpiar = () => establecer({ tipo_servicio_id: null, area_verde_id: null, modalidad: null })
  const mesElegido = meses.find((m) => m.desde === desde && m.hasta === hasta)?.valor ?? ''

  // Filtro de las tarjetas: una situación (la misma que los chips de la tabla) o solo las ejecuciones sin programar.
  const soloSinProgramar = filtros.ver === 'sin-programar'
  const filtroTarjeta: FiltroTarjeta | null = soloSinProgramar
    ? 'sin-programar'
    : filtros.situacion === 'Pendiente' || filtros.situacion === 'EjecutadoConDesviacion'
      ? filtros.situacion
      : null
  function filtrarDesdeTarjeta(filtro: FiltroTarjeta | null) {
    if (filtro === null) establecer({ situacion: null, ver: null })
    else if (filtro === 'sin-programar') establecer({ ver: 'sin-programar', situacion: null })
    else establecer({ situacion: filtro, ver: null, vista: null })
  }

  return (
    <div className={estilos.pagina}>
      <AvisoDatosSimulados />
      <PlantillaReporte
        consulta={consulta}
        filtros={
          <div className={estilosPagina.filtros}>
            <div className={estilosPagina.mesesRapidos}>
              <span className={estilosPagina.etiquetaMeses}>Ver mes</span>
              <GrupoChips
                etiqueta="Ver mes"
                opciones={meses.map((m) => ({ valor: m.valor, texto: m.texto }))}
                valor={mesElegido}
                onCambiar={(valor) => {
                  const mes = meses.find((m) => m.valor === valor)
                  if (mes) establecer({ desde: mes.desde, hasta: mes.hasta })
                }}
              />
            </div>
            <FiltroPeriodo
              idBase="periodo-programado"
              desde={desde}
              hasta={hasta}
              erroresServidor={erroresDePeriodo(consulta.error)}
              cargando={consulta.estado === 'cargando' && consulta.cargaVisible}
              onAplicar={(periodo) => {
                const sinCambios = periodo.desde === desde && periodo.hasta === hasta && JSON.stringify(borrador) === claveAplicados
                if (sinCambios) consulta.reintentar()
                else establecer({ ...periodo, ...borrador })
              }}
            >
              <SelectoresFiltroGestion
                borrador={{ ...borrador, estado: '' }}
                onCambiar={(campo, valor) => setBorrador((b) => ({ ...b, [campo]: valor }))}
                catalogos={catalogos}
                estados={[]}
                conEstado={false}
                idBase="filtro-programado"
              />
            </FiltroPeriodo>
            <ChipsFiltrosActivos filtros={filtrosActivos} onQuitar={(clave) => establecer({ [clave]: null })} onLimpiar={limpiar} />
          </div>
        }
        vacio={{
          titulo: 'Sin trabajos programados en el periodo',
          accion: filtrosActivos.length > 0 ? (
            <Boton variante="secundario" onClick={limpiar}>
              Limpiar filtros
            </Boton>
          ) : undefined,
        }}
      >
        {(datos) => (
          <>
            <TarjetasProgramado datos={datos} filtro={filtroTarjeta} onFiltrar={filtrarDesdeTarjeta} />
            <Comparacion
              datos={datos}
              vista={leerVista(filtros.vista)}
              situacion={filtros.situacion}
              soloSinProgramar={soloSinProgramar}
              onVista={(valor) => establecer({ vista: valor === 'comparacion' ? null : valor })}
              onSituacion={(valor) => establecer({ situacion: valor || null })}
              onVerTodo={() => establecer({ ver: null })}
            />
          </>
        )}
      </PlantillaReporte>
    </div>
  )
}
