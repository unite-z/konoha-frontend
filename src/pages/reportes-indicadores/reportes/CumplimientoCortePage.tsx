// RF-REP-002 · HU-MOD06-009 · CU-MOD06-009 · CP-TR-MOD06-009
/**
 * Cumplimiento del corte de césped: días entre ciclos frente a la frecuencia y días de ejecución frente a
 * la duración máxima.
 *
 * HU-MOD06-009: si faltan fechas o límites, se informa de la falta y no se muestra cumplimiento calculado
 * (la celda muestra «—»).
 *
 * Supuesto: periodo predeterminado a confirmar con la contraparte (CU-MOD06-001). Aquí, del 1 de enero del
 * año actual a hoy, porque los ciclos de corte se repiten cada 30 a 45 días.
 */
import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import Badge from '../../../components/ui/Badge'
import BarraAvance from '../../../components/ui/BarraAvance'
import Boton from '../../../components/ui/Boton'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import FiltroPeriodo from '../../../components/ui/FiltroPeriodo'
import TablaDatos, { type ColumnaTabla } from '../../../components/ui/TablaDatos'
import TarjetaIndicador, { type TarjetaIndicadorProps } from '../../../components/ui/TarjetaIndicador'
import { useConsulta } from '../../../hooks/useConsulta'
import { useFiltrosUrl } from '../../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS } from '../../../router/rutasApp'
import { obtenerCumplimientoCorte } from '../../../services/api/reportes'
import type { FilaCumplimiento, ResultadoCumplimientoCorte, ResumenCumplimiento } from '../../../types/reportes'
import { DURACION_SIN_CALCULO, FRECUENCIA_SIN_CALCULO, tonoCumplimiento } from '../../../utils/estados'
import { anioActualHastaHoy, formatearFecha, formatearNumero, SIN_VALOR } from '../../../utils/formato'
import { erroresDePeriodo } from './erroresPeriodo'
import PlantillaReporte from './PlantillaReporte'
import estilos from './Reportes.module.css'
import estilosCorte from './CumplimientoCorte.module.css'

const TITULO = 'Cumplimiento del corte de césped'
const ID_PERIODO = 'periodo-corte'

/** Móvil (punto de corte del proyecto): los ciclos se muestran como fichas en lugar de la tabla. */
const CONSULTA_MOVIL = '(max-width: 767px)'

/** Fichas que se muestran de una vez en móvil (igual que la página de la tabla). */
const FICHAS_POR_TANDA = 25

function suscribirMovil(aviso: () => void): () => void {
  const consulta = window.matchMedia(CONSULTA_MOVIL)
  consulta.addEventListener('change', aviso)
  return () => consulta.removeEventListener('change', aviso)
}

function useEsMovil(): boolean {
  return useSyncExternalStore(
    suscribirMovil,
    () => window.matchMedia(CONSULTA_MOVIL).matches,
    () => false,
  )
}

/** Faltantes del back-end que afectan a la duración (el resto afectan a la frecuencia). */
const PATRON_FALTANTE_DURACION = /fin de corte|limpieza|duración/i

function motivoDuracion(ciclo: FilaCumplimiento): string {
  return ciclo.faltantes.find((f) => PATRON_FALTANTE_DURACION.test(f)) ?? 'Sin fecha de fin de corte'
}

function motivoFrecuencia(ciclo: FilaCumplimiento): string {
  return ciclo.faltantes.find((f) => !PATRON_FALTANTE_DURACION.test(f)) ?? ciclo.estado_frecuencia
}

function duracionCalculada(ciclo: FilaCumplimiento): boolean {
  return !DURACION_SIN_CALCULO.has(ciclo.estado_duracion) && ciclo.dias_corte !== null
}

function frecuenciaCalculada(ciclo: FilaCumplimiento): boolean {
  return !FRECUENCIA_SIN_CALCULO.has(ciclo.estado_frecuencia) && ciclo.dias_entre_ciclos !== null
}

/** Tarjeta «Último ciclo de corte». */
function tarjetaUltimoCiclo(ciclo: FilaCumplimiento | null): TarjetaIndicadorProps {
  const etiqueta = 'Último ciclo de corte'
  if (!ciclo) return { etiqueta, estado: 'sinDatos', motivoSinDatos: 'Sin fecha de fin de corte' }
  const insignia = { tono: tonoCumplimiento(ciclo.estado_duracion), texto: ciclo.estado_duracion }
  if (!duracionCalculada(ciclo)) {
    return { etiqueta, estado: 'sinDatos', motivoSinDatos: motivoDuracion(ciclo), insignia }
  }
  const valor =
    ciclo.dias_limpieza === null ? formatearNumero(ciclo.dias_corte) : `${ciclo.dias_corte} + ${ciclo.dias_limpieza}`
  return {
    etiqueta,
    valor,
    unidad: 'días',
    contexto: `Máximo: ${ciclo.duracion_maxima_dias ?? SIN_VALOR} + ${ciclo.dias_limpieza_maximo ?? SIN_VALOR} días`,
    insignia,
    estado: ciclo.estado_duracion === 'Excede el máximo' ? 'alerta' : 'normal',
  }
}

/** Tarjeta «Días desde el ciclo anterior». */
function tarjetaFrecuencia(ciclo: FilaCumplimiento | null): TarjetaIndicadorProps {
  const etiqueta = 'Días desde el ciclo anterior'
  if (!ciclo) return { etiqueta, estado: 'sinDatos' }
  const insignia = { tono: tonoCumplimiento(ciclo.estado_frecuencia), texto: ciclo.estado_frecuencia }
  if (!frecuenciaCalculada(ciclo)) {
    return { etiqueta, estado: 'sinDatos', motivoSinDatos: motivoFrecuencia(ciclo), insignia }
  }
  return {
    etiqueta,
    valor: formatearNumero(ciclo.dias_entre_ciclos),
    unidad: 'días',
    contexto: `Frecuencia práctica: ${ciclo.frecuencia_practica_dias ?? SIN_VALOR} días · máximo ${
      ciclo.frecuencia_maxima_dias ?? SIN_VALOR
    }`,
    insignia,
    estado: ciclo.estado_frecuencia === 'Fuera de frecuencia' ? 'alerta' : 'normal',
  }
}

/** Contexto de «Ciclos en el periodo»: «4 dentro de la frecuencia · 1 tolerado · 1 fuera». */
function contextoCiclos(resumen: ResumenCumplimiento): string {
  const conteo = resumen.por_estado_frecuencia
  const partes: string[] = []
  const dentro = conteo['Dentro de la frecuencia'] ?? 0
  const tolerados = conteo.Tolerado ?? 0
  const fuera = conteo['Fuera de frecuencia'] ?? 0
  if (dentro > 0) partes.push(`${dentro} dentro de la frecuencia`)
  if (tolerados > 0) partes.push(`${tolerados} ${tolerados === 1 ? 'tolerado' : 'tolerados'}`)
  if (fuera > 0) partes.push(`${fuera} fuera`)
  return partes.join(' · ')
}

/** «práctica / máxima» de la frecuencia. */
function textoFrecuencia(c: FilaCumplimiento): string {
  return c.frecuencia_practica_dias === null && c.frecuencia_maxima_dias === null
    ? SIN_VALOR
    : `${c.frecuencia_practica_dias ?? SIN_VALOR} / ${c.frecuencia_maxima_dias ?? SIN_VALOR}`
}

/** Días de ejecución frente al máximo, con barra de avance. */
function avanceTotal(c: FilaCumplimiento): ReactNode {
  if (!duracionCalculada(c) || c.dias_total === null || c.maximo_total === null) return SIN_VALOR
  const texto = `${c.dias_total} de ${c.maximo_total}`
  return (
    <div className={estilos.celdaAvance}>
      <span className="cifra">{texto}</span>
      <BarraAvance
        valor={c.dias_total}
        maximo={c.maximo_total}
        etiqueta="Días de ejecución frente al máximo"
        textoValor={texto}
        alerta={c.estado_duracion === 'Excede el máximo'}
      />
    </div>
  )
}

function listaFaltantes(c: FilaCumplimiento): ReactNode {
  return c.faltantes.length === 0 ? (
    SIN_VALOR
  ) : (
    <ul className={`${estilos.listaSimple} ${estilos.textoPequeno}`}>
      {c.faltantes.map((f) => (
        <li key={f}>{f}</li>
      ))}
    </ul>
  )
}

/** Ficha de un ciclo (móvil). Muestra los mismos datos que una fila de la tabla. */
function FichaCiclo({ ciclo: c }: { ciclo: FilaCumplimiento }) {
  const idTitulo = `ciclo-${c.ciclo_id}`
  const lugar = [c.ruta_nombre, c.proveedor_razon_social, c.estacion].filter(Boolean).join(' · ')
  return (
    <li>
      <article className={estilosCorte.ficha} aria-labelledby={idTitulo}>
        <div>
          <div className={estilosCorte.cabeceraFicha}>
            <h3 id={idTitulo} className={estilosCorte.tituloFicha}>
              Inicio: {formatearFecha(c.fecha_inicio_real)}
            </h3>
            {c.estado_ciclo && <Badge tono="neutral" texto={c.estado_ciclo} />}
          </div>
          {lugar && <p className={estilosCorte.subtituloFicha}>{lugar}</p>}
        </div>

        <div className={estilosCorte.bloque}>
          <div className={estilosCorte.cabeceraBloque}>
            <p className={estilosCorte.tituloBloque}>Frecuencia</p>
            <Badge tono={tonoCumplimiento(c.estado_frecuencia)} texto={c.estado_frecuencia} />
          </div>
          <dl className={estilosCorte.datos}>
            <div>
              <dt>Días desde el anterior</dt>
              <dd className="cifra">{frecuenciaCalculada(c) ? formatearNumero(c.dias_entre_ciclos) : SIN_VALOR}</dd>
            </div>
            <div>
              <dt>Práctica / máxima</dt>
              <dd className="cifra">{textoFrecuencia(c)}</dd>
            </div>
          </dl>
        </div>

        <div className={estilosCorte.bloque}>
          <div className={estilosCorte.cabeceraBloque}>
            <p className={estilosCorte.tituloBloque}>Duración</p>
            <Badge tono={tonoCumplimiento(c.estado_duracion)} texto={c.estado_duracion} />
          </div>
          <dl className={estilosCorte.datos}>
            <div>
              <dt>Días de corte</dt>
              <dd className="cifra">{formatearNumero(c.dias_corte)}</dd>
            </div>
            <div>
              <dt>Días de limpieza</dt>
              <dd className="cifra">{formatearNumero(c.dias_limpieza)}</dd>
            </div>
            <div className={estilosCorte.datoAncho}>
              <dt>Total frente al máximo</dt>
              <dd>{avanceTotal(c)}</dd>
            </div>
          </dl>
        </div>

        {c.faltantes.length > 0 && (
          <div className={estilosCorte.bloque}>
            <p className={estilosCorte.tituloBloque}>Faltantes</p>
            {listaFaltantes(c)}
          </div>
        )}
      </article>
    </li>
  )
}

/** Lista de ciclos en móvil: del más reciente al más antiguo, en tandas de 25. */
function ListaCiclosMovil({ ciclos }: { ciclos: FilaCumplimiento[] }) {
  const [visibles, setVisibles] = useState(FICHAS_POR_TANDA)
  const ordenados = useMemo(
    () =>
      [...ciclos].sort(
        (a, b) => b.fecha_inicio_real.localeCompare(a.fecha_inicio_real) || b.ciclo_id - a.ciclo_id,
      ),
    [ciclos],
  )
  const mostrados = ordenados.slice(0, visibles)
  return (
    <>
      <ul className={estilosCorte.listaCiclos} aria-label="Ciclos de corte">
        {mostrados.map((c) => (
          <FichaCiclo key={c.ciclo_id} ciclo={c} />
        ))}
      </ul>
      {ordenados.length > FICHAS_POR_TANDA && (
        <div className={estilosCorte.pieLista}>
          <p className="cifra">
            Mostrando {formatearNumero(mostrados.length)} de {formatearNumero(ordenados.length)}
          </p>
          {mostrados.length < ordenados.length && (
            <Boton variante="secundario" onClick={() => setVisibles((n) => n + FICHAS_POR_TANDA)}>
              Mostrar más ciclos
            </Boton>
          )}
        </div>
      )}
    </>
  )
}

const COLUMNAS: ColumnaTabla<FilaCumplimiento>[] = [
  {
    clave: 'fecha_inicio_real',
    titulo: 'Inicio',
    ordenable: true,
    render: (c) => formatearFecha(c.fecha_inicio_real),
  },
  {
    clave: 'estado_ciclo',
    titulo: 'Estado del ciclo',
    ordenable: true,
    render: (c) => (c.estado_ciclo ? <Badge tono="neutral" texto={c.estado_ciclo} /> : SIN_VALOR),
  },
  { clave: 'proveedor_razon_social', titulo: 'Proveedor', ordenable: true },
  { clave: 'ruta_nombre', titulo: 'Ruta', ordenable: true },
  { clave: 'estacion', titulo: 'Estación', ordenable: true },
  {
    clave: 'dias_entre_ciclos',
    titulo: 'Días desde el anterior',
    alineacion: 'derecha',
    ordenable: true,
    valorOrden: (c) => (frecuenciaCalculada(c) ? c.dias_entre_ciclos : null),
    render: (c) => (frecuenciaCalculada(c) ? formatearNumero(c.dias_entre_ciclos) : SIN_VALOR),
  },
  {
    clave: 'frecuencia',
    titulo: 'Frecuencia',
    subtitulo: 'práctica / máxima',
    alineacion: 'derecha',
    render: textoFrecuencia,
  },
  {
    clave: 'estado_frecuencia',
    titulo: 'Cumplimiento de frecuencia',
    ordenable: true,
    render: (c) => <Badge tono={tonoCumplimiento(c.estado_frecuencia)} texto={c.estado_frecuencia} />,
  },
  {
    clave: 'dias_corte',
    titulo: 'Días de corte',
    alineacion: 'derecha',
    ordenable: true,
    render: (c) => formatearNumero(c.dias_corte),
  },
  {
    clave: 'dias_limpieza',
    titulo: 'Días de limpieza',
    alineacion: 'derecha',
    ordenable: true,
    render: (c) => formatearNumero(c.dias_limpieza),
  },
  {
    clave: 'dias_total',
    titulo: 'Total frente al máximo',
    render: avanceTotal,
  },
  {
    clave: 'estado_duracion',
    titulo: 'Cumplimiento de duración',
    ordenable: true,
    render: (c) => <Badge tono={tonoCumplimiento(c.estado_duracion)} texto={c.estado_duracion} />,
  },
  {
    clave: 'faltantes',
    titulo: 'Faltantes',
    multilinea: true,
    render: listaFaltantes,
  },
]

export default function CumplimientoCortePage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.reportes, { texto: TITULO }])

  const predeterminado = useMemo(() => anioActualHastaHoy(), [])
  const { filtros, establecer } = useFiltrosUrl({ desde: predeterminado.desde, hasta: predeterminado.hasta })
  const { desde, hasta } = filtros
  const esMovil = useEsMovil()

  const consulta = useConsulta<ResultadoCumplimientoCorte>(
    `${desde}|${hasta}`,
    (signal) => obtenerCumplimientoCorte({ desde, hasta }, signal),
    (datos) => datos.sin_datos,
  )

  return (
    <PlantillaReporte
      consulta={consulta}
      filtros={
        <div className={estilosCorte.filtros}>
          <FiltroPeriodo
            idBase={ID_PERIODO}
            desde={desde}
            hasta={hasta}
            onAplicar={(periodo) => (periodo.desde === desde && periodo.hasta === hasta ? consulta.reintentar() : establecer(periodo))}
            erroresServidor={erroresDePeriodo(consulta.error)}
            cargando={consulta.estado === 'cargando' && consulta.cargaVisible}
          />
        </div>
      }
      vacio={{
        titulo: 'Sin ciclos de corte en el periodo',
        accion: (
          <Boton variante="secundario" onClick={() => document.getElementById(`${ID_PERIODO}-desde`)?.focus()}>
            Cambiar el periodo
          </Boton>
        ),
      }}
    >
      {(datos) => {
        const hayFaltas = datos.ciclos.some(
          (c) => FRECUENCIA_SIN_CALCULO.has(c.estado_frecuencia) || DURACION_SIN_CALCULO.has(c.estado_duracion),
        )
        return (
          <>
            <div className={estilosCorte.tarjetas}>
              <TarjetaIndicador {...tarjetaUltimoCiclo(datos.ultimo_ciclo)} />
              <TarjetaIndicador {...tarjetaFrecuencia(datos.ultimo_ciclo)} />
              <TarjetaIndicador
                etiqueta="Ciclos en el periodo"
                valor={formatearNumero(datos.resumen?.total_ciclos ?? datos.ciclos.length)}
                contexto={datos.resumen ? contextoCiclos(datos.resumen) : undefined}
              />
            </div>

            <section className={estilos.seccion} aria-labelledby="titulo-ciclos">
              <h2 id="titulo-ciclos" className={estilos.tituloSeccion}>
                Ciclos de corte
              </h2>
              {hayFaltas && (
                <AvisoEnLinea tono="advertencia">
                  Hay ciclos sin fechas o sin límites configurados: su cumplimiento no se calcula. Revisa la
                  frecuencia y la duración del servicio en Planificación.
                </AvisoEnLinea>
              )}
              {esMovil ? (
                // Se reinicia (vuelve a 25 fichas) al cambiar los ciclos, como la tabla con su página.
                <ListaCiclosMovil key={datos.ciclos.map((c) => c.ciclo_id).join('|')} ciclos={datos.ciclos} />
              ) : (
                <TablaDatos
                  titulo="Ciclos de corte"
                  columnas={COLUMNAS}
                  filas={datos.ciclos}
                  claveFila={(c) => String(c.ciclo_id)}
                  ordenInicial={{ clave: 'fecha_inicio_real', direccion: 'desc' }}
                />
              )}
            </section>
          </>
        )
      }}
    </PlantillaReporte>
  )
}
