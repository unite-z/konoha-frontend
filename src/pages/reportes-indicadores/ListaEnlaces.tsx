/**
 * Lista de enlaces en tarjetas, con título y una frase de descripción (páginas índice del módulo).
 */
import { Link } from 'react-router'
import Icono from '../../components/ui/Icono'
import estilos from './reportes/Reportes.module.css'

export interface EnlaceIndice {
  titulo: string
  descripcion: string
  ruta: string
}

export default function ListaEnlaces({ enlaces }: { enlaces: EnlaceIndice[] }) {
  return (
    <ul className={estilos.indice}>
      {enlaces.map((enlace) => (
        <li key={enlace.ruta}>
          <Link to={enlace.ruta} className={estilos.tarjetaEnlace}>
            <span className={estilos.tituloEnlace}>
              {enlace.titulo}
              <Icono nombre="chevronDerecha" />
            </span>
            <span className={estilos.descripcionEnlace}>{enlace.descripcion}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
