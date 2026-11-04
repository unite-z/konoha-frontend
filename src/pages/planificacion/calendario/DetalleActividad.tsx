/**
 * Detalle de una actividad en la vista Semana (AV-266, Figma 361-2252): estado, fechas, responsable y restricciones
 * con las que coincide. Al pie, «Reprogramar» (solo ciclos programados y para el jefe) abre «Programar ciclo» con sus
 * datos. El código del ciclo llega con AV-364.
 */
import Boton from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EventoCalendario from '@/components/ui/EventoCalendario'
import type { Programacion } from '@/types/planificacion'
import { ESTADO_PROGRAMACION, diaFigma, periodoNumerico } from '../resumen/resumenPlanificacion'
import { coincidencias, type EventoCapa } from './calendarioCapas'
import estilos from './Calendario.module.css'

export interface DetalleActividadProps {
  actividad: EventoCapa
  eventos: EventoCapa[]
  onCerrar: () => void
  /** Solo para el jefe: reprograma un ciclo en estado Programada. */
  onReprogramar?: (programacion: Programacion) => void
}

export default function DetalleActividad({ actividad, eventos, onCerrar, onReprogramar }: DetalleActividadProps) {
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
          <dd>{periodoNumerico(actividad.inicio, actividad.fin)}</dd>
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
                    <EventoCalendario tipo={restriccion.tipo} texto={`${diaFigma(restriccion.inicio)} · ${restriccion.texto}`} ajustar />
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
      {onReprogramar && actividad.programacion.estado === 'Programada' && (
        <Boton variante="secundario" className={estilos.programarDia} onClick={() => onReprogramar(actividad.programacion)}>
          Reprogramar
        </Boton>
      )}
    </section>
  )
}
