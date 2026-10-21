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
 */
import { useMemo, useState } from 'react'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Badge from '../../../components/ui/Badge'
import Boton from '../../../components/ui/Boton'
import { ChipsFiltrosActivos } from '../../../components/ui/ChipsFiltro'
import FiltroPeriodo from '../../../components/ui/FiltroPeriodo'
import Selector, { OPCION_TODOS, type OpcionSelector } from '../../../components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '../../../components/ui/TablaDatos'
import TarjetaIndicador, { FilaTarjetas } from '../../../components/ui/TarjetaIndicador'
import { useConsulta } from '../../../hooks/useConsulta'
import { useFiltrosUrl } from '../../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS } from '../../../router/rutasApp'
import { obtenerDistribucionPersonal } from '../../../services/api/reportes'
import type {
  FilaDistribucion,
  FiltrosDistribucion,
  ResultadoDistribucionPersonal,
  TotalCuadrillaJornada,
} from '../../../types/reportes'
import { formatearFecha, formatearMinutos, formatearNumero, semanaActual, SIN_VALOR } from '../../../utils/formato'
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

/** Número de operarios y sus nombres; el apoyo eventual lleva la insignia «Apoyo». */
function celdaOperarios(fila: FilaDistribucion) {
  return (
    <div className={estilos.celdaAvance}>
      <span className="cifra">{formatearNumero(fila.numero_operarios)}</span>
      <ul className={`${estilos.listaSinVinetas} ${estilos.textoPequeno}`}>
        {fila.operarios.map((o) => (
          <li key={o.operario_id} className={estilos.enLinea}>
            <span>{o.nombre_completo ?? SIN_VALOR}</span>
            {o.es_apoyo && (
              <Badge tono="info" texto="Apoyo" ayuda="Operario de otra cuadrilla que apoyó en esta actividad" />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

const COLUMNAS_DETALLE: ColumnaTabla<FilaDistribucion>[] = [
  { clave: 'jornada', titulo: 'Jornada', ordenable: true, render: (f) => formatearFecha(f.jornada) },
  { clave: 'cuadrilla_nombre', titulo: 'Cuadrilla', ordenable: true },
  { clave: 'clase_actividad_nombre', titulo: 'Clase de actividad', ordenable: true },
  { clave: 'tipo_actividad_nombre', titulo: 'Tipo de actividad', ordenable: true },
  { clave: 'area_verde_nombre', titulo: 'Espacio', ordenable: true },
  {
    clave: 'numero_actividades',
    titulo: 'N.º de actividades',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearNumero(f.numero_actividades),
  },
  { clave: 'operarios', titulo: 'Operarios', valorOrden: (f) => f.numero_operarios, render: celdaOperarios },
  {
    clave: 'horas_persona',
    titulo: 'Horas-persona',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearNumero(f.horas_persona, 2),
  },
  {
    clave: 'tiempo_minutos',
    titulo: 'Tiempo',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearMinutos(f.tiempo_minutos),
  },
  {
    clave: 'superficie_m2',
    titulo: 'Superficie (m²)',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearNumero(f.superficie_m2),
  },
]

type FilaTotal = TotalCuadrillaJornada & { capataz_nombre: string | null }

const COLUMNAS_TOTALES: ColumnaTabla<FilaTotal>[] = [
  { clave: 'jornada', titulo: 'Jornada', ordenable: true, render: (f) => formatearFecha(f.jornada) },
  { clave: 'cuadrilla_nombre', titulo: 'Cuadrilla', ordenable: true },
  { clave: 'capataz_nombre', titulo: 'Capataz', ordenable: true },
  {
    clave: 'numero_operarios',
    titulo: 'Operarios',
    subtitulo: 'distintos',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearNumero(f.numero_operarios),
  },
  {
    clave: 'horas_persona',
    titulo: 'Horas-persona',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearNumero(f.horas_persona, 2),
  },
  {
    clave: 'tiempo_minutos',
    titulo: 'Tiempo',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearMinutos(f.tiempo_minutos),
  },
  {
    clave: 'superficie_m2',
    titulo: 'Superficie (m²)',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearNumero(f.superficie_m2),
  },
]

/** El back-end no envía el capataz en los totales: se toma de las filas de la misma cuadrilla y jornada. */
function totalesConCapataz(datos: ResultadoDistribucionPersonal): FilaTotal[] {
  const capataces = new Map<string, string | null>()
  for (const f of datos.filas) capataces.set(`${f.jornada}|${f.cuadrilla_id}`, f.capataz_nombre)
  return datos.totales_por_cuadrilla_jornada.map((t) => ({
    ...t,
    capataz_nombre: capataces.get(`${t.jornada}|${t.cuadrilla_id}`) ?? null,
  }))
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
  const { filtros, establecer } = useFiltrosUrl({ ...predeterminado, ...BORRADOR_VACIO })
  const { desde, hasta } = filtros
  const opcionales: Borrador = {
    cuadrilla_id: filtros.cuadrilla_id,
    clase_actividad_id: filtros.clase_actividad_id,
    tipo_actividad_id: filtros.tipo_actividad_id,
    area_verde_id: filtros.area_verde_id,
  }
  const claveOpcionales = JSON.stringify(opcionales)
  const hayOpcionales = Object.values(opcionales).some(Boolean)

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

  const filtrosActivos = FILTROS_OPCIONALES.filter(({ clave }) => opcionales[clave]).map(({ clave, etiqueta }) => ({
    clave,
    texto: `${etiqueta}: ${textoOpcion(clave, opcionales[clave])}`,
  }))

  function limpiarFiltros() {
    establecer({ ...BORRADOR_VACIO })
  }

  return (
    <PlantillaReporte
      consulta={consulta}
      filtros={
        <>
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
            onQuitar={(clave) => establecer({ [clave]: null } as Partial<Record<ClaveFiltro, null>>)}
            onLimpiar={limpiarFiltros}
          />
        </>
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
        return (
          <>
            {resumen && (
              <FilaTarjetas>
                <TarjetaIndicador etiqueta="Jornadas con parte" valor={formatearNumero(resumen.jornadas_con_parte)} />
                <TarjetaIndicador etiqueta="Operarios distintos" valor={formatearNumero(resumen.operarios_distintos)} />
                <TarjetaIndicador etiqueta="Horas-persona" valor={formatearNumero(resumen.horas_persona, 2)} />
                <TarjetaIndicador
                  etiqueta="Actividades sin tiempo registrado"
                  valor={formatearNumero(sinTiempo)}
                  estado={sinTiempo > 0 ? 'alerta' : 'normal'}
                  contexto={sinTiempo > 0 ? 'Su tiempo no suma en las horas-persona' : undefined}
                  insignia={sinTiempo > 0 ? { tono: 'advertencia', texto: 'Sin tiempo registrado' } : undefined}
                />
              </FilaTarjetas>
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

            <section className={estilos.seccion} aria-labelledby="titulo-totales">
              <h2 id="titulo-totales" className={estilos.tituloSeccion}>
                Totales por cuadrilla y jornada
              </h2>
              <TablaDatos
                titulo="Totales por cuadrilla y jornada"
                columnas={COLUMNAS_TOTALES}
                filas={totalesConCapataz(datos)}
                claveFila={(f) => `${f.jornada}-${f.cuadrilla_id}`}
                ordenInicial={{ clave: 'jornada', direccion: 'asc' }}
              />
            </section>

            <section className={estilos.seccion} aria-labelledby="titulo-detalle">
              <h2 id="titulo-detalle" className={estilos.tituloSeccion}>
                Detalle por actividad y espacio
              </h2>
              <TablaDatos
                titulo="Detalle por actividad y espacio"
                columnas={COLUMNAS_DETALLE}
                filas={datos.filas}
                claveFila={(f, i) => `${f.jornada}-${f.cuadrilla_id}-${f.tipo_actividad_id}-${f.area_verde_id}-${i}`}
              />
            </section>
          </>
        )
      }}
    </PlantillaReporte>
  )
}
