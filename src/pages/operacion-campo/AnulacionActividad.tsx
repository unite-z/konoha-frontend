import { useState } from 'react'
import { AreaTexto } from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import { campoApi } from '@/services/api/operacionCampo'
import type { ActividadCampo } from '@/types/operacionCampo'
import { useMutacionCampo } from './useCampo'

interface Props {
  actividad: ActividadCampo
  onCerrar: () => void
  onGuardado: (actividad: ActividadCampo) => void
}

export default function AnulacionActividad({ actividad, onCerrar, onGuardado }: Props) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const mutacion = useMutacionCampo()

  function anular() {
    const motivoLimpio = motivo.trim()
    if (!motivoLimpio) {
      setError('Escribe el motivo de la anulación')
      document.getElementById('anulacion-motivo')?.focus()
      return
    }
    void mutacion.enviar(
      async () => {
        const actualizada = await campoApi<ActividadCampo>(`actividades/${actividad.id}/anulacion/`, {
          metodo: 'PUT',
          cuerpo: { motivo: motivoLimpio },
        })
        onGuardado(actualizada)
      },
      () => {},
    )
  }

  return (
    <DialogoFormulario
      abierto
      titulo="Anular actividad"
      descripcion={`${actividad.tipo_actividad_nombre} · ${actividad.area_verde_nombre}. La actividad seguirá disponible para consulta y auditoría, pero no contará como ejecutada válida.`}
      textoConfirmar="Confirmar anulación"
      textoCancelar="Volver"
      onEnviar={anular}
      onCerrar={onCerrar}
      enviando={mutacion.enviando}
      error={mutacion.error}
      hayCambios={Boolean(motivo)}
      conObligatorios={false}
      ancho="medio"
    >
      <AreaTexto
        id="anulacion-motivo"
        etiqueta="Motivo de anulación"
        obligatorio
        maxLength={1000}
        value={motivo}
        onChange={(evento) => {
          setMotivo(evento.target.value)
          setError('')
        }}
        error={error}
        ayuda="Explica por qué la actividad registrada no debe considerarse válida."
      />
    </DialogoFormulario>
  )
}
