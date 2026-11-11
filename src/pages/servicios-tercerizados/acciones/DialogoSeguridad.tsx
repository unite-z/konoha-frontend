import { useState } from 'react'
import { AreaTexto } from '@/components/ui/CampoFormulario'
import Casilla from '@/components/ui/Casilla'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import { verificarSeguridad } from '@/services/api/tercerizados'
import type { DialogoOrigenProps } from './DialogoOrigen'
import { useOperacionAtencion } from './useOperacionAtencion'

function Formulario({ atencion, onActualizada, onCerrar, onExito }: Omit<DialogoOrigenProps, 'abierto'>) {
  const [medidas, setMedidas] = useState(atencion.verificaciones_seguridad?.at(-1)?.medidas ?? '')
  const [confirmado, setConfirmado] = useState(false)
  const [intentado, setIntentado] = useState(false)
  const { enviando, error, enviar } = useOperacionAtencion(atencion.id, onActualizada)

  async function registrar() {
    setIntentado(true)
    if (!medidas.trim() || !confirmado) {
      document.getElementById(!medidas.trim() ? 'seguridad-medidas' : 'seguridad-confirmacion')?.focus()
      return
    }
    const ok = await enviar({
      ejecutar: () => verificarSeguridad(atencion.id, medidas.trim()),
      aplicada: (a) => a.verificaciones_seguridad?.at(-1)?.medidas === medidas.trim(),
    })
    if (ok) onExito('Verificación de seguridad registrada')
  }

  return (
    <DialogoFormulario abierto titulo="Verificar seguridad" textoConfirmar="Guardar verificación"
      descripcion="La verificación corresponde a esta atención. Las correcciones se conservan en el historial."
      enviando={enviando} hayCambios={Boolean(medidas.trim()) || confirmado} error={error}
      onEnviar={registrar} onCerrar={onCerrar}>
      <AreaTexto id="seguridad-medidas" etiqueta="EPP y medidas de seguridad" obligatorio maxLength={5000}
        ayuda="Describe el EPP, la delimitación del área y otras medidas aplicables al trabajo."
        value={medidas} onChange={(e) => setMedidas(e.target.value)} disabled={enviando}
        error={intentado && !medidas.trim() ? 'Describe las medidas verificadas.' : undefined} />
      <Casilla id="seguridad-confirmacion" marcada={confirmado} disabled={enviando}
        aria-required="true" aria-invalid={intentado && !confirmado || undefined}
        onCambiar={setConfirmado}
        ayuda={intentado && !confirmado ? 'Confirma la verificación para continuar.' : undefined}
        etiqueta="Confirmo que se verificaron las medidas descritas para iniciar el servicio" />
    </DialogoFormulario>
  )
}

export default function DialogoSeguridad({ abierto, ...props }: DialogoOrigenProps) {
  return abierto ? <Formulario {...props} /> : null
}
