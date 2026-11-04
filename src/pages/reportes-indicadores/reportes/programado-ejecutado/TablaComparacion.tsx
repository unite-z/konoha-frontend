/**
 * Trabajos programados con sus ejecuciones vinculadas (RF-REP-010, criterio 1). En escritorio, una tabla paginada en
 * el cliente; en móvil, una ficha por trabajo. Con `hoy`, marca «Vencido» los pendientes fuera de plazo.
 * Se usa en las pestañas «Comparación» y «Pendientes» y en el diálogo «Ver detalles» del gráfico.
 */
import { fechaCorta } from '@/components/reportes-indicadores/graficos/escala'
import { useEsMovil } from '@/components/reportes-indicadores/useEsMovil'
import EstadoVacio from '@/components/ui/EstadoVacio'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import type { FilaProgramadoEjecutado } from '@/types/reportesGestion'
import { textoModalidad } from '@/utils/estados'
import { formatearFecha, formatearFechaHora, SIN_VALOR } from '@/utils/formato'
import { esVencido, insigniaSituacion, textoDesviacion } from '@/utils/programadoEjecutado'
import CodigoEjecucion from './CodigoEjecucion'
import estilos from './ProgramadoEjecutado.module.css'
import Estado from '@/components/ui/Estado'
import { insigniaAEstado } from '@/components/ui/tonos'

function Ejecuciones({ fila }: { fila: FilaProgramadoEjecutado }) {
  if (fila.ejecuciones.length === 0) return <span className={estilos.atenuado}>Sin ejecución</span>
  return (
    <span className={estilos.codigos}>
      {fila.ejecuciones.map((e) => (
        <CodigoEjecucion key={`${e.origen}-${e.id}`} ejecucion={e} />
      ))}
    </span>
  )
}

/** Primer inicio y último fin reales de las ejecuciones. */
function reales(fila: FilaProgramadoEjecutado): { inicio: string | null; fin: string | null } {
  const inicios = fila.ejecuciones.map((e) => e.inicio_real).filter((v): v is string => v !== null).sort()
  const fines = fila.ejecuciones.map((e) => e.fin_real).filter((v): v is string => v !== null).sort()
  return { inicio: inicios[0] ?? null, fin: fines[fines.length - 1] ?? null }
}

function Situacion({ fila, hoy }: { fila: FilaProgramadoEjecutado; hoy?: string }) {
  return (
    <span className={estilos.codigos}>
      <Estado {...insigniaAEstado(insigniaSituacion(fila.situacion))} />
      {hoy && fila.situacion === 'Pendiente' && esVencido(fila, hoy) && <Estado tono="error" texto="Vencido" />}
    </span>
  )
}

function columnas(hoy?: string): ColumnaTabla<FilaProgramadoEjecutado>[] {
  return [
    {
      clave: 'tipo_servicio',
      titulo: 'Servicio',
      ordenable: true,
      multilinea: true,
      render: (f) => (
        <span className={estilos.celdaServicio}>
          {f.tipo_servicio}
          <span className={estilos.atenuado}>
            {textoModalidad(f.modalidad)}
            {f.responsable ? ` · ${f.responsable}` : ''}
          </span>
        </span>
      ),
    },
    { clave: 'espacio', titulo: 'Espacio', ordenable: true },
    { clave: 'inicio_previsto', titulo: 'Inicio previsto', ordenable: true, render: (f) => formatearFecha(f.inicio_previsto) },
    { clave: 'fin_previsto', titulo: 'Fin previsto', ordenable: true, render: (f) => formatearFecha(f.fin_previsto) },
    { clave: 'ejecuciones', titulo: 'Ejecuciones', render: (f) => <Ejecuciones fila={f} /> },
    { clave: 'inicio_real', titulo: 'Inicio real', render: (f) => formatearFechaHora(reales(f).inicio) },
    { clave: 'fin_real', titulo: 'Fin real', render: (f) => formatearFechaHora(reales(f).fin) },
    { clave: 'situacion', titulo: 'Situación', ordenable: true, valorOrden: (f) => f.etiqueta_situacion, render: (f) => <Situacion fila={f} hoy={hoy} /> },
    {
      clave: 'desviacion_dias',
      titulo: 'Desviación',
      alineacion: 'derecha',
      ordenable: true,
      render: (f) => textoDesviacion(f.desviacion_dias),
    },
  ]
}

function textoPeriodo(inicio: string | null, fin: string | null): string {
  if (!inicio) return SIN_VALOR
  return `${fechaCorta(inicio)}–${fin ? fechaCorta(fin) : '…'}`
}

function Ficha({ fila, hoy }: { fila: FilaProgramadoEjecutado; hoy?: string }) {
  const real = reales(fila)
  const desviacion = fila.desviacion_dias !== null && fila.desviacion_dias > 0 ? ` (${textoDesviacion(fila.desviacion_dias)})` : ''
  return (
    <li className={estilos.ficha}>
      <div className={estilos.cabeceraFicha}>
        <span className={estilos.tituloFicha}>{fila.tipo_servicio}</span>
        <Situacion fila={fila} hoy={hoy} />
      </div>
      <p className={estilos.metaFicha}>{[fila.espacio, fila.responsable].filter(Boolean).join(' · ') || SIN_VALOR}</p>
      <p className={`${estilos.metaFicha} cifra`}>
        Previsto {textoPeriodo(fila.inicio_previsto, fila.fin_previsto)} · Real {textoPeriodo(real.inicio, real.fin)}
        {desviacion}
      </p>
      <div className={estilos.pieFicha}>
        <Ejecuciones fila={fila} />
      </div>
    </li>
  )
}

export interface TablaComparacionProps {
  titulo: string
  filas: FilaProgramadoEjecutado[]
  /** Hoy en Lima: marca los pendientes vencidos. */
  hoy?: string
  /** Mantiene el orden recibido (por ejemplo, los pendientes ya ordenados). */
  sinOrdenInicial?: boolean
}

export default function TablaComparacion({ titulo, filas, hoy, sinOrdenInicial = false }: TablaComparacionProps) {
  const esMovil = useEsMovil()
  const vacio = { titulo: 'Sin trabajos', descripcion: 'No hay trabajos programados con este criterio.', nivel: 3 as const }
  if (esMovil) {
    if (filas.length === 0) return <EstadoVacio {...vacio} />
    return (
      <ul className={estilos.fichas} aria-label={titulo}>
        {filas.map((f) => (
          <Ficha key={f.programacion_id} fila={f} hoy={hoy} />
        ))}
      </ul>
    )
  }
  return (
    <TablaDatos
      titulo={titulo}
      columnas={columnas(hoy)}
      filas={filas}
      claveFila={(f) => String(f.programacion_id)}
      ordenInicial={sinOrdenInicial ? undefined : { clave: 'inicio_previsto', direccion: 'desc' }}
      vacio={vacio}
    />
  )
}
