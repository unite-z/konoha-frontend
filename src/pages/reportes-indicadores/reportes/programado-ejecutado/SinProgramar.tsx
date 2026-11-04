/**
 * Ejecuciones del periodo sin programación vinculada (RF-REP-010): atenciones o actividades que se hicieron sin
 * estar programadas. Tabla en escritorio y fichas en móvil.
 */
import { useEsMovil } from '@/components/reportes-indicadores/useEsMovil'
import EstadoVacio from '@/components/ui/EstadoVacio'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import type { EjecucionVinculada } from '@/types/reportesGestion'
import { formatearFechaHora } from '@/utils/formato'
import CodigoEjecucion from './CodigoEjecucion'
import estilos from './ProgramadoEjecutado.module.css'
import Estado from '@/components/ui/Estado'

const ORIGEN: Record<EjecucionVinculada['origen'], string> = { Atencion: 'Atención tercerizada', Actividad: 'Actividad de personal propio' }

const COLUMNAS: ColumnaTabla<EjecucionVinculada>[] = [
  { clave: 'codigo', titulo: 'Código', ordenable: true, render: (e) => <CodigoEjecucion ejecucion={e} /> },
  { clave: 'origen', titulo: 'Origen', ordenable: true, render: (e) => ORIGEN[e.origen] },
  { clave: 'estado', titulo: 'Estado', render: (e) => <Estado tono="neutro" texto={e.etiqueta_estado} /> },
  { clave: 'inicio_real', titulo: 'Inicio real', ordenable: true, render: (e) => formatearFechaHora(e.inicio_real) },
  { clave: 'fin_real', titulo: 'Fin real', ordenable: true, render: (e) => formatearFechaHora(e.fin_real) },
]

const VACIO = {
  titulo: 'Todas las ejecuciones están programadas',
  descripcion: 'No hay ejecuciones sin programación en el periodo.',
  nivel: 3 as const,
}

export default function SinProgramar({ ejecuciones }: { ejecuciones: EjecucionVinculada[] }) {
  const esMovil = useEsMovil()
  if (!esMovil) {
    return (
      <TablaDatos
        titulo="Ejecuciones sin programar"
        columnas={COLUMNAS}
        filas={ejecuciones}
        claveFila={(e) => `${e.origen}-${e.id}`}
        ordenInicial={{ clave: 'inicio_real', direccion: 'desc' }}
        vacio={VACIO}
      />
    )
  }
  if (ejecuciones.length === 0) return <EstadoVacio {...VACIO} />
  return (
    <ul className={estilos.fichas} aria-label="Ejecuciones sin programar">
      {ejecuciones.map((e) => (
        <li key={`${e.origen}-${e.id}`} className={estilos.ficha}>
          <div className={estilos.cabeceraFicha}>
            <span className={estilos.tituloFicha}>
              <CodigoEjecucion ejecucion={e} />
            </span>
            <Estado tono="neutro" texto={e.etiqueta_estado} />
          </div>
          <p className={estilos.metaFicha}>{ORIGEN[e.origen]}</p>
          <p className={`${estilos.metaFicha} cifra`}>
            {formatearFechaHora(e.inicio_real)} – {formatearFechaHora(e.fin_real)}
          </p>
        </li>
      ))}
    </ul>
  )
}
