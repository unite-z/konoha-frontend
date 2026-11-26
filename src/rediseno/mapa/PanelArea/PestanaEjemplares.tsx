import { useId, useMemo, useState } from 'react'
import CampoFormulario from '@/design-system/CampoFormulario'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import type { ResultadoConsulta } from '@/hooks/useConsulta'
import type { EjemplarInventario } from '@/types/ejemplares'
import { nombreEjemplar } from '@/utils/nombreEjemplar'
import { nombreSituacionSingular } from './formato'
import estilos from './PanelArea.module.css'

interface Props {
  ejemplares: ResultadoConsulta<EjemplarInventario[]>
  /** Abre la ficha flotante del ejemplar sin cerrar el panel. */
  onElegir: (ejemplar: EjemplarInventario) => void
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function textoBuscable(e: EjemplarInventario): string {
  return normalizar(
    [e.codigo, e.alias, e.codigo_placa_antigua, e.codigo_catastro, e.especie_nombre_comun, e.especie_nombre_cientifico]
      .filter(Boolean)
      .join(' '),
  )
}

function descripcion(e: EjemplarInventario): string {
  const especie = e.especie_nombre_comun ?? e.especie_nombre_cientifico ?? 'Sin especie'
  return [
    especie,
    e.codigo_placa_antigua ? `placa ${e.codigo_placa_antigua}` : null,
    nombreSituacionSingular(e.situacion),
    e.latitud === null || e.longitud === null ? 'sin coordenadas' : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Ejemplares del área con buscador por nombre, código, placa antigua o especie. */
export default function PestanaEjemplares({ ejemplares, onElegir }: Props) {
  const id = useId()
  const [texto, setTexto] = useState('')
  const lista = ejemplares.datos
  const filtrados = useMemo(() => {
    const clave = normalizar(texto.trim())
    if (!lista || clave === '') return lista ?? []
    return lista.filter((e) => textoBuscable(e).includes(clave))
  }, [lista, texto])

  if (ejemplares.error?.estado === 403 && !lista) {
    return (
      <EstadoSinAcceso
        titulo="No puedes ver los ejemplares"
        descripcion="El servidor no te permite consultar el inventario de ejemplares."
      />
    )
  }
  if (ejemplares.estado === 'error' && !lista) {
    return (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar los ejemplares"
        descripcion={ejemplares.error?.detalle ?? 'Revisa tu conexión e inténtalo de nuevo.'}
        onReintentar={ejemplares.reintentar}
      />
    )
  }
  if (!lista) return <EstadoCarga forma="tabla" texto="Cargando ejemplares…" />
  if (lista.length === 0) {
    return (
      <EstadoVacio
        nivel={3}
        titulo="Esta área no tiene ejemplares"
        descripcion="Cuando se registren ejemplares en el área aparecerán aquí y en el mapa."
      />
    )
  }
  return (
    <>
      <CampoFormulario
        id={`${id}-q`}
        etiqueta="Buscar ejemplares en el área"
        type="search"
        value={texto}
        placeholder="Nombre, código, placa o especie"
        autoComplete="off"
        onChange={(evento) => setTexto(evento.target.value)}
      />
      <p className={estilos.secundario} role="status">
        {filtrados.length} de {lista.length} {lista.length === 1 ? 'ejemplar' : 'ejemplares'}
      </p>
      {filtrados.length === 0 ? (
        <EstadoVacio
          nivel={3}
          titulo="Ningún ejemplar coincide"
          descripcion="Prueba con otro nombre, código o placa."
        />
      ) : (
        <ul className={estilos.ejemplares} aria-label="Ejemplares del área">
          {filtrados.map((e) => (
            <li key={e.id}>
              {/* Excepción al sistema (AV-351): fila de lista que abre la ficha del ejemplar; no es un botón de acción. */}
              <button type="button" className={estilos.filaEjemplar} onClick={() => onElegir(e)}>
                <span className={estilos.nombre}>{nombreEjemplar(e.codigo, e.alias)}</span>
                <span className={estilos.secundario}>{descripcion(e)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
