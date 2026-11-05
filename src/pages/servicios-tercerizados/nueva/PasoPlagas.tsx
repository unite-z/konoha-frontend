// RF-FIT-004 · Plagas controladas (solo para control fitosanitario)
/**
 * Selección opcional de una o varias plagas del catálogo ya usado en atención especial (RF-INV-011).
 * Solo se muestra cuando el servicio del contrato es «Control fitosanitario» (`NuevaAtencionPage`). El
 * catálogo es pequeño: se carga completo y se filtra en el cliente.
 */
import Casilla from '@/components/ui/Casilla'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Tarjeta from '@/components/ui/Tarjeta'
import type { Plaga } from '@/types/maestrosTercerizados'
import { alternarPlaga, type PlagaSeleccionada } from '@/utils/nuevaAtencion'
import estilos from './NuevaAtencion.module.css'

export interface PasoPlagasProps {
  plagas: PlagaSeleccionada[]
  onCambiar: (plagas: PlagaSeleccionada[]) => void
  catalogo: Plaga[]
}

export default function PasoPlagas({ plagas, onCambiar, catalogo }: PasoPlagasProps) {
  const elegidas = new Set(plagas.map((p) => p.plaga_id))

  return (
    <Tarjeta titulo="Plagas controladas (opcional)" relleno="amplio">
      {catalogo.length === 0 ? (
        <EstadoVacio nivel={3} titulo="No hay plagas habilitadas en el catálogo" />
      ) : (
        <ul className={estilos.listaOpciones}>
          {catalogo.map((p) => (
            <li key={p.id} className={estilos.opcionCasilla}>
              <Casilla
                id={`opcion-plaga-${p.id}`}
                etiqueta={p.nombre}
                marcada={elegidas.has(p.id)}
                onCambiar={() => onCambiar(alternarPlaga(plagas, p))}
              />
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  )
}
