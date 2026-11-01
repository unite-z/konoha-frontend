// RF-REP-004 · HU-MOD06-002 · sin caso de prueba (pendiente de diseño, QA)
/**
 * Distribución del personal por cuadrilla, actividad, espacio y jornada.
 *
 * HU-MOD06-002: estructura uniforme, el reporte mantiene los filtros (en la URL), respeta los permisos,
 * informa del estado vacío y no modifica datos. La exportación queda fuera de este corte.
 * RNF-008: solo se muestra el nombre de cada operario.
 *
 * Opciones de los selectores: el MOD-06 no tiene endpoints de catálogos (son de los módulos 02 y 04), así
 * que se construyen con los valores presentes en la respuesta sin filtros opcionales del periodo.
 *
 * Supuesto: periodo predeterminado a confirmar con la contraparte (CU-MOD06-001). Aquí, la semana actual.
 *
 * Presentación: tarjetas de resumen, gráfico por cuadrilla, actividad (clase y sus tipos), espacio o jornada y
 * mapa de calor de cuadrilla por jornada. Al elegir una parte de un gráfico, «Ver detalles» abre su tabla.
 * La tarjeta «Actividades sin tiempo registrado» filtra los gráficos por esas actividades (parámetro
 * `sin_tiempo` de la URL; el filtro es del cliente, no se envía a la API).
 */
import { useMemo, useState } from 'react'
import DialogoDetalle from '../../../components/reportes-indicadores/DialogoDetalle'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Badge from '../../../components/ui/Badge'
import Boton from '../../../components/ui/Boton'
import { ChipsFiltrosActivos } from '../../../components/ui/ChipsFiltro'
import FiltroPeriodo from '../../../components/ui/FiltroPeriodo'
import Selector, { OPCION_TODOS, type OpcionSelector } from '../../../components/ui/Selector'
import TarjetaIndicador from '../../../components/ui/TarjetaIndicador'
import { useConsulta } from '../../../hooks/useConsulta'
import { useFiltrosUrl } from '../../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS } from '../../../router/rutasApp'
import { obtenerDistribucionPersonal } from '../../../services/api/reportes'
import type { FiltrosDistribucion, ResultadoDistribucionPersonal } from '../../../types/reportes'
import { formatearFecha, formatearNumero, semanaActual, SIN_VALOR } from '../../../utils/formato'
import {
  cuadrillasDistintas,
  filasSinTiempo,
  MEDIDAS_CON_TIEMPO,
  type Medida,
} from './distribucion-personal/agregacion'
import DetalleSeleccion, { type Seleccion } from './distribucion-personal/DetalleSeleccion'
import GraficoDistribucion from './distribucion-personal/GraficoDistribucion'
import MapaCalorCuadrillaJornada from './distribucion-personal/MapaCalorCuadrillaJornada'
import estilosPagina from './DistribucionPersonal.module.css'
import { erroresDePeriodo } from './erroresPeriodo'
import PlantillaReporte from './PlantillaReporte'
import estilos from './Reportes.module.css'

const TITULO = 'Distribución del personal'

/** Filtros opcionales, con su etiqueta en la interfaz. */
const FILTROS_OPCIONALES = [
  { clave: 'cuadrilla_id', etiqueta: 'Cuadrilla' },
  { clave: 'clase_actividad_id', etiqueta: 'Clase de actividad' },
  { clave: 'tipo_actividad_id', etiqueta: 'Tipo de actividad' },
  { clave: 'area_verde_id', etiqueta: 'Espacio' },
] as const

type ClaveFiltro = (typeof FILTROS_OPCIONALES)[number]['clave']
type Borrador = Record<ClaveFiltro, string>

const BORRADOR_VACIO: Borrador = { cuadrilla_id: '', clase_actividad_id: '', tipo_actividad_id: '', area_verde_id: '' }

/** Parámetros de la URL que se pueden quitar con un chip. */
type ClaveUrl = ClaveFiltro | 'sin_tiempo'

const TEXTO_SIN_TIEMPO = 'Solo actividades sin tiempo registrado'

/** Medida inicial: horas-persona, salvo con el filtro «sin tiempo» (no tendría datos). */
function medidaInicial(soloSinTiempo: boolean): Medida {
  return soloSinTiempo ? 'numero_actividades' : 'horas_persona'
}

function plural(n: number, singular: string, varios: string): string {
  return `${formatearNumero(n)} ${n === 1 ? singular : varios}`
}

/** Opciones distintas, ordenadas por texto. */
function opcionesDistintas(pares: [number | null, string | null][]): OpcionSelector[] {
  const mapa = new Map<string, string>()
  for (const [id, texto] of pares) {
    if (id !== null && texto) mapa.set(String(id), texto)
  }
  return [...mapa.entries()]
    .map(([valor, texto]) => ({ valor, texto }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { numeric: true }))
}

function construirOpciones(datos: ResultadoDistribucionPersonal | null): Record<ClaveFiltro, OpcionSelector[]> {
  const filas = datos?.filas ?? []
  return {
    cuadrilla_id: opcionesDistintas([
      ...filas.map((f) => [f.cuadrilla_id, f.cuadrilla_nombre] as [number | null, string | null]),
      ...(datos?.cuadrillas_sin_parte ?? []).map(
        (c) => [c.cuadrilla_id, c.cuadrilla_nombre] as [number | null, string | null],
      ),
    ]),
    clase_actividad_id: opcionesDistintas(filas.map((f) => [f.clase_actividad_id, f.clase_actividad_nombre])),
    tipo_actividad_id: opcionesDistintas(filas.map((f) => [f.tipo_actividad_id, f.tipo_actividad_nombre])),
    area_verde_id: opcionesDistintas(filas.map((f) => [f.area_verde_id, f.area_verde_nombre])),
  }
}

function aFiltrosApi(filtros: Borrador): FiltrosDistribucion {
  const resultado: FiltrosDistribucion = {}
  for (const { clave } of FILTROS_OPCIONALES) {
    if (filtros[clave]) resultado[clave] = Number(filtros[clave])
  }
  return resultado
}

export default function DistribucionPersonalPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.reportes, { texto: TITULO }])

  const predeterminado = useMemo(() => semanaActual(), [])
  const { filtros, establecer } = useFiltrosUrl({ ...predeterminado, ...BORRADOR_VACIO, sin_tiempo: '' })
  const { desde, hasta } = filtros
  const opcionales: Borrador = {
    cuadrilla_id: filtros.cuadrilla_id,
    clase_actividad_id: filtros.clase_actividad_id,
    tipo_actividad_id: filtros.tipo_actividad_id,
    area_verde_id: filtros.area_verde_id,
  }
  const claveOpcionales = JSON.stringify(opcionales)
  const hayOpcionales = Object.values(opcionales).some(Boolean)
  const soloSinTiempo = filtros.sin_tiempo === '1'

  const [medidaGrafico, setMedidaGrafico] = useState<Medida>(() => medidaInicial(soloSinTiempo))
  const [medidaMapa, setMedidaMapa] = useState<Medida>(() => medidaInicial(soloSinTiempo))
  const [detalle, setDetalle] = useState<Seleccion | null>(null)

  // Borrador de los selectores: se aplica con «Aplicar filtros».
  // Si los filtros de la URL cambian (por ejemplo, al quitar un chip), el borrador los refleja.
  const [borrador, setBorrador] = useState<Borrador>(opcionales)
  const [origenBorrador, setOrigenBorrador] = useState(claveOpcionales)
  if (origenBorrador !== claveOpcionales) {
    setOrigenBorrador(claveOpcionales)
    setBorrador(opcionales)
  }

  const consulta = useConsulta<ResultadoDistribucionPersonal>(
    `${desde}|${hasta}|${claveOpcionales}`,
    (signal) => obtenerDistribucionPersonal({ desde, hasta }, aFiltrosApi(opcionales), signal),
    (datos) => datos.sin_datos,
  )

  // Opciones: respuesta del periodo sin filtros opcionales (la misma consulta si no hay filtros).
  const consultaOpciones = useConsulta<ResultadoDistribucionPersonal>(
    hayOpcionales ? `opciones|${desde}|${hasta}` : null,
    (signal) => obtenerDistribucionPersonal({ desde, hasta }, {}, signal),
  )
  const fuenteOpciones = hayOpcionales ? consultaOpciones.datos : consulta.datos
  const opciones = useMemo(() => construirOpciones(fuenteOpciones), [fuenteOpciones])

  function textoOpcion(clave: ClaveFiltro, valor: string): string {
    return opciones[clave].find((o) => o.valor === valor)?.texto ?? `n.º ${valor}`
  }

  const filtrosActivos = [
    ...FILTROS_OPCIONALES.filter(({ clave }) => opcionales[clave]).map(({ clave, etiqueta }) => ({
      clave,
      texto: `${etiqueta}: ${textoOpcion(clave, opcionales[clave])}`,
    })),
    ...(soloSinTiempo ? [{ clave: 'sin_tiempo', texto: TEXTO_SIN_TIEMPO }] : []),
  ]

  function limpiarFiltros() {
    establecer({ ...BORRADOR_VACIO, sin_tiempo: null })
  }

  function alternarSinTiempo() {
    const activar = !soloSinTiempo
    establecer({ sin_tiempo: activar ? '1' : null })
    // Horas-persona y tiempo no tienen datos con este filtro: se pasa a «Actividades».
    if (activar) {
      const sinTiempo = (m: Medida): Medida => (MEDIDAS_CON_TIEMPO.includes(m) ? 'numero_actividades' : m)
      setMedidaGrafico(sinTiempo)
      setMedidaMapa(sinTiempo)
    }
  }

  return (
    <PlantillaReporte
      consulta={consulta}
      filtros={
        <div className={estilosPagina.filtros}>
          <FiltroPeriodo
            idBase="periodo-distribucion"
            desde={desde}
            hasta={hasta}
            erroresServidor={erroresDePeriodo(consulta.error)}
            cargando={consulta.estado === 'cargando' && consulta.cargaVisible}
            onAplicar={(periodo) => {
              const sinCambios =
                periodo.desde === desde && periodo.hasta === hasta && JSON.stringify(borrador) === claveOpcionales
              if (sinCambios) consulta.reintentar()
              else establecer({ ...periodo, ...borrador })
            }}
          >
            {FILTROS_OPCIONALES.map(({ clave, etiqueta }) => {
              const lista = opciones[clave]
              const valor = borrador[clave]
              // Conserva la opción elegida aunque todavía no lleguen las opciones del periodo.
              const conElegida =
                valor && !lista.some((o) => o.valor === valor)
                  ? [...lista, { valor, texto: textoOpcion(clave, valor) }]
                  : lista
              return (
                <Selector
                  key={clave}
                  id={`filtro-${clave}`}
                  etiqueta={etiqueta}
                  valor={valor}
                  opciones={conElegida}
                  opcionTodos={OPCION_TODOS}
                  onCambiar={(nuevo) => setBorrador((b) => ({ ...b, [clave]: nuevo }))}
                />
              )
            })}
          </FiltroPeriodo>
          <ChipsFiltrosActivos
            filtros={filtrosActivos}
            onQuitar={(clave) => establecer({ [clave]: null } as Partial<Record<ClaveUrl, null>>)}
            onLimpiar={limpiarFiltros}
          />
        </div>
      }
      vacio={{
        titulo: 'Sin partes diarios en el periodo',
        accion: hayOpcionales ? (
          <Boton variante="secundario" onClick={limpiarFiltros}>
            Limpiar filtros
          </Boton>
        ) : undefined,
      }}
    >
      {(datos) => {
        const resumen = datos.resumen
        const sinTiempo = resumen?.actividades_sin_tiempo ?? 0
        const filas = soloSinTiempo ? filasSinTiempo(datos.filas) : datos.filas
        const mostradasSinTiempo = filas.reduce((a, f) => a + f.numero_actividades, 0)
        const cuadrillas = cuadrillasDistintas(datos.filas)
        // Al cambiar los datos o el filtro, los gráficos olvidan la parte elegida.
        const claveGraficos = `${datos.generado_en}|${soloSinTiempo}`
        return (
          <>
            {resumen && (
              <div className={estilosPagina.tarjetas}>
                <div>
                  <TarjetaIndicador
                    etiqueta="Jornadas con parte"
                    valor={formatearNumero(resumen.jornadas_con_parte)}
                    contexto={plural(resumen.partes, 'parte diario registrado', 'partes diarios registrados')}
                  />
                </div>
                <div>
                  <TarjetaIndicador
                    etiqueta="Operarios distintos"
                    valor={formatearNumero(resumen.operarios_distintos)}
                    contexto={`En ${plural(cuadrillas, 'cuadrilla', 'cuadrillas')}`}
                  />
                </div>
                <div>
                  <TarjetaIndicador
                    etiqueta="Horas-persona"
                    valor={formatearNumero(resumen.horas_persona, 2)}
                    contexto={[
                      `En ${plural(resumen.actividades, 'actividad', 'actividades')}`,
                      resumen.horas_persona !== null && resumen.operarios_distintos > 0
                        ? `${formatearNumero(resumen.horas_persona / resumen.operarios_distintos, 2)} h por operario`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                </div>
                <div
                  className={
                    sinTiempo > 0
                      ? `${estilosPagina.tarjetaFiltro} ${soloSinTiempo ? estilosPagina.tarjetaFiltroActiva : ''}`
                      : undefined
                  }
                >
                  <TarjetaIndicador
                    etiqueta="Actividades sin tiempo registrado"
                    valor={formatearNumero(sinTiempo)}
                    estado={sinTiempo > 0 ? 'alerta' : 'normal'}
                    contexto={
                      sinTiempo === 0
                        ? 'Todas las actividades tienen tiempo'
                        : soloSinTiempo
                          ? 'Filtro aplicado en los gráficos. Pulsa para quitarlo.'
                          : 'Su tiempo no suma en las horas-persona. Pulsa para verlas en los gráficos.'
                    }
                    insignia={sinTiempo > 0 ? { tono: 'advertencia', texto: 'Sin tiempo registrado' } : undefined}
                  />
                  {sinTiempo > 0 && (
                    <button
                      type="button"
                      className={estilosPagina.botonTarjeta}
                      aria-pressed={soloSinTiempo}
                      aria-label={
                        soloSinTiempo
                          ? 'Quitar el filtro de actividades sin tiempo registrado'
                          : 'Filtrar los gráficos por las actividades sin tiempo registrado'
                      }
                      onClick={alternarSinTiempo}
                    />
                  )}
                </div>
              </div>
            )}

            {datos.cuadrillas_sin_parte.length > 0 && (
              <AvisoEnLinea tono="advertencia" titulo="Cuadrillas sin parte diario">
                <ul className={estilos.listaSinVinetas}>
                  {datos.cuadrillas_sin_parte.map((c) => (
                    <li key={`${c.cuadrilla_id}-${c.jornada}`} className={estilos.enLinea}>
                      <span>
                        {c.cuadrilla_nombre ?? SIN_VALOR} · {formatearFecha(c.jornada)}
                      </span>
                      <Badge tono="neutral" texto={c.estado} />
                    </li>
                  ))}
                </ul>
              </AvisoEnLinea>
            )}

            {soloSinTiempo && (
              <AvisoEnLinea
                tono="info"
                titulo={TEXTO_SIN_TIEMPO}
                accion={{ texto: 'Quitar el filtro', onClick: alternarSinTiempo }}
              >
                {mostradasSinTiempo < sinTiempo
                  ? `Se muestran ${formatearNumero(mostradasSinTiempo)} de ${formatearNumero(sinTiempo)}: las demás ` +
                    'comparten jornada, cuadrilla, tipo y espacio con actividades que sí tienen tiempo.'
                  : 'Los gráficos muestran solo las actividades cuyo tiempo no se registró.'}
              </AvisoEnLinea>
            )}

            <section className={estilos.seccion} aria-labelledby="titulo-distribucion">
              <h2 id="titulo-distribucion" className={estilos.tituloSeccion}>
                Distribución por cuadrilla, actividad, espacio y jornada
              </h2>
              <GraficoDistribucion
                key={claveGraficos}
                filas={filas}
                medida={medidaGrafico}
                onCambiarMedida={setMedidaGrafico}
                onVerDetalle={setDetalle}
              />
            </section>

            <section className={estilos.seccion} aria-labelledby="titulo-mapa">
              <h2 id="titulo-mapa" className={estilos.tituloSeccion}>
                Cuadrilla por jornada
              </h2>
              <p className={estilos.ayuda}>Cuanto más oscura la celda, mayor el valor de la medida elegida.</p>
              <MapaCalorCuadrillaJornada
                key={claveGraficos}
                filas={filas}
                medida={medidaMapa}
                onCambiarMedida={setMedidaMapa}
                onVerDetalle={setDetalle}
              />
            </section>

            <DialogoDetalle
              abierto={detalle !== null}
              titulo={detalle?.titulo ?? ''}
              descripcion={
                detalle
                  ? `Periodo del ${formatearFecha(desde)} al ${formatearFecha(hasta)}` +
                    (soloSinTiempo ? ` · ${TEXTO_SIN_TIEMPO.toLowerCase()}` : '')
                  : undefined
              }
              onCerrar={() => setDetalle(null)}
            >
              {detalle && <DetalleSeleccion seleccion={detalle} />}
            </DialogoDetalle>
          </>
        )
      }}
    </PlantillaReporte>
  )
}
