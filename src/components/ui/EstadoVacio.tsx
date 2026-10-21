/**
 * EstadoVacio: Guía de Estilo Web, sección 5.12.
 *
 * Icono, título que dice qué no hay, una frase que explica cuándo aparecerá contenido y, si procede, una
 * acción. Con un filtro sin resultados, la acción es «Limpiar filtros».
 */
import type { ReactNode } from 'react'
import Icono, { type NombreIcono } from './Icono'
import estilos from './EstadosContenido.module.css'

export interface EstadoVacioProps {
  titulo: string
  descripcion?: ReactNode
  /** Acción opcional (botón o enlace). */
  accion?: ReactNode
  icono?: NombreIcono
  /** Nivel del encabezado del título, según la jerarquía de la página. */
  nivel?: 2 | 3
}

export default function EstadoVacio({ titulo, descripcion, accion, icono = 'info', nivel = 2 }: EstadoVacioProps) {
  const Encabezado = nivel === 2 ? 'h2' : 'h3'
  return (
    <div className={estilos.estado} role="status">
      <span className={estilos.icono}>
        <Icono nombre={icono} />
      </span>
      <Encabezado className={estilos.titulo}>{titulo}</Encabezado>
      {descripcion && <p className={estilos.descripcion}>{descripcion}</p>}
      {accion && <div className={estilos.accion}>{accion}</div>}
    </div>
  )
}
