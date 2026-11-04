/**
 * Confirmación de «Dar de baja» una restricción desde la agenda del día (AV-266). Si la restricción es de una serie
 * (creada con recurrencia), se elige entre solo esta o toda la serie (`DELETE restricciones/{id}/?serie=`).
 */
import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import { darDeBajaRestriccion } from '@/services/api/planificacion'
import type { Restriccion } from '@/types/planificacion'
import { periodoRestriccion } from '../resumen/resumenPlanificacion'

type Alcance = 'esta' | 'serie'

export interface DialogoBajaRestriccionProps {
  restriccion: Restriccion
  onCerrar: () => void
  onBaja: (serie: boolean) => void
}

export default function DialogoBajaRestriccion({ restriccion, onCerrar, onBaja }: DialogoBajaRestriccionProps) {
  const [alcance, setAlcance] = useState<Alcance>('esta')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    setEnviando(true)
    setError(null)
    try {
      await darDeBajaRestriccion(restriccion.id, alcance === 'serie')
      onBaja(alcance === 'serie')
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo dar de baja la restricción.')
      setEnviando(false)
    }
  }

  return (
    <DialogoConfirmacion
      abierto
      titulo={`Dar de baja «${restriccion.tipo}»`}
      consecuencia={`La restricción del ${periodoRestriccion(restriccion.fecha_inicio, restriccion.fecha_fin)} deja de aplicarse y desaparece del calendario.`}
      textoConfirmar="Dar de baja"
      variante="destructivo"
      cargando={enviando}
      onConfirmar={() => void confirmar()}
      onCancelar={onCerrar}
    >
      {restriccion.serie && (
        <GrupoOpciones<Alcance>
          etiqueta="Qué se da de baja"
          valor={alcance}
          onCambiar={setAlcance}
          opciones={[
            { valor: 'esta', texto: 'Solo esta restricción' },
            { valor: 'serie', texto: 'Toda la serie', descripcion: 'Todas las restricciones creadas con la misma repetición.' },
          ]}
        />
      )}
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
    </DialogoConfirmacion>
  )
}
