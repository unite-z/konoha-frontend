// Layout temporal del MOD-06. Se sustituirá por el layout común cuando MOD-01 lo publique.
// Medidas de la Guía Web: cabecera de 64 px, menú de 256 px.
import { Outlet } from 'react-router'
import Cabecera from './Cabecera'
import MenuLateral from './MenuLateral'
import BarraContexto from './BarraContexto'

export default function LayoutOficina() {
  return (
    <div>
      <Cabecera />
      <MenuLateral />
      <BarraContexto />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
