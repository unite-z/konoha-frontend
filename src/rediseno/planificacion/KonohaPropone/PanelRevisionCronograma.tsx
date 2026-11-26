/**
 * Panel de revisión de una propuesta: `RevisionIa` con el adaptador del cronograma, en un panel de vidrio, y el
 * diálogo «Confirmar planificación» con el recuento de lo que se programará (como la revisión actual).
 */
import { useEffect, useMemo, useState } from 'react'
import DialogoConfirmacion from '@/design-system/DialogoConfirmacion'
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

interface Pregunta {
  resumen: string
  responder: (confirma: boolean) => void
}

export default function PanelRevisionCronograma({ id, onCerrar, onCambio }: PanelRevisionCronogramaProps) {
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  // Las llamadas más recientes, sin rehacer el adaptador (y con él la consulta) en cada render.
  const [recientes] = useState({ onCerrar, onCambio })
  useEffect(() => {
    Object.assign(recientes, { onCerrar, onCambio })
  })
  const adaptador = useMemo(
    () =>
      crearAdaptadorCronograma({
        id,
        confirmar: (resumen) => new Promise<boolean>((responder) => setPregunta({ resumen, responder })),
        // «Confirmar planificación» cierra el panel con un fundido; con «reducir movimiento», directo.
        alConfirmar: () => {
          recientes.onCambio()
          transicionar(recientes.onCerrar)
        },
        alRechazar: () => recientes.onCambio(),
      }),
    [id, recientes],
  )
  const responder = (confirma: boolean) => {
    pregunta?.responder(confirma)
    setPregunta(null)
  }
  return (
    <>
      <PanelLateral
        abierto
        onCerrar={onCerrar}
        titulo={`Propuesta n.º ${id}`}
        subtitulo="Konoha propone"
        viewTransitionName={panel(NOMBRE_KONOHA_PROPONE)}
      >
        <RevisionIa adaptador={adaptador} />
      </PanelLateral>
      <DialogoConfirmacion
        abierto={pregunta !== null}
        titulo="Confirmar planificación"
        consecuencia={`${pregunta?.resumen ?? ''} Esta acción registra la programación oficial.`}
        textoConfirmar="Confirmar planificación"
        onConfirmar={() => responder(true)}
        onCancelar={() => responder(false)}
      />
    </>
  )
}
