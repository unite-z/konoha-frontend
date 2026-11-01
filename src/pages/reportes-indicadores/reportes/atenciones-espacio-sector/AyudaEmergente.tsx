/**
 * Ayuda emergente: icono de información que muestra un texto breve al pasar el ratón o al enfocarlo con el
 * teclado. El texto describe al botón (`aria-describedby`), así que también lo leen los lectores de pantalla.
 */
import Icono from '../../../../components/ui/Icono'
import estilos from './AyudaEmergente.module.css'

export interface AyudaEmergenteProps {
  id: string
  /** Sobre qué es la ayuda (por ejemplo, «Orden»). */
  tema: string
  texto: string
}

export default function AyudaEmergente({ id, tema, texto }: AyudaEmergenteProps) {
  return (
    <span className={estilos.ayuda}>
      <button type="button" className={estilos.boton} aria-label={`Ayuda sobre ${tema}`} aria-describedby={id}>
        <Icono nombre="info" tamano="sm" />
      </button>
      <span id={id} role="tooltip" className={estilos.burbuja}>
        {texto}
      </span>
    </span>
  )
}
