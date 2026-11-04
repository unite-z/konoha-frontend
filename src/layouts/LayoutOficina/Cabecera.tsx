/**
 * Cabecera: componente «Cabecera» del sistema de diseño de Figma (DESIGN.md, 4.3). Alto de 52px, fondo de
 * panel y borde inferior, con las migas de pan a la izquierda. El usuario va al pie del menú lateral
 * (`UsuarioMenu`) y el título de la página (h1) lo pinta `LayoutOficina` al principio del contenido.
 */
import BarraContexto from './BarraContexto'
import type { Miga } from './ContextoPagina'
import estilos from './Cabecera.module.css'

export interface CabeceraProps {
  migas: Miga[]
}

export default function Cabecera({ migas }: CabeceraProps) {
  return (
    <header className={estilos.cabecera}>
      <BarraContexto migas={migas} />
    </header>
  )
}
