/**
 * EstadoVacio: «Estado de contenido · Vacío» del sistema de diseño de Figma (DESIGN.md, 4.1).
 *
 * Título que dice qué no hay, una frase que explica cuándo aparecerá contenido y, si procede, una acción.
 * Con un filtro sin resultados, la acción es «Limpiar filtros». Sin icono, salvo que se pida.
 */
import type { ReactNode } from 'react'
import Icono, { type NombreIcono } from './Icono'
import estilos from './EstadosContenido.module.css'

export interface EstadoVacioProps {
  titulo: string
  descripcion?: ReactNode
  /** Acción opcional (botón o enlace). */
  accion?: ReactNode
  /** Icono opcional encima del título (Figma no lo usa). */
  icono?: NombreIcono
  /** Nivel del encabezado del título, según la jerarquía de la página. */
  nivel?: 2 | 3
  /** Sin tarjeta, centrado y con el icono en un círculo, dentro de un hueco propio (Figma: Calendario · sin resultados). */
  centrado?: boolean
}

export default function EstadoVacio({ titulo, descripcion, accion, icono, nivel = 2, centrado = false }: EstadoVacioProps) {
  const Encabezado = nivel === 2 ? 'h2' : 'h3'
  return (
    <div className={centrado ? `${estilos.estado} ${estilos.centrado}` : estilos.estado} role="status">
      {icono && (
        <span className={estilos.icono}>
          <Icono nombre={icono} tamano="base" />
        </span>
      )}
      <Encabezado className={estilos.titulo}>{titulo}</Encabezado>
      {descripcion && <p className={estilos.descripcion}>{descripcion}</p>}
      {accion && <div className={estilos.accion}>{accion}</div>}
    </div>
  )
}
