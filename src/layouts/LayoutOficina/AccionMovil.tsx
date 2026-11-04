/**
 * Acción de la página en la barra superior móvil (DESIGN.md, 4.3): la página la declara donde quiera y el layout la
 * pinta a la derecha del título, como el «+» del Calendario móvil de Figma (352-2192). Suele ser un botón de icono.
 *
 * Fuera de `LayoutOficina` (pruebas de una página suelta) se pinta en su sitio.
 */
import { useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ContextoPagina } from './ContextoPagina'

export default function AccionMovil({ children }: { children: ReactNode }) {
  const contexto = useContext(ContextoPagina)
  if (!contexto) return <>{children}</>
  if (!contexto.nodoAccionMovil) return null
  return createPortal(children, contexto.nodoAccionMovil)
}
