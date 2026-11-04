/**
 * Detalle de una actividad en la vista Semana (AV-266): estado, fechas, responsable y restricciones con las que
 * coincide. «Reprogramar» llega con el panel «Programar ciclo» (AV-267).
 */
import Boton from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EventoCalendario from '@/components/ui/EventoCalendario'
import { ESTADO_PROGRAMACION, fechaCorta } from '../resumen/resumenPlanificacion'
import { coincidencias, periodoEvento, type EventoCapa } from './calendarioCapas'
import estilos from './Calendario.module.css'

export interface DetalleActividadProps {
  actividad: EventoCapa
  eventos: EventoCapa[]
  onCerrar: () => void
}

export default function DetalleActividad({ actividad, eventos, onCerrar }: DetalleActividadProps) {
  if (actividad.capa !== 'actividad') return null
  const estado = ESTADO_PROGRAMACION[actividad.programacion.estado]
  const coinciden = coincidencias(actividad, eventos)
  return (
    <section className={estilos.agenda} aria-labelledby="titulo-actividad">
      <div className={estilos.cabeceraAgenda}>
        <div className={estilos.bloqueAgenda}>
          <h2 id="titulo-actividad" className={estilos.tituloAgenda}>
            {actividad.texto}
          </h2>
          <span>
            <Estado tono={estado.tono} texto={estado.texto} punto />
          </span>
        </div>
        <Boton variante="fantasma" compacto icono="x" onClick={onCerrar}>
          <span className="sr-only">Cerrar el detalle de la actividad</span>
        </Boton>
      </div>
      <dl className={estilos.datosActividad}>
        <div>
          <dt className={estilos.rotuloAgenda}>Fechas</dt>
          <dd>{periodoEvento(actividad)}</dd>
        </div>
        <div>
          <dt className={estilos.rotuloAgenda}>Responsable</dt>
          <dd>{actividad.programacion.proveedor ?? 'Personal propio'}</dd>
        </div>
        <div>
          <dt className={estilos.rotuloAgenda}>Coincide con</dt>
          <dd>
            {coinciden.length === 0 ? (
              'Ninguna restricción'
            ) : (
              <ul className={estilos.listaAgenda}>
                {coinciden.map((restriccion) => (
                  <li key={restriccion.clave}>
                    <EventoCalendario tipo={restriccion.tipo} texto={`${fechaCorta(restriccion.inicio)} · ${restriccion.texto}`} ajustar />
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </section>
  )
}
