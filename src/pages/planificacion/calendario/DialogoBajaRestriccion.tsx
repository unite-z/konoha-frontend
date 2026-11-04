/**
 * Confirmación de «Dar de baja» una restricción desde la agenda del día (AV-266, Figma 366-3269). Si la restricción
 * es de una serie (creada con recurrencia), se elige entre solo este día o toda la serie, con sus fechas de aquí en
 * adelante (`DELETE restricciones/{id}/?serie=`). Queda en el historial.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import { useConsulta } from '@/hooks/useConsulta'
import { darDeBajaRestriccion, listarRestricciones } from '@/services/api/planificacion'
import type { Restriccion } from '@/types/planificacion'
import { fechaNumerica, sumarDias } from '../resumen/resumenPlanificacion'
import { tituloDia } from './calendarioCapas'

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
  // Fechas de la serie de aquí en adelante (el backend admite 400 días por consulta).
  const hasta = sumarDias(restriccion.fecha_inicio, 399)
  const serie = useConsulta(restriccion.serie ? `baja-serie:${restriccion.serie}:${restriccion.fecha_inicio}` : null, (signal) =>
    listarRestricciones(restriccion.fecha_inicio, hasta, signal),
  )
  const fechasSerie = (serie.datos ?? []).filter((r) => r.serie === restriccion.serie).map((r) => r.fecha_inicio).sort()
  const ultima = fechasSerie.at(-1)
  const detalleSerie = ultima ? `${fechasSerie.length === 1 ? '1 fecha' : `${fechasSerie.length} fechas`}, hasta el ${fechaNumerica(ultima)}` : undefined
  const dia = `${tituloDia(restriccion.fecha_inicio).split(' ')[0]} ${fechaNumerica(restriccion.fecha_inicio)}`

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
      consecuencia="Queda en el historial."
      textoConfirmar="Dar de baja"
      textoVolver="Cancelar"
      variante="destructivo"
      cargando={enviando}
      onConfirmar={() => void confirmar()}
      onCancelar={onCerrar}
    >
      {restriccion.serie && (
        <GrupoOpciones<Alcance>
          etiqueta="Qué se da de baja"
          etiquetaOculta
          valor={alcance}
          onCambiar={setAlcance}
          opciones={[
            { valor: 'esta', texto: 'Solo este día', descripcion: dia },
            { valor: 'serie', texto: 'Toda la serie', descripcion: detalleSerie ?? 'Todas las fechas de la misma repetición' },
          ]}
        />
      )}
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
    </DialogoConfirmacion>
  )
}
