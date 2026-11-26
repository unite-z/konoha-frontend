/**
 * Seguimiento del encargo (RD-35, M4-06 y RF-ACT-009): estado actual, «Cambiar estado» con `DialogoSeguimiento` y los
 * historiales de estados y de reprogramaciones. El capataz cambia el estado de los suyos (`PLA.ENCARGO.ACTUALIZAR_ESTADO`)
 * y la jefatura también cancela; el servidor decide a quién deja.
 */
import { useState } from 'react'
import Boton from '@/design-system/Boton'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import { useConsulta } from '@/hooks/useConsulta'
import { DialogoSeguimiento } from '@/pages/operacion-campo/DialogoSeguimiento'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { EncargoCampo } from '@/types/operacionCampo'
import { formatearFecha, formatearFechaHora } from '@/utils/formato'
import { esJefeCampo, puedeCambiarEstadoEncargo } from '@/utils/operacionCampo'
import { obtenerEncargo } from '../Cuadrillas/api'
import estilos from './Encargo.module.css'

export interface SeguimientoEncargoProps {
  encargo: EncargoCampo
  /** Se llama tras guardar el estado, con el aviso para la vista. */
  onEstadoCambiado: (mensaje: string) => void
}

export default function SeguimientoEncargo({ encargo, onEstadoCambiado }: SeguimientoEncargoProps) {
  const permisos = usePermisos()
  const puedeCambiar = puedeCambiarEstadoEncargo(permisos)
  const puedeCancelar = esJefeCampo(permisos)
  const [cambiando, setCambiando] = useState(false)
  const consulta = useConsulta(`rd-encargo-seguimiento:${encargo.id}`, (signal) => obtenerEncargo(encargo.id, signal))
  const terminal = encargo.estado === 'Completado' || encargo.estado === 'Cancelado'
  const puedeActuar = !terminal && (puedeCambiar || puedeCancelar)
  const completo = consulta.datos?.id === encargo.id ? consulta.datos : null

  if (consulta.error?.estado === 403 && !completo) {
    return (
      <EstadoSinAcceso nivel={3} titulo="No puedes ver el seguimiento" descripcion="Tu cuenta no tiene acceso a él." />
    )
  }
  if (consulta.estado === 'error' && !completo) {
    return (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar el seguimiento"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  }
  if (!completo) return <EstadoCarga forma="pagina" texto="Cargando el seguimiento…" />

  const estados = completo.historial_estados ?? []
  const reprogramaciones = completo.reprogramaciones ?? []
  return (
    <div className={estilos.seccion}>
      {puedeActuar && (
        <div className={estilos.acciones}>
          <Boton variante="secundario" icono="history" onClick={() => setCambiando(true)}>
            Cambiar estado
          </Boton>
        </div>
      )}
      <h3>Historial de estados</h3>
      {estados.length ? (
        <ul className={estilos.lista}>
          {estados.map((cambio) => (
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
        <p className={estilos.secundario}>Sin cambios de estado registrados.</p>
      )}
      <h3>Reprogramaciones</h3>
      {reprogramaciones.length ? (
        <ul className={estilos.lista}>
          {reprogramaciones.map((cambio) => (
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
      ) : (
        <p className={estilos.secundario}>Sin reprogramaciones.</p>
      )}
      {cambiando && (
        <DialogoSeguimiento
          id={encargo.id}
          puedeCambiar={puedeCambiar}
          puedeCancelar={puedeCancelar}
          onCerrar={() => setCambiando(false)}
          onGuardado={() => {
            setCambiando(false)
            consulta.reintentar()
            onEstadoCambiado('El estado del encargo se guardó correctamente.')
          }}
        />
      )}
    </div>
  )
}
