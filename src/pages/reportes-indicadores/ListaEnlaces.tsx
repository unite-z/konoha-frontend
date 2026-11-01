/**
 * Lista de enlaces en tarjetas (páginas índice del módulo): icono, título, una frase de descripción, un dato
 * adicional opcional (por ejemplo, los filtros que admite) y la acción al pie.
 */
import { Link } from 'react-router'
import Icono, { type NombreIcono } from '../../components/ui/Icono'
import estilos from './ListaEnlaces.module.css'

export interface EnlaceIndice {
  titulo: string
  descripcion: string
  ruta: string
  /** Par etiqueta-valor bajo la descripción. */
  detalle?: { etiqueta: string; valor: string }
}

export interface ListaEnlacesProps {
  enlaces: EnlaceIndice[]
  /** Icono de las tarjetas. */
  icono: NombreIcono
  /** Texto de la acción al pie («Abrir reporte»). */
  accion: string
}

export default function ListaEnlaces({ enlaces, icono, accion }: ListaEnlacesProps) {
  return (
    <ul className={estilos.rejilla}>
      {enlaces.map((enlace) => (
        <li key={enlace.ruta}>
          <Link to={enlace.ruta} className={estilos.tarjeta}>
            <div className={estilos.cabecera}>
              <span className={estilos.icono}>
                <Icono nombre={icono} />
              </span>
              <div className={estilos.textos}>
                <h2 className={estilos.titulo}>{enlace.titulo}</h2>
                <p className={estilos.descripcion}>{enlace.descripcion}</p>
              </div>
            </div>
            {enlace.detalle && (
              <dl className={estilos.detalles}>
                <dt className={estilos.etiqueta}>{enlace.detalle.etiqueta}</dt>
                <dd className={estilos.valor}>{enlace.detalle.valor}</dd>
              </dl>
            )}
            <span className={estilos.accion}>
              {accion}
              <Icono nombre="chevronDerecha" tamano="sm" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
