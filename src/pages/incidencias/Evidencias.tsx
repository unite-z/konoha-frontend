/** Miniaturas de la evidencia de una atención (Figma 390-8008) o el hueco «Sin evidencia» (390-8205). */
import Icono from '@/components/ui/Icono'
import type { AtencionIncidencia } from '@/types/incidencias'
import estilos from './Incidencias.module.css'

export default function Evidencias({ evidencias, maximo }: { evidencias: AtencionIncidencia['evidencias']; maximo?: number }) {
  const visibles = maximo ? evidencias.slice(0, maximo) : evidencias
  if (visibles.length === 0) {
    return (
      <div className={estilos.sinEvidencia}>
        <Icono nombre="paperclip" tamano="base" />
        <span>Sin evidencia</span>
      </div>
    )
  }
  return (
    <ul className={estilos.evidencias} aria-label="Evidencia">
      {visibles.map((evidencia, indice) => (
        <li key={evidencia.id} className={estilos.miniatura}>
          {evidencia.url ? <img src={evidencia.url} alt={`Evidencia ${indice + 1}`} /> : <Icono nombre="image" tamano="base" titulo={`Evidencia ${indice + 1}`} />}
        </li>
      ))}
    </ul>
  )
}
