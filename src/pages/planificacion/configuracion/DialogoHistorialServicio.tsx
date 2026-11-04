/**
 * «Historial de cambios» de un servicio periódico (AV-268 y AV-256, Figma 367-3527): panel lateral de solo lectura
 * con cada cambio de frecuencia o duración, del más reciente al más antiguo, con fecha, hora y autor. Hasta que
 * exista `GET servicios/{id}/historial/` responde la simulación (D9).
 */
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import DialogoDetalle from '@/components/ui/DialogoDetalle'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import { useConsulta } from '@/hooks/useConsulta'
import { listarHistorialServicio } from '@/services/api/planificacion'
import type { ServicioPeriodico } from '@/types/planificacion'
import { instanteALocalLima } from '@/utils/instanteLima'
import { textoCambio } from './configuracionServicios'
import estilos from './Configuracion.module.css'

/** «28/10/2026 09:12». */
function fechaHora(instante: string): string {
  const local = instanteALocalLima(instante) ?? instante
  return `${local.slice(8, 10)}/${local.slice(5, 7)}/${local.slice(0, 4)} ${local.slice(11, 16)}`
}

export interface DialogoHistorialServicioProps {
  servicio: ServicioPeriodico
  onCerrar: () => void
}

export default function DialogoHistorialServicio({ servicio, onCerrar }: DialogoHistorialServicioProps) {
  const historial = useConsulta(`historial-servicio:${servicio.id}`, (signal) => listarHistorialServicio(servicio.id, signal))
  const cambios = historial.datos ?? []
  return (
    <DialogoDetalle abierto lateral titulo="Historial de cambios" descripcion={servicio.nombre} onCerrar={onCerrar}>
      <AvisoDatosSimulados />
      {historial.estado === 'error' && !historial.datos ? (
        <EstadoError titulo="No pudimos cargar el historial" descripcion={historial.error?.detalle ?? ''} onReintentar={historial.reintentar} />
      ) : !historial.datos ? (
        <EstadoCarga texto="Cargando el historial…" />
      ) : cambios.length === 0 ? (
        <EstadoVacio titulo="Sin cambios" descripcion="Los cambios de frecuencia y duración aparecerán aquí." nivel={3} />
      ) : (
        <ul className={estilos.historial}>
          {cambios.map((cambio) => (
            <li key={`${cambio.campo}-${cambio.fecha_hora}`} className={estilos.cambio}>
              <span>{textoCambio(cambio)}</span>
              <span className={estilos.modificado}>
                {fechaHora(cambio.fecha_hora)} · {cambio.autor}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DialogoDetalle>
  )
}
