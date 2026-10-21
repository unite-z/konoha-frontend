/**
 * Línea de estados de una atención tercerizada (mockup, pantalla 6), con los 5 estados reales del back-end.
 *
 * Completados con marca, el actual con su número en círculo y los pendientes con contorno neutral
 * (Guía Web 5.13). Cada paso muestra la fecha en que se alcanzó, según el historial.
 * La conformidad no aparece: está fuera de esta entrega.
 */
import type { CambioEstado, EstadoAtencion } from '../../types/tercerizados'
import { ESTADOS_ATENCION, fechasPorEstado, indiceEstado } from '../../utils/estadosTercerizados'
import { formatearFechaHora } from '../../utils/formato'
import Icono from '../ui/Icono'
import estilos from './LineaEstados.module.css'

export interface LineaEstadosProps {
  estado: EstadoAtencion
  historial: CambioEstado[]
}

export default function LineaEstados({ estado, historial }: LineaEstadosProps) {
  const actual = indiceEstado(estado)
  const fechas = fechasPorEstado(historial)
  return (
    <ol className={estilos.linea} aria-label="Ciclo de la atención">
      {ESTADOS_ATENCION.map((paso, indice) => {
        const situacion = indice < actual ? 'completado' : indice === actual ? 'actual' : 'pendiente'
        const fecha = indice <= actual ? fechas[paso] : undefined
        return (
          <li key={paso} className={`${estilos.paso} ${estilos[situacion]}`} aria-current={situacion === 'actual' ? 'step' : undefined}>
            <span className={estilos.marca} aria-hidden="true">
              {situacion === 'completado' ? <Icono nombre="verificacion" tamano="sm" /> : indice + 1}
            </span>
            <span className={estilos.texto}>
              <span className={estilos.nombre}>{paso}</span>
              <span className={estilos.fecha}>{fecha ? formatearFechaHora(fecha) : situacion === 'pendiente' ? 'Pendiente' : ''}</span>
              <span className="sr-only">
                {situacion === 'completado' ? ' (completado)' : situacion === 'actual' ? ' (estado actual)' : ''}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
