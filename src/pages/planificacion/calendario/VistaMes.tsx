// Excepción al sistema (AV-351): cada día del mes es un <button> que selecciona la fecha y abre su agenda; es un dato interactivo del calendario, no una acción de página.
/**
 * Vista Mes del calendario con capas (AV-266, Figma «Calendario con capas» 344-436). Cada semana es una rejilla de
 * 7 columnas: los días van al fondo y los eventos encima, en carriles, para que una barra de varios días ocupe sus
 * columnas. Los eventos no son interactivos: se eligen desde el día, y la agenda los lista con su detalle.
 */
import EventoCalendario from '@/components/ui/EventoCalendario'
import type { FechaIso } from '@/types/comun'
import { CARRILES_VISIBLES, DIAS_SEMANA_CORTOS, distribuirSemana, etiquetaDia, type EventoCapa } from './calendarioCapas'
import estilos from './Calendario.module.css'

export interface VistaMesProps {
  semanas: FechaIso[][]
  eventos: EventoCapa[]
  /** Mes que se muestra (`AAAA-MM`): los días de otros meses van atenuados. */
  mes: string
  hoy: FechaIso
  seleccionado: FechaIso | null
  onSeleccionar: (dia: FechaIso) => void
}

export default function VistaMes({ semanas, eventos, mes, hoy, seleccionado, onSeleccionar }: VistaMesProps) {
  return (
    <div className={estilos.mes}>
      <div className={estilos.cabeceraSemana} aria-hidden="true">
        {DIAS_SEMANA_CORTOS.map((dia) => (
          <span key={dia}>{dia}</span>
        ))}
      </div>
      {semanas.map((dias) => {
        const semana = distribuirSemana(dias, eventos)
        return (
          <div key={dias[0]} className={estilos.semana}>
            {dias.map((dia, indice) => {
              const clases = [
                estilos.dia,
                dia.slice(0, 7) !== mes ? estilos.fueraDeMes : '',
                dia === seleccionado ? estilos.seleccionado : '',
                semana.segmentos.some((s) => s.evento.inicio <= dia && s.evento.fin >= dia) || semana.ocultos[indice] > 0 ? estilos.conEventos : '',
              ]
              return (
                <button
                  key={dia}
                  type="button"
                  className={clases.filter(Boolean).join(' ')}
                  style={{ gridColumn: indice + 1 }} // estilo-calculado: columna del día
                  aria-pressed={dia === seleccionado}
                  aria-current={dia === hoy ? 'date' : undefined}
                  aria-label={etiquetaDia(dia, eventos)}
                  onClick={() => onSeleccionar(dia)}
                >
                  <span className={`${estilos.numero} ${dia === hoy ? estilos.hoy : ''}`}>{Number(dia.slice(8, 10))}</span>
                </button>
              )
            })}
            {semana.segmentos.map((segmento) => (
              <span
                key={segmento.evento.clave}
                className={estilos.segmento}
                aria-hidden="true"
                style={{ gridColumn: `${segmento.columna} / span ${segmento.dias}`, gridRow: segmento.carril + 2 }} // estilo-calculado: días y carril del evento
              >
                <EventoCalendario tipo={segmento.evento.tipo} texto={segmento.evento.texto} barra={segmento.dias > 1} />
              </span>
            ))}
            {semana.ocultos.map((ocultos, indice) =>
              ocultos > 0 ? (
                <span
                  key={dias[indice]}
                  className={estilos.segmento}
                  aria-hidden="true"
                  style={{ gridColumn: indice + 1, gridRow: CARRILES_VISIBLES + 2 }} // estilo-calculado: columna del día
                >
                  <EventoCalendario tipo="mas" texto={`+${ocultos} más`} />
                </span>
              ) : null,
            )}
          </div>
        )
      })}
    </div>
  )
}
