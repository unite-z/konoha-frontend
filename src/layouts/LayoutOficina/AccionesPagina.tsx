/**
 * Acción principal de la página en la fila del título (DESIGN.md, 5): la página la declara donde quiera y el
 * layout la pinta a la derecha del h1, como en Figma. Suele ser un único botón primario («Registrar…»).
 *
 * Fuera de `LayoutOficina` (pruebas de una página suelta) se pinta en su sitio.
 */
import { useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ContextoPagina } from './ContextoPagina'

export default function AccionesPagina({ children }: { children: ReactNode }) {
  const contexto = useContext(ContextoPagina)
  if (!contexto) return <>{children}</>
  if (!contexto.nodoAcciones) return null
  return createPortal(children, contexto.nodoAcciones)
}
