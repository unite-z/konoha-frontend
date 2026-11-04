/**
 * «Registrar motivo» de una alerta de duración excedida (AV-269 y AV-255, Figma 373-5658): un campo obligatorio
 * «Motivo o acción» y «Guardar», que llama a `POST alertas/{id}/motivo/` y deja la alerta atendida.
 * Hasta que exista el endpoint responde la simulación (D9), con `AvisoDatosSimulados`.
 */
import { useState } from 'react'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import { registrarMotivoAlerta } from '@/services/api/planificacion'

export const MAXIMO_MOTIVO = 300

export interface DialogoMotivoAlertaProps {
  alertaId: number
  /** «Poda mayor del cierre · 1 día de exceso». */
  descripcion: string
  onCerrar: () => void
  onRegistrado: () => void
}

export default function DialogoMotivoAlerta({ alertaId, descripcion, onCerrar, onRegistrado }: DialogoMotivoAlertaProps) {
  const [motivo, setMotivo] = useState('')
  const [mostrarError, setMostrarError] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<{ titulo: string; detalle: string } | null>(null)
  const errorMotivo = motivo.trim() ? null : 'Escribe el motivo o la acción.'

  async function guardar() {
    setMostrarError(true)
    if (errorMotivo) return
    setEnviando(true)
    setErrorEnvio(null)
    try {
      await registrarMotivoAlerta(alertaId, motivo.trim())
      onRegistrado()
    } catch (causa) {
      setErrorEnvio({ titulo: 'No se pudo registrar el motivo', detalle: causa instanceof Error ? causa.message : 'Inténtalo de nuevo.' })
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto
      ancho="estrecho"
      titulo="Registrar motivo"
      descripcion={descripcion}
      textoConfirmar="Guardar"
      enviando={enviando}
      hayCambios={Boolean(motivo.trim())}
      error={errorEnvio}
      conObligatorios={false}
      onEnviar={() => void guardar()}
      onCerrar={onCerrar}
    >
      <AvisoDatosSimulados />
      <CampoFormulario
        id="motivo-alerta"
        etiqueta="Motivo o acción"
        obligatorio
        value={motivo}
        maxLength={MAXIMO_MOTIVO}
        onChange={(e) => setMotivo(e.target.value)}
        error={mostrarError ? (errorMotivo ?? undefined) : undefined}
      />
    </DialogoFormulario>
  )
}
