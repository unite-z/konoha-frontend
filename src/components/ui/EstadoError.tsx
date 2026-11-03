/**
 * EstadoError: «Estado de contenido · Error» del sistema de diseño de Figma (DESIGN.md, 4.1).
 *
 * Título, causa probable y la acción «Reintentar». La página conserva los filtros y el contexto: este
 * componente solo sustituye al contenido que no se pudo cargar. Para un 403, usa `EstadoSinAcceso`.
 */
import estilos from './EstadosContenido.module.css'

export interface EstadoErrorProps {
  titulo: string
  /** Causa probable (por ejemplo, el `detalle` del back-end). */
  descripcion: string
  onReintentar: () => void
  nivel?: 2 | 3
}

export default function EstadoError({ titulo, descripcion, onReintentar, nivel = 2 }: EstadoErrorProps) {
  const Encabezado = nivel === 2 ? 'h2' : 'h3'
  return (
    <div className={estilos.estado} role="alert">
      <Encabezado className={estilos.titulo}>{titulo}</Encabezado>
      <p className={estilos.descripcion}>{descripcion}</p>
      <div className={estilos.accion}>
        <button type="button" className={estilos.enlace} onClick={onReintentar}>
          Reintentar
        </button>
      </div>
    </div>
  )
}
