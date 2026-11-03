/**
 * Estado: componente «Estado» del sistema de diseño de Figma (DESIGN.md, sección 4.1).
 *
 * Etiqueta del estado de un registro (en tablas, fichas y cabeceras), con el texto siempre visible: el color
 * nunca es la única señal. Tonos: neutro, info, exito, aviso, error y acento (relleno azul, para el estado
 * que pide acción). Punto delante del texto por defecto; `icono` lo sustituye cuando el estado lo necesita.
 */
import Icono, { type NombreIcono } from './Icono'
import estilos from './Estado.module.css'

export type TonoEstado = 'neutro' | 'info' | 'exito' | 'aviso' | 'error' | 'acento'

export interface EstadoProps {
  tono: TonoEstado
  texto: string
  /** Punto de color delante del texto («Con punto» en Figma). */
  punto?: boolean
  /** Sustituye el punto por un icono. */
  icono?: NombreIcono
  /** Explicación adicional (atributo `title`, también anunciada a los lectores de pantalla). */
  ayuda?: string
}

export default function Estado({ tono, texto, punto = true, icono, ayuda }: EstadoProps) {
  return (
    <span className={`${estilos.estado} ${estilos[tono]}`} title={ayuda}>
      {icono ? (
        <Icono nombre={icono} tamano="sm" />
      ) : (
        punto && <span className={estilos.punto} aria-hidden="true" />
      )}
      <span>{texto}</span>
      {ayuda && <span className="sr-only">: {ayuda}</span>}
    </span>
  )
}
