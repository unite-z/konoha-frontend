/**
 * Vista Lista del calendario con capas (AV-266, Figma «Calendario · Lista» 361-2782): las actividades del mes en
 * una tabla, con las restricciones con las que coinciden. «Reprogramar» llega con el panel de AV-267.
 */
import Estado from '@/components/ui/Estado'
import EventoCalendario from '@/components/ui/EventoCalendario'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { SIN_VALOR } from '@/utils/formato'
import { ESTADO_PROGRAMACION, diaFigma, periodoFigma } from '../resumen/resumenPlanificacion'
import { actividadesDelPeriodo, coincidencias, type EventoCapa } from './calendarioCapas'
import estilos from './Calendario.module.css'

export interface VistaListaProps {
  eventos: EventoCapa[]
  desde: string
  hasta: string
}

export default function VistaLista({ eventos, desde, hasta }: VistaListaProps) {
  const columnas: ColumnaTabla<EventoCapa>[] = [
    { clave: 'fecha', titulo: 'Fecha', render: (evento) => periodoFigma(evento.inicio, evento.fin) },
    { clave: 'actividad', titulo: 'Actividad', multilinea: true, render: (evento) => evento.texto },
    {
      clave: 'responsable',
      titulo: 'Responsable',
      multilinea: true,
      render: (evento) => (evento.capa === 'actividad' ? (evento.programacion.proveedor ?? 'Personal propio') : SIN_VALOR),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (evento) => {
        if (evento.capa !== 'actividad') return SIN_VALOR
        const estado = ESTADO_PROGRAMACION[evento.programacion.estado]
        return <Estado tono={estado.tono} texto={estado.texto} punto />
      },
    },
    {
      clave: 'restricciones',
      titulo: 'Restricciones',
      multilinea: true,
      render: (evento) => {
        const coinciden = coincidencias(evento, eventos)
        if (coinciden.length === 0) return SIN_VALOR
        return (
          <span className={estilos.restriccionesFila}>
            {coinciden.map((restriccion) => (
              <EventoCalendario key={restriccion.clave} tipo={restriccion.tipo} texto={`${diaFigma(restriccion.inicio)} · ${restriccion.texto}`} />
            ))}
          </span>
        )
      },
    },
  ]

  const filas = actividadesDelPeriodo(desde, hasta, eventos)
  return (
    <TablaDatos
      titulo="Actividades del periodo"
      columnas={columnas}
      filas={filas}
      estado={filas.length === 0 ? 'vacio' : 'exito'}
      claveFila={(evento) => evento.clave}
      vacio={{ titulo: 'Sin actividades en este periodo', descripcion: 'Las actividades programadas aparecerán aquí.' }}
    />
  )
}
