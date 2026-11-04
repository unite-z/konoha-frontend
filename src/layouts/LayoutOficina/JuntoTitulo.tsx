/**
 * Lo que va pegado al título de la página (DESIGN.md, 5): la página lo declara donde quiera y el layout lo pinta
 * justo detrás del h1, como el estado del ciclo en «Detalle de ciclo» de Figma (380-7171). Suele ser un `Estado`.
 *
 * Fuera de `LayoutOficina` (pruebas de una página suelta) se pinta en su sitio.
 */
import { useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ContextoPagina } from './ContextoPagina'

export default function JuntoTitulo({ children }: { children: ReactNode }) {
  const contexto = useContext(ContextoPagina)
  if (!contexto) return <>{children}</>
  if (!contexto.nodoJunto) return null
  return createPortal(children, contexto.nodoJunto)
}
