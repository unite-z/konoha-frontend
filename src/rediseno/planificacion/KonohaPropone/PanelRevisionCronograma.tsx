/** Panel de revisión de una propuesta: `RevisionIa` con el adaptador del cronograma, en un panel de vidrio. */
import { useEffect, useMemo, useState } from 'react'
import PanelLateral from '@/rediseno/base/PanelLateral/PanelLateral'
import RevisionIa from '@/rediseno/base/RevisionIa/RevisionIa'
import { panel, transicionar } from '@/rediseno/base/movimiento'
import { crearAdaptadorCronograma } from './adaptadorCronograma'
import { NOMBRE_KONOHA_PROPONE } from './nombres'

export interface PanelRevisionCronogramaProps {
  id: number
  onCerrar: () => void
  /** La propuesta cambió (confirmada o descartada): el bloque vuelve a leer. */
  onCambio: () => void
}

export default function PanelRevisionCronograma({ id, onCerrar, onCambio }: PanelRevisionCronogramaProps) {
  // Las llamadas más recientes, sin rehacer el adaptador (y con él la consulta) en cada render.
  const [recientes] = useState({ onCerrar, onCambio })
  useEffect(() => {
    Object.assign(recientes, { onCerrar, onCambio })
  })
  const adaptador = useMemo(
    () =>
      crearAdaptadorCronograma({
        id,
        // «Confirmar planificación» cierra el panel con un fundido; con «reducir movimiento», directo.
        alConfirmar: () => {
          recientes.onCambio()
          transicionar(recientes.onCerrar)
        },
        alRechazar: () => recientes.onCambio(),
      }),
    [id, recientes],
  )
  return (
    <PanelLateral
      abierto
      onCerrar={onCerrar}
      titulo={`Propuesta n.º ${id}`}
      subtitulo="Konoha propone"
      viewTransitionName={panel(NOMBRE_KONOHA_PROPONE)}
    >
      <RevisionIa adaptador={adaptador} />
    </PanelLateral>
  )
}
