import { useState } from 'react'
import HistorialCambios from '@/components/core/HistorialCambios'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import CampoFormulario, { AreaTexto } from '@/design-system/CampoFormulario'
import DialogoFormulario from '@/design-system/DialogoFormulario'
import Selector from '@/design-system/Selector'
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

type ResultadoVerificacion = 'sin-observaciones' | 'con-observaciones'

export default function VerificacionActividad({
  actividad,
  onCerrar,
  onGuardado,
  puedeAnular = false,
  onAnular,
}: Props) {
  const resultadoInicial: ResultadoVerificacion =
    actividad.estado_actividad === 'Observada' ? 'con-observaciones' : 'sin-observaciones'
  const tieneSeguimiento = Boolean(actividad.encargo_seguimiento_id)
  const [resultado, setResultado] = useState<ResultadoVerificacion>(resultadoInicial)
  const [observaciones, setObservaciones] = useState(
    resultadoInicial === 'con-observaciones' ? (actividad.verificacion_observaciones ?? '') : '',
  )
  const [error, setError] = useState('')
  const [descripcionSeguimiento, setDescripcionSeguimiento] = useState('')
  const [plazoSeguimiento, setPlazoSeguimiento] = useState('')
  const [erroresSeguimiento, setErroresSeguimiento] = useState<{ descripcion?: string; plazo?: string }>({})
  const mutacion = useMutacionCampo()
  const conObservaciones = resultado === 'con-observaciones'
  const hayCambios =
    !actividad.fecha_verificacion ||
    resultado !== resultadoInicial ||
    (conObservaciones && observaciones !== (actividad.verificacion_observaciones ?? '')) ||
    (conObservaciones && !tieneSeguimiento && Boolean(descripcionSeguimiento || plazoSeguimiento))

  function cambiarResultado(valor: string) {
    const siguiente = valor as ResultadoVerificacion
    setResultado(siguiente)
    setError('')
    setErroresSeguimiento({})
    if (siguiente === 'sin-observaciones') setObservaciones('')
  }

  function guardar() {
    if (conObservaciones && !observaciones.trim()) {
      setError('Escribe las observaciones de la verificación')
      document.getElementById('verificacion-observaciones')?.focus()
      return
    }
    if (conObservaciones && !tieneSeguimiento) {
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
            con_observaciones: conObservaciones,
            observaciones: conObservaciones ? observaciones.trim() : null,
            ...(conObservaciones && !tieneSeguimiento
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
      conObligatorios={conObservaciones}
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
      <Selector
        id="verificacion-resultado"
        etiqueta="Resultado de la verificación"
        valor={resultado}
        opciones={[
          { valor: 'sin-observaciones', texto: 'Aceptar sin observaciones' },
          { valor: 'con-observaciones', texto: 'Aceptar con observaciones' },
        ]}
        onCambiar={cambiarResultado}
      />
      {conObservaciones && (
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
      )}
      {conObservaciones && tieneSeguimiento && (
        <AvisoEnLinea tono="info">
          Se reutilizará el encargo de seguimiento n.º {actividad.encargo_seguimiento_id}. No se creará otro.
        </AvisoEnLinea>
      )}
      {!conObservaciones && tieneSeguimiento && (
        <AvisoEnLinea tono="advertencia">
          El encargo de seguimiento n.º {actividad.encargo_seguimiento_id} se conservará con su historial. Si ya no
          procede, cancélalo expresamente desde Encargos.
        </AvisoEnLinea>
      )}
      {conObservaciones && !tieneSeguimiento && (
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
