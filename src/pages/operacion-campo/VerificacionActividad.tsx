import { useState } from 'react'
import HistorialCambios from '@/components/core/HistorialCambios'
import { AreaTexto } from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import { campoApi } from '@/services/api/operacionCampo'
import type { ActividadCampo } from '@/types/operacionCampo'
import { formatearFechaHora } from '@/utils/formato'
import { useMutacionCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'

interface Props {
  actividad: ActividadCampo
  onCerrar: () => void
  onGuardado: (actividad: ActividadCampo) => void
}

export default function VerificacionActividad({ actividad, onCerrar, onGuardado }: Props) {
  const [observaciones, setObservaciones] = useState(actividad.verificacion_observaciones ?? '')
  const [error, setError] = useState('')
  const mutacion = useMutacionCampo()
  const hayCambios = observaciones !== (actividad.verificacion_observaciones ?? '')

  function guardar() {
    if (!observaciones.trim()) {
      setError('Escribe las observaciones de la verificación')
      document.getElementById('verificacion-observaciones')?.focus()
      return
    }
    void mutacion.enviar(
      async () => {
        const actualizada = await campoApi<ActividadCampo>(`actividades/${actividad.id}/verificacion/`, {
          metodo: 'PUT',
          cuerpo: { observaciones: observaciones.trim() },
        })
        onGuardado(actualizada)
      },
      () => {},
    )
  }

  return (
    <DialogoFormulario
      abierto
      titulo="Verificar actividad en campo"
      descripcion={`${actividad.tipo_actividad_nombre} · ${actividad.area_verde_nombre}. La verificación del jefe se conserva separada de las observaciones de ejecución del capataz.`}
      textoConfirmar={actividad.fecha_verificacion ? 'Actualizar verificación' : 'Registrar verificación'}
      onEnviar={guardar}
      onCerrar={onCerrar}
      enviando={mutacion.enviando}
      error={mutacion.error}
      hayCambios={hayCambios}
      envioDeshabilitado={!hayCambios}
      ancho="extraAmplio"
    >
      <div className={estilos.detalleVerificacion}>
        <p><strong>Observaciones de ejecución:</strong> {actividad.observaciones?.trim() || 'Sin observaciones del capataz'}</p>
        {actividad.fecha_verificacion && (
          <p><strong>Última verificación:</strong> {actividad.verificado_por_nombre ?? 'Jefe de sección'} · {formatearFechaHora(actividad.fecha_verificacion)}</p>
        )}
      </div>
      <AreaTexto
        id="verificacion-observaciones"
        etiqueta="Observaciones de la verificación"
        obligatorio
        maxLength={1000}
        value={observaciones}
        onChange={(evento) => { setObservaciones(evento.target.value); setError('') }}
        error={error}
        ayuda="Describe lo comprobado en campo y cualquier corrección necesaria."
      />
      <HistorialCambios entidad="actividad" registroId={actividad.id} presentacion="actividad" />
    </DialogoFormulario>
  )
}
