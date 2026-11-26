import type { UsoLeyenda } from './seleccion'
import estilos from './Mapa.module.css'

const TONOS = [estilos.tono0, estilos.tono1, estilos.tono2, estilos.tono3, estilos.tono4, estilos.tono5]

/** Qué significa cada color del plano: los tipos de uso de las áreas del resultado que tienen contorno. */
export default function LeyendaUsos({ usos }: { usos: readonly UsoLeyenda[] }) {
  if (usos.length === 0) return null
  return (
    <ul className={estilos.leyenda} aria-label="Colores del mapa por tipo de uso">
      {usos.map((uso) => (
        <li key={uso.clase}>
          <span className={`${estilos.muestra} ${TONOS[uso.tono]}`} aria-hidden="true" />
          {uso.nombre}
          <span className={estilos.secundario}>{uso.cantidad}</span>
        </li>
      ))}
    </ul>
  )
}
