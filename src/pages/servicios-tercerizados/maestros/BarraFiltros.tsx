/**
 * Barra de búsqueda y filtros de las listas de proveedores, contratos y atención especial (Guía Web 5.5).
 * La búsqueda se aplica al enviar; los filtros (`children`) se aplican al elegirlos. Todo se filtra en el
 * servidor, nunca solo en la página cargada.
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import Boton from '../../../components/ui/Boton'
import CampoFormulario from '../../../components/ui/CampoFormulario'
import estilos from './Maestros.module.css'

const LARGO_MAXIMO_BUSQUEDA = 100

export interface BarraFiltrosProps {
  /** Prefijo de los ids (único en la pantalla). */
  id: string
  /** Nombre accesible del formulario, por ejemplo «Filtrar proveedores». */
  nombre: string
  etiquetaBusqueda: string
  ayudaBusqueda: string
  /** Texto de búsqueda aplicado (el de la URL). */
  q: string
  onBuscar: (texto: string) => void
  children?: ReactNode
}

export default function BarraFiltros({ id, nombre, etiquetaBusqueda, ayudaBusqueda, q, onBuscar, children }: BarraFiltrosProps) {
  // Borrador de la búsqueda: se aplica al enviar. Si la URL cambia (filtros limpiados), el borrador la refleja.
  const [borrador, setBorrador] = useState(q)
  const [previa, setPrevia] = useState(q)
  if (q !== previa) {
    setPrevia(q)
    setBorrador(q)
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    onBuscar(borrador.trim())
  }

  return (
    <form role="search" aria-label={nombre} className={estilos.barraFiltros} onSubmit={enviar}>
      <div className={estilos.busqueda}>
        <CampoFormulario
          id={`${id}-busqueda`}
          etiqueta={etiquetaBusqueda}
          type="search"
          ayuda={ayudaBusqueda}
          maxLength={LARGO_MAXIMO_BUSQUEDA}
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
        />
      </div>
      {children}
      <div className={estilos.accionFiltros}>
        <Boton type="submit" variante="secundario">
          Buscar
        </Boton>
      </div>
    </form>
  )
}
