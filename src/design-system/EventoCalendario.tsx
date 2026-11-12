/**
 * EventoCalendario: componente «Evento de calendario» del sistema de diseño de Figma (DESIGN.md, 4.4).
 *
 * - Actividades, con punto: `programada` (punto hueco), `enCurso` (punto relleno) y `completada` (punto verde y
 *   texto atenuado). Con `barra`, la actividad ocupa varios días y se pinta como barra con borde.
 * - Restricciones de todo el día, como pastilla del color de su efecto: `favorable`, `aviso` y `prohibicion`.
 * - `mas`: el «+N más» de una celda con más eventos de los que caben.
 *
 * El texto se recorta con puntos suspensivos y el completo va en `title`; con `ajustar`, pasa a varias líneas (tarjetas
 * de la vista Semana).
 */
import estilos from './EventoCalendario.module.css'

export type TipoEventoCalendario = 'programada' | 'enCurso' | 'completada' | 'favorable' | 'aviso' | 'prohibicion' | 'mas'

export interface EventoCalendarioProps {
  tipo: TipoEventoCalendario
  texto: string
  /** Actividad de varios días: barra con borde en lugar de solo el punto. */
  barra?: boolean
  /** El texto pasa a varias líneas en lugar de recortarse. */
  ajustar?: boolean
}

const ACTIVIDADES: ReadonlySet<TipoEventoCalendario> = new Set(['programada', 'enCurso', 'completada'])

export default function EventoCalendario({ tipo, texto, barra = false, ajustar = false }: EventoCalendarioProps) {
  const actividad = ACTIVIDADES.has(tipo)
  const clases = [estilos.evento, estilos[tipo], actividad && barra ? estilos.barra : '', ajustar ? estilos.ajustar : ''].filter(Boolean).join(' ')
  return (
    <span className={clases} title={texto}>
      {actividad && <span className={estilos.punto} aria-hidden="true" />}
      <span className={estilos.texto}>{texto}</span>
    </span>
  )
}
