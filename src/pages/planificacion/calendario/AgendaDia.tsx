/**
 * Agenda del día seleccionado en la vista Mes (AV-266): restricciones de todo el día con su descripción y horario,
 * con «Dar de baja» para el jefe, y actividades con su proveedor y estado. Al pie, «Programar este día» abre
 * «Programar ciclo» con ese día de inicio (Figma 344-436).
 */
import Boton from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EventoCalendario from '@/components/ui/EventoCalendario'
import type { FechaIso } from '@/types/comun'
import type { Restriccion } from '@/types/planificacion'
import { textoHorario } from '@/utils/planificacion'
import { ESTADO_PROGRAMACION, nombreMes } from '../resumen/resumenPlanificacion'
import { eventosDelDia, tituloDia, type EventoCapa } from './calendarioCapas'
import estilos from './Calendario.module.css'

export interface AgendaDiaProps {
  dia: FechaIso
  eventos: EventoCapa[]
  onCerrar: () => void
  /** Solo para quien puede editar la planificación (jefe de sección). */
  onDarDeBaja?: (restriccion: Restriccion) => void
  /** Solo para el jefe: abre «Programar ciclo» empezando ese día. */
  onProgramarDia?: (dia: FechaIso) => void
}

export default function AgendaDia({ dia, eventos, onCerrar, onDarDeBaja, onProgramarDia }: AgendaDiaProps) {
  const { restricciones, actividades } = eventosDelDia(dia, eventos)
  return (
    <section className={estilos.agenda} aria-labelledby="titulo-agenda">
      <div className={estilos.cabeceraAgenda}>
        <div>
          <h2 id="titulo-agenda" className={estilos.tituloAgenda}>
            {tituloDia(dia)}
          </h2>
          <p className={estilos.detalle}>{nombreMes(dia)}</p>
        </div>
        <Boton variante="fantasma" compacto icono="x" onClick={onCerrar}>
          <span className="sr-only">Cerrar la agenda del día</span>
        </Boton>
      </div>

      {restricciones.length > 0 && (
        <ul className={estilos.listaAgenda} aria-label="Restricciones del día">
          {restricciones.map((evento) => {
            if (evento.capa !== 'restriccion') return null
            const { restriccion } = evento
            const horario = restriccion.hora_inicio || restriccion.hora_fin ? textoHorario(restriccion.hora_inicio, restriccion.hora_fin) : 'Todo el día'
            const texto = [restriccion.tipo, restriccion.descripcion].filter(Boolean).join(' · ')
            return (
              <li key={evento.clave} className={estilos.restriccionAgenda}>
                <EventoCalendario tipo={evento.tipo} texto={texto} ajustar />
                <span className={estilos.detalle}>
                  {horario}
                  {restriccion.area_verde ? ` · ${restriccion.area_verde}` : ''}
                  {restriccion.aplica_servicios_ruidosos ? ' · solo servicios ruidosos' : ''}
                </span>
                {onDarDeBaja && (
                  <Boton variante="fantasma" compacto className={estilos.darDeBaja} onClick={() => onDarDeBaja(restriccion)}>
                    Dar de baja<span className="sr-only"> {restriccion.tipo}</span>
                  </Boton>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className={estilos.bloqueAgenda}>
        <h3 className={estilos.rotuloAgenda}>Actividades</h3>
        {actividades.length === 0 ? (
          <p className={estilos.detalle}>Ninguna</p>
        ) : (
          <ul className={estilos.listaAgenda}>
            {actividades.map((evento) => {
              if (evento.capa !== 'actividad') return null
              const estado = ESTADO_PROGRAMACION[evento.programacion.estado]
              return (
                <li key={evento.clave} className={estilos.actividadAgenda}>
                  <EventoCalendario tipo={evento.tipo} texto={evento.texto} ajustar />
                  <span className={estilos.detalle}>{evento.programacion.proveedor ?? 'Personal propio'}</span>
                  <Estado tono={estado.tono} texto={estado.texto} punto />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {onProgramarDia && (
        <Boton variante="secundario" icono="plus-circle" className={estilos.programarDia} onClick={() => onProgramarDia(dia)}>
          Programar este día
        </Boton>
      )}
    </section>
  )
}
