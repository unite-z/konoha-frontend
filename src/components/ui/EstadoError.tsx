/**
 * EstadoError: Guía de Estilo Web, sección 5.12.
 *
 * Icono, título, causa probable y botón «Reintentar». La página conserva los filtros y el contexto:
 * este componente solo sustituye al contenido que no se pudo cargar.
 */
import Boton from './Boton'
import Icono from './Icono'
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
      <span className={`${estilos.icono} ${estilos.iconoError}`}>
        <Icono nombre="triangulo" />
      </span>
      <Encabezado className={estilos.titulo}>{titulo}</Encabezado>
      <p className={estilos.descripcion}>{descripcion}</p>
      <div className={estilos.accion}>
        <Boton variante="secundario" onClick={onReintentar}>
          Reintentar
        </Boton>
      </div>
    </div>
  )
}
