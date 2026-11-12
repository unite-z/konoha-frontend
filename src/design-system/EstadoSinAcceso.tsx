/**
 * EstadoSinAcceso: «Estado de contenido · Sin acceso» del sistema de diseño de Figma (DESIGN.md, 4.1).
 *
 * Sustituye al contenido cuando el backend responde 403. La interfaz oculta lo que el rol no puede hacer, pero
 * quien decide es el servidor: si aun así llega un 403, se muestra esto en lugar de un error genérico.
 */
import type { ReactNode } from 'react'
import estilos from './EstadosContenido.module.css'

export interface EstadoSinAccesoProps {
  titulo?: string
  descripcion?: ReactNode
  nivel?: 2 | 3
}

export default function EstadoSinAcceso({
  titulo = 'No tienes permiso',
  descripcion = 'Solicita acceso a una persona administradora.',
  nivel = 2,
}: EstadoSinAccesoProps) {
  const Encabezado = nivel === 2 ? 'h2' : 'h3'
  return (
    <div className={estilos.estado} role="status">
      <Encabezado className={estilos.titulo}>{titulo}</Encabezado>
      <p className={estilos.descripcion}>{descripcion}</p>
    </div>
  )
}
