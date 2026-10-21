/**
 * Icono: SVG de trazo en línea, sin librería (la librería de iconos está pendiente de decisión).
 *
 * Solo contiene los iconos que necesitan los componentes de la guía. Usan `currentColor`, así que toman el
 * color del texto que acompañan. Tamaño `md` (20px, por defecto) o `sm` (13px, en insignias).
 *
 * Accesibilidad: sin `titulo` es decorativo (`aria-hidden`), porque siempre acompaña a un texto.
 * Con `titulo` se anuncia como imagen.
 */
import type { ReactNode } from 'react'
import estilos from './Icono.module.css'

export type NombreIcono =
  | 'circulo'
  | 'info'
  | 'verificacion'
  | 'triangulo'
  | 'aspa'
  | 'flechaOrden'
  | 'chevronDerecha'
  | 'documento'

const TRAZOS: Record<NombreIcono, ReactNode> = {
  circulo: <circle cx="12" cy="12" r="5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </>
  ),
  verificacion: <polyline points="5 12.5 10 17.5 19 7" />,
  triangulo: (
    <>
      <path d="M12 3.5 21.5 20h-19z" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  aspa: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ),
  flechaOrden: <path d="M8 19V5m-4 4 4-4 4 4m4-4v14m-4-4 4 4 4-4" />,
  chevronDerecha: <polyline points="9 6 15 12 9 18" />,
  documento: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <polyline points="14 3 14 8 19 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </>
  ),
}

export interface IconoProps {
  nombre: NombreIcono
  /** `md`: 20px (por defecto); `sm`: 13px, para insignias. */
  tamano?: 'md' | 'sm'
  /** Texto accesible. Solo si el icono va sin texto visible al lado. */
  titulo?: string
  className?: string
}

export default function Icono({ nombre, tamano = 'md', titulo, className }: IconoProps) {
  return (
    <svg
      className={[estilos.icono, estilos[tamano], className].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...(titulo ? { role: 'img', 'aria-label': titulo } : { 'aria-hidden': true })}
    >
      {TRAZOS[nombre]}
    </svg>
  )
}
