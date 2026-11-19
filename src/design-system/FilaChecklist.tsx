/**
 * FilaChecklist: «Fila de checklist» del sistema de diseño de Figma (351-316). Un jardín de la ruta en el móvil del
 * capataz que se marca con un toque.
 *
 * - `estado`: `Pendiente` (círculo vacío), `Marcado` (círculo verde con check) o `Sin sincronizar` (círculo naranja
 *   con check y el detalle en aviso: la marca espera conexión y conserva la hora real).
 * - Toda la fila es un botón: en una pendiente, marca; en una marcada, abre lo que la página decida (observación).
 *   El estado se anuncia a los lectores de pantalla junto al nombre.
 */
import Icono from './Icono'
import estilos from './FilaChecklist.module.css'

export type EstadoFilaChecklist = 'Pendiente' | 'Marcado' | 'Sin sincronizar'

export interface FilaChecklistProps {
  /** «J-016 · Talud de Química». */
  titulo: string
  /** Zona o, si está marcado, hora y autor. */
  detalle: string
  estado: EstadoFilaChecklist
  onPulsar: () => void
  deshabilitada?: boolean
}

const TEXTO_ESTADO: Record<EstadoFilaChecklist, string> = {
  Pendiente: 'pendiente',
  Marcado: 'marcado',
  'Sin sincronizar': 'sin sincronizar',
}

export default function FilaChecklist({ titulo, detalle, estado, onPulsar, deshabilitada = false }: FilaChecklistProps) {
  const clase = estado === 'Marcado' ? estilos.marcado : estado === 'Sin sincronizar' ? estilos.sinSincronizar : ''
  return (
    <button type="button" className={`${estilos.fila} ${clase}`} onClick={onPulsar} disabled={deshabilitada}>
      <span className={estilos.marca} aria-hidden="true">
        {estado !== 'Pendiente' && <Icono nombre="check" tamano="sm" />}
      </span>
      <span className={estilos.textos}>
        <span className={estilos.titulo}>
          {titulo}
          <span className="sr-only">, {TEXTO_ESTADO[estado]}</span>
        </span>
        <span className={estilos.detalle}>{detalle}</span>
      </span>
    </button>
  )
}
