// RF-T-008 · Historial de altas y modificaciones (HU-MOD01-010)
/**
 * Historial de un registro (actividad, atención, incidencia o ejemplar), para poner en su ficha.
 * Muestra quién hizo cada cambio y cuándo. Es de solo lectura: nadie puede borrarlo.
 * Sin permiso, el servidor responde 403 y se dice así, sin datos.
 */
import TablaDatos, { type ColumnaTabla } from '../ui/TablaDatos'
import { useConsulta } from '../../hooks/useConsulta'
import { historialRegistro } from '../../services/api/core'
import type { EntidadRegistro, EntradaHistorial } from '../../types/core'
import { resumenCambio, textoAccion } from '../../utils/etiquetasCore'
import { formatearFechaHora } from '../../utils/formato'

const COLUMNAS: ColumnaTabla<EntradaHistorial>[] = [
  { clave: 'fecha', titulo: 'Fecha y hora', render: (e) => formatearFechaHora(e.fecha_hora) },
  { clave: 'accion', titulo: 'Cambio', render: (e) => textoAccion(e.accion) },
  { clave: 'detalle', titulo: 'Detalle', multilinea: true, render: (e) => resumenCambio(e.valores_anteriores, e.valores_nuevos) || '—' },
  { clave: 'usuario', titulo: 'Responsable', render: (e) => e.usuario },
]

export default function HistorialCambios({ entidad, registroId }: { entidad: EntidadRegistro; registroId: number }) {
  const consulta = useConsulta(
    `${entidad}-${registroId}`,
    (signal) => historialRegistro(entidad, registroId, signal),
    (datos) => datos.length === 0,
  )
  const sinPermiso = consulta.error?.estado === 403
  return (
    <TablaDatos
      titulo="Historial de cambios"
      tituloVisible
      columnas={COLUMNAS}
      filas={consulta.datos ?? []}
      claveFila={(e, i) => `${e.fecha_hora}-${i}`}
      estado={consulta.estado === 'inactivo' || consulta.estado === 'cargando' ? 'cargando' : consulta.estado}
      vacio={{ titulo: 'Sin cambios registrados', nivel: 3 }}
      error={{
        titulo: sinPermiso ? 'No tiene permiso para ver el historial' : 'No pudimos cargar el historial',
        descripcion: sinPermiso ? 'Tu rol no incluye la consulta del historial de este registro.' : (consulta.error?.detalle ?? ''),
        onReintentar: consulta.reintentar,
        nivel: 3,
      }}
      compacta
    />
  )
}
