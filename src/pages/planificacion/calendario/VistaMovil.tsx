/**
 * Calendario en móvil (AV-266, Figma 352-2192): el mes con las flechas de semana, la tira de lunes a domingo con un
 * punto por día (el evento más fuerte) y la agenda de la semana, día a día. Tocar un día lo selecciona.
 */
import Boton from '@/components/ui/Boton'
import EstadoVacio from '@/components/ui/EstadoVacio'
import EventoCalendario from '@/components/ui/EventoCalendario'
import type { FechaIso } from '@/types/comun'
import { nombreMes, sumarDias } from '../resumen/resumenPlanificacion'
import { agendaSemana, diasDeSemana, puntoDelDia, tituloDia, type EventoCapa } from './calendarioCapas'
import estilos from './Calendario.module.css'

const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export interface VistaMovilProps {
  fecha: FechaIso
  hoy: FechaIso
  eventos: EventoCapa[]
  onCambiarFecha: (fecha: FechaIso) => void
}

export default function VistaMovil({ fecha, hoy, eventos, onCambiarFecha }: VistaMovilProps) {
  const dias = diasDeSemana(fecha)
  const agenda = agendaSemana(dias, eventos)
  return (
    <div className={estilos.movil}>
      <div className={estilos.cabeceraMovil}>
        <h2 className={estilos.tituloMes} aria-live="polite">
          {nombreMes(fecha)}
        </h2>
        <span className={estilos.navegacionMovil}>
          <Boton variante="secundario" compacto icono="chevron-left" onClick={() => onCambiarFecha(sumarDias(fecha, -7))}>
            <span className="sr-only">Semana anterior</span>
          </Boton>
          <Boton variante="secundario" compacto icono="chevron-right" onClick={() => onCambiarFecha(sumarDias(fecha, 7))}>
            <span className="sr-only">Semana siguiente</span>
          </Boton>
        </span>
      </div>

      <ul className={estilos.tiraSemana} aria-label="Días de la semana">
        {dias.map((dia, indice) => {
          const punto = puntoDelDia(dia, eventos)
          const elegido = dia === fecha
          return (
            <li key={dia}>
              <Boton
                variante="fantasma"
                compacto
                className={estilos.diaTira}
                aria-pressed={elegido}
                aria-current={dia === hoy ? 'date' : undefined}
                onClick={() => onCambiarFecha(dia)}
              >
                <span className={estilos.letraTira} aria-hidden="true">
                  {LETRAS[indice]}
                </span>
                <span className={`${estilos.numeroTira} ${elegido ? estilos.numeroElegido : ''}`} aria-hidden="true">
                  {Number(dia.slice(8, 10))}
                </span>
                <span className={`${estilos.puntoTira} ${punto ? estilos[`punto_${punto}`] : ''}`} aria-hidden="true" />
                <span className="sr-only">{tituloDia(dia)}</span>
              </Boton>
            </li>
          )
        })}
      </ul>

      {agenda.length === 0 ? (
        <EstadoVacio titulo="Semana sin eventos" descripcion="No hay restricciones ni actividades esta semana." nivel={3} />
      ) : (
        <ul className={estilos.agendaMovil}>
          {agenda.map((dia) => (
            <li key={dia.dia} className={estilos.diaAgendaMovil}>
              <h3 className={`${estilos.rotuloDiaMovil} ${dia.dia === fecha ? estilos.rotuloElegido : ''}`}>{dia.texto}</h3>
              {dia.eventos.map((evento) => (
                <span key={evento.clave} className={evento.capa === 'restriccion' ? estilos.restriccionMovil : undefined}>
                  <EventoCalendario tipo={evento.tipo} texto={evento.texto} barra={evento.capa === 'actividad'} ajustar />
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
