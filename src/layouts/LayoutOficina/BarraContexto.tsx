/**
 * Migas de pan de la página actual (Guía Web 4.2).
 * Desde el menú de primer nivel hasta la página actual, separadas por «/». La página actual va en negrita
 * y sin enlace.
 */
import { Link } from 'react-router'
import type { Miga } from './ContextoPagina'
import estilos from './Cabecera.module.css'

export default function BarraContexto({ migas }: { migas: Miga[] }) {
  if (migas.length === 0) return null
  return (
    <nav aria-label="Migas de pan">
      <ol className={estilos.migas}>
        {migas.map((miga, indice) => {
          const actual = indice === migas.length - 1
          return (
            <li key={`${miga.texto}-${indice}`}>
              {actual || !miga.ruta ? (
                <span className={actual ? estilos.migaActual : undefined} aria-current={actual ? 'page' : undefined}>
                  {miga.texto}
                </span>
              ) : (
                <Link to={miga.ruta}>{miga.texto}</Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
