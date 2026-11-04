/** Historial de una incidencia (AV-285, Figma 390-7811): una fila por transición con su hora, la más reciente arriba. */
import Tarjeta from '@/components/ui/Tarjeta'
import type { EventoIncidencia } from '@/types/incidencias'
import { hoyLima } from '@/utils/instanteLima'
import { horasHistorial } from './detalleIncidencia'
import estilos from './Incidencias.module.css'

export default function HistorialIncidencia({ eventos }: { eventos: EventoIncidencia[] }) {
  const horas = horasHistorial(eventos, hoyLima())
  return (
    <Tarjeta titulo="Historial" nivel={2}>
      <ul className={estilos.listaCarga}>
        {eventos.map((evento, indice) => (
          <li key={`${evento.texto}-${evento.fecha_hora}`}>
            <span>{evento.texto}</span>
            <span className={estilos.cifraCarga}>{horas[indice]}</span>
          </li>
        ))}
      </ul>
    </Tarjeta>
  )
}
