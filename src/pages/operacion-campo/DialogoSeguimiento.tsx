import { useState } from 'react'
import { AreaTexto } from '@/design-system/CampoFormulario'
import Selector from '@/design-system/Selector'
import DialogoFormulario from '@/design-system/DialogoFormulario'
import Estado, { type TonoEstado } from '@/design-system/Estado'
import { useConsulta } from '@/hooks/useConsulta'
import { campoApi } from '@/services/api/operacionCampo'
import type { EncargoCampo, EstadoEncargo } from '@/types/operacionCampo'
import { formatearFecha, formatearFechaHora } from '@/utils/formato'
import { EstadoCatalogos } from './ComponentesCampo'
import { useMutacionCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'

export const tonosEncargo: Record<EstadoEncargo, TonoEstado> = {
  'Por completar': 'neutro',
  'En curso': 'info',
  Completado: 'exito',
  Observado: 'aviso',
  Cancelado: 'error',
}


const transiciones: Record<EstadoEncargo, EstadoEncargo[]> = {
  'Por completar': ['En curso'],
  'En curso': ['Completado', 'Observado'],
  Completado: [],
  Observado: ['En curso'],
  Cancelado: [],
}

export function DialogoSeguimiento({
  id,
  puedeCambiar,
  puedeCancelar,
  onCerrar,
  onGuardado,
}: {
  id: number
  puedeCambiar: boolean
  puedeCancelar: boolean
  onCerrar: () => void
  onGuardado: () => void
}) {
  const consulta = useConsulta(`encargo-seguimiento-${id}`, (signal) =>
    campoApi<EncargoCampo>(`encargos/${id}/`, { signal }),
  )
  const [estado, setEstado] = useState<EstadoEncargo | ''>('')
  const [observaciones, setObservaciones] = useState('')
  const mutacion = useMutacionCampo()
  const actual = consulta.datos
  const opciones: EstadoEncargo[] = []
  if (actual && puedeCambiar) opciones.push(...transiciones[actual.estado])
  if (actual && puedeCancelar && actual.estado !== 'Completado' && actual.estado !== 'Cancelado') {
    opciones.push('Cancelado')
  }
  const requiereMotivo = estado === 'Observado' || estado === 'Cancelado'

  function guardar() {
    if (!opciones.length) {
      onCerrar()
      return
    }
    if (!actual || !estado || !opciones.includes(estado)) {
      mutacion.setDetalle('Selecciona el nuevo estado')
      return
    }
    if (requiereMotivo && !observaciones.trim()) {
      mutacion.setDetalle(
        estado === 'Cancelado' ? 'Indica el motivo de la cancelación' : 'Indica el motivo de la observación',
      )
      return
    }
    void mutacion.enviar(
      () =>
        campoApi(`encargos/${id}/estado/`, {
          metodo: 'POST',
          cuerpo: { estado_anterior: actual.estado, estado, observaciones: observaciones.trim() },
        }),
      onGuardado,
    )
  }

  return (
    <DialogoFormulario
      abierto
      titulo="Seguimiento del encargo"
      textoConfirmar={opciones.length ? 'Guardar estado' : 'Cerrar'}
      onCerrar={onCerrar}
      onEnviar={guardar}
      error={mutacion.error}
      enviando={mutacion.enviando}
      hayCambios={Boolean(estado || observaciones)}
      conObligatorios={opciones.length > 0}
    >
      <EstadoCatalogos consulta={consulta}>
        {(encargo) => (
          <>
            <p>{encargo.descripcion}</p>
            <Estado tono={tonosEncargo[encargo.estado]} texto={encargo.estado} />
            {opciones.length > 0 && (
              <fieldset className={estilos.formulario} disabled={mutacion.enviando}>
                <Selector
                  id="nuevo-estado-encargo"
                  etiqueta="Nuevo estado"
                  obligatorio
                  valor={estado}
                  opcionTodos="Selecciona un estado"
                  opciones={opciones.map((valor) => ({ valor, texto: valor }))}
                  onCambiar={(valor) => setEstado(valor as EstadoEncargo | '')}
                />
                <AreaTexto
                  id="observaciones-estado-encargo"
                  etiqueta="Observaciones"
                  obligatorio={requiereMotivo}
                  maxLength={1000}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </fieldset>
            )}
            <h3>Historial de estados</h3>
            {encargo.historial_estados?.length ? (
              <ul>
                {encargo.historial_estados.map((cambio) => (
                  <li key={cambio.id}>
                    <strong>
                      {cambio.estado_anterior} → {cambio.estado_nuevo}
                    </strong>
                    <span className={estilos.secundario}>
                      {cambio.autor} · {formatearFechaHora(cambio.fecha)}
                    </span>
                    {cambio.observaciones && <p>{cambio.observaciones}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Sin cambios de estado registrados.</p>
            )}
            {Boolean(encargo.reprogramaciones?.length) && (
              <>
                <h3>Reprogramaciones</h3>
                <ul>
                  {encargo.reprogramaciones?.map((cambio) => (
                    <li key={cambio.id}>
                      <strong>
                        Plazo {formatearFecha(cambio.plazo_anterior)} → {formatearFecha(cambio.plazo_nuevo)}
                      </strong>
                      <span className={estilos.secundario}>
                        {cambio.autor} · {formatearFechaHora(cambio.fecha)}
                      </span>
                      <p>{cambio.justificacion}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </EstadoCatalogos>
    </DialogoFormulario>
  )
}
