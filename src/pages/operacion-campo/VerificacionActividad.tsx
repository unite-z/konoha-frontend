import { useState } from 'react'
import HistorialCambios from '@/components/core/HistorialCambios'
import Boton from '@/components/ui/Boton'
import Casilla from '@/components/ui/Casilla'
import CampoFormulario, { AreaTexto } from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import { campoApi } from '@/services/api/operacionCampo'
import type { ActividadCampo } from '@/types/operacionCampo'
import { formatearFechaHora } from '@/utils/formato'
import { hoyLima } from '@/utils/operacionCampo'
import { useMutacionCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'

interface Props {
  actividad: ActividadCampo
  onCerrar: () => void
  onGuardado: (actividad: ActividadCampo) => void
  puedeAnular?: boolean
  onAnular?: () => void
}

export default function VerificacionActividad({
  actividad,
  onCerrar,
  onGuardado,
  puedeAnular = false,
  onAnular,
}: Props) {
  const [observaciones, setObservaciones] = useState(actividad.verificacion_observaciones ?? '')
  const [error, setError] = useState('')
  // «Aceptar con observaciones» obliga a crear un encargo de seguimiento vinculado a esta actividad (AV-402).
  const [conSeguimiento, setConSeguimiento] = useState(false)
  const [descripcionSeguimiento, setDescripcionSeguimiento] = useState('')
  const [plazoSeguimiento, setPlazoSeguimiento] = useState('')
  const [erroresSeguimiento, setErroresSeguimiento] = useState<{ descripcion?: string; plazo?: string }>({})
  const mutacion = useMutacionCampo()
  const hayCambios = conSeguimiento || observaciones !== (actividad.verificacion_observaciones ?? '')

  function guardar() {
    if (!observaciones.trim()) {
      setError('Escribe las observaciones de la verificación')
      document.getElementById('verificacion-observaciones')?.focus()
      return
    }
    if (conSeguimiento) {
      const errores: { descripcion?: string; plazo?: string } = {}
      if (!descripcionSeguimiento.trim()) errores.descripcion = 'Describe qué hay que hacer en el seguimiento'
      if (!plazoSeguimiento) errores.plazo = 'Indica el plazo del seguimiento'
      else if (plazoSeguimiento < hoyLima()) errores.plazo = 'El plazo no puede ser anterior a hoy'
      setErroresSeguimiento(errores)
      if (errores.descripcion || errores.plazo) {
        document.getElementById(errores.descripcion ? 'seguimiento-descripcion' : 'seguimiento-plazo')?.focus()
        return
      }
    }
    void mutacion.enviar(
      async () => {
        const actualizada = await campoApi<ActividadCampo>(`actividades/${actividad.id}/verificacion/`, {
          metodo: 'PUT',
          cuerpo: {
            observaciones: observaciones.trim(),
            ...(conSeguimiento
              ? {
                  encargo_seguimiento: {
                    descripcion: descripcionSeguimiento.trim(),
                    plazo_previsto: plazoSeguimiento,
                  },
                }
              : {}),
          },
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
      conObligatorios={conSeguimiento}
    >
      <div className={estilos.detalleVerificacion}>
        <p>
          <strong>Observaciones de ejecución:</strong>{' '}
          {actividad.observaciones?.trim() || 'Sin observaciones del capataz'}
        </p>
        {actividad.fecha_verificacion && (
          <p>
            <strong>Última verificación:</strong> {actividad.verificado_por_nombre ?? 'Jefe de sección'} ·{' '}
            {formatearFechaHora(actividad.fecha_verificacion)}
          </p>
        )}
      </div>
      <AreaTexto
        id="verificacion-observaciones"
        etiqueta="Observaciones de la verificación"
        obligatorio
        maxLength={1000}
        value={observaciones}
        onChange={(evento) => {
          setObservaciones(evento.target.value)
          setError('')
        }}
        error={error}
        ayuda="Describe lo comprobado en campo y cualquier corrección necesaria."
      />
      <Casilla
        etiqueta="Aceptar con observaciones"
        ayuda="Obliga a crear un encargo de seguimiento para la misma cuadrilla, vinculado a esta actividad."
        marcada={conSeguimiento}
        onCambiar={setConSeguimiento}
      />
      {conSeguimiento && (
        <>
          <AreaTexto
            id="seguimiento-descripcion"
            etiqueta="Qué hay que hacer en el seguimiento"
            obligatorio
            maxLength={1000}
            value={descripcionSeguimiento}
            onChange={(evento) => {
              setDescripcionSeguimiento(evento.target.value)
              setErroresSeguimiento((previos) => ({ ...previos, descripcion: undefined }))
            }}
            error={erroresSeguimiento.descripcion}
          />
          <CampoFormulario
            id="seguimiento-plazo"
            etiqueta="Plazo del seguimiento"
            type="date"
            obligatorio
            min={hoyLima()}
            value={plazoSeguimiento}
            onChange={(evento) => {
              setPlazoSeguimiento(evento.target.value)
              setErroresSeguimiento((previos) => ({ ...previos, plazo: undefined }))
            }}
            error={erroresSeguimiento.plazo}
          />
        </>
      )}
      {puedeAnular && onAnular && (
        <Boton variante="destructivo" onClick={onAnular} deshabilitado={mutacion.enviando}>
          Anular actividad
        </Boton>
      )}
      <HistorialCambios entidad="actividad" registroId={actividad.id} presentacion="actividad" />
    </DialogoFormulario>
  )
}
