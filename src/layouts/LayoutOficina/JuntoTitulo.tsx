/**
 * Lo que va pegado al título de la página (DESIGN.md, 5): la página lo declara donde quiera y el layout lo pinta
 * justo detrás del h1, como el estado del ciclo en «Detalle de ciclo» de Figma (380-7171). Suele ser un `Estado`.
 *
 * Variante `debajo`: una segunda línea bajo el subtítulo, con el mismo tamaño y color, para un enlace de contexto
 * («Requerimiento AT-… · Servicios tercerizados» en el mismo Figma). Solo se pinta si la página tiene subtítulo.
 *
 * Fuera de `LayoutOficina` (pruebas de una página suelta) se pinta en su sitio.
 */
import { useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ContextoPagina } from './ContextoPagina'

export default function JuntoTitulo({ debajo = false, children }: { debajo?: boolean; children: ReactNode }) {
  const contexto = useContext(ContextoPagina)
  if (!contexto) return <>{children}</>
  const nodo = debajo ? contexto.nodoDebajo : contexto.nodoJunto
  if (!nodo) return null
  return createPortal(children, nodo)
}
