import { useEffect, useId, useRef, useState } from 'react'
import EstadoError from '@/design-system/EstadoError'
import type { ResultadoConsulta } from '@/hooks/useConsulta'
import CampoFormulario from '@/design-system/CampoFormulario'
import type { EjemplarInventario } from '@/types/ejemplares'
import estilos from './Mapa.module.css'

const ESPERA_MS = 300
export const MINIMO_BUSQUEDA = 2

interface Props {
  /** Texto inicial (el de la URL). Para vaciarlo desde fuera se vuelve a montar el buscador con otra `key`. */
  inicial: string
  onBuscar: (texto: string) => void
  ejemplares: ResultadoConsulta<EjemplarInventario[]>
  buscando: boolean
  onElegirEjemplar: (ejemplar: EjemplarInventario) => void
}

/** Nombre corto del ejemplar para la lista de resultados. */
function descripcionEjemplar(e: EjemplarInventario): string {
  const especie = e.especie_nombre_comun ?? e.especie_nombre_cientifico ?? 'Sin especie'
  const placa = e.codigo_placa_antigua ? ` · placa ${e.codigo_placa_antigua}` : ''
  return `${e.codigo}${placa} · ${especie}`
}

/** Búsqueda por nombre, código nuevo o placa antigua: las áreas salen en la lista y los ejemplares, aquí. */
export default function BuscadorMapa({ inicial, onBuscar, ejemplares, buscando, onElegirEjemplar }: Props) {
  const [texto, setTexto] = useState(inicial)
  const enviado = useRef(inicial)
  const id = useId()

  useEffect(() => {
    if (texto.trim() === enviado.current) return
    const espera = setTimeout(() => {
      enviado.current = texto.trim()
      onBuscar(enviado.current)
    }, ESPERA_MS)
    return () => clearTimeout(espera)
  }, [texto, onBuscar])

  const lista = ejemplares.datos ?? []
  return (
    <div className={estilos.buscador}>
      <CampoFormulario
        id={`${id}-q`}
        etiqueta="Buscar áreas y ejemplares"
        type="search"
        value={texto}
        placeholder="Nombre, código o placa antigua"
        autoComplete="off"
        onChange={(evento) => setTexto(evento.target.value)}
      />
      {buscando && ejemplares.estado === 'error' && ejemplares.error?.estado !== 403 && (
        <EstadoError
          nivel={3}
          titulo="No pudimos buscar ejemplares"
          descripcion="Las áreas siguen en la lista."
          onReintentar={ejemplares.reintentar}
        />
      )}
      {buscando && lista.length > 0 && (
        <ul className={estilos.ejemplares} aria-label="Ejemplares encontrados">
          {lista.slice(0, 6).map((ejemplar) => (
            <li key={ejemplar.id}>
              {/* Excepción al sistema (AV-351): resultado de búsqueda de dos líneas sobre vidrio, no un botón de acción. */}
              <button
                type="button"
                className={estilos.ejemplar}
                disabled={ejemplar.area_verde_id === null}
                onClick={() => onElegirEjemplar(ejemplar)}
              >
                <span>{descripcionEjemplar(ejemplar)}</span>
                <span className={estilos.secundario}>{ejemplar.area_verde_nombre ?? 'Sin área asignada'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
