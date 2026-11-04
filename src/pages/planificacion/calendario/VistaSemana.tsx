// Excepción al sistema (AV-351): cada actividad de la semana es un <button> que abre su detalle; es un dato interactivo del calendario, no una acción de página.
/**
 * Vista Semana del calendario con capas (AV-266, Figma «Calendario · Semana» 361-2252): cabecera de los 7 días,
 * fila «todo el día» con las restricciones y las actividades de varios días, y debajo, en la columna de su día,
 * las actividades de un solo día. Al pulsar una actividad se abre su detalle.
 */
import EventoCalendario from '@/components/ui/EventoCalendario'
import type { FechaIso } from '@/types/comun'
import { DIAS_SEMANA_CORTOS, actividadesDeUnDia, filaTodoElDia, type EventoCapa } from './calendarioCapas'
import estilos from './Calendario.module.css'

export interface VistaSemanaProps {
  dias: FechaIso[]
  eventos: EventoCapa[]
  hoy: FechaIso
  seleccionada: string | null
  onSeleccionar: (clave: string) => void
}

export default function VistaSemana({ dias, eventos, hoy, seleccionada, onSeleccionar }: VistaSemanaProps) {
  const todoElDia = filaTodoElDia(dias, eventos)
  const carriles = Math.max(1, ...todoElDia.segmentos.map((segmento) => segmento.carril + 1))

  function actividad(evento: EventoCapa, barra: boolean) {
    const responsable = evento.capa === 'actividad' ? (evento.programacion.proveedor ?? 'Personal propio') : ''
    return (
      <button
        type="button"
        className={`${estilos.actividadSemana} ${barra ? estilos.actividadBarra : ''} ${seleccionada === evento.clave ? estilos.actividadSeleccionada : ''}`}
        aria-pressed={seleccionada === evento.clave}
        aria-label={`${evento.texto}, ${responsable}`}
        onClick={() => onSeleccionar(evento.clave)}
      >
        <EventoCalendario tipo={evento.tipo} texto={evento.texto} ajustar={!barra} />
        {!barra && <span className={estilos.responsable}>{responsable}</span>}
      </button>
    )
  }

  return (
    <div className={estilos.semanaVista}>
      <div className={estilos.columnasSemana}>
        {dias.map((dia, indice) => (
          <div key={dia} className={estilos.cabeceraDia} aria-current={dia === hoy ? 'date' : undefined}>
            <span className={estilos.detalle}>{DIAS_SEMANA_CORTOS[indice]}</span>
            <span className={`${estilos.numeroSemana} ${dia === hoy ? estilos.hoy : ''}`}>{Number(dia.slice(8, 10))}</span>
          </div>
        ))}
      </div>

      <div
        className={estilos.todoElDia}
        aria-label="Todo el día"
        role="group"
        style={{ gridTemplateRows: `repeat(${carriles}, auto)` }} // estilo-calculado: carriles de la semana
      >
        {todoElDia.segmentos.map((segmento) => (
          <div
            key={segmento.evento.clave}
            className={estilos.segmentoSemana}
            style={{ gridColumn: `${segmento.columna} / span ${segmento.dias}`, gridRow: segmento.carril + 1 }} // estilo-calculado: días y carril del evento
          >
            {segmento.evento.capa === 'actividad' ? (
              actividad(segmento.evento, true)
            ) : (
              <EventoCalendario tipo={segmento.evento.tipo} texto={segmento.evento.texto} ajustar />
            )}
          </div>
        ))}
      </div>

      <div className={estilos.columnasSemana}>
        {dias.map((dia) => (
          <ul key={dia} className={estilos.columnaDia} aria-label={`Actividades del ${Number(dia.slice(8, 10))}`}>
            {actividadesDeUnDia(dia, eventos).map((evento) => (
              <li key={evento.clave}>{actividad(evento, false)}</li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
