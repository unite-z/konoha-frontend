/** Actividades del encargo (RD-35): las registradas en partes contra él, con su fecha y su estado. */
import Estado from '@/design-system/Estado'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { useConsulta } from '@/hooks/useConsulta'
import type { EstadoActividadCampo } from '@/types/operacionCampo'
import { formatearFechaHora } from '@/utils/formato'
import { textoEstadoActividad } from '@/utils/operacionCampo'
import { listarActividadesDeEncargo } from './api'
import estilos from './Encargo.module.css'

const tonos: Record<EstadoActividadCampo, 'info' | 'exito' | 'aviso' | 'neutro'> = {
  Registrada: 'info',
  Verificada: 'exito',
  Observada: 'aviso',
  Anulada: 'neutro',
}

export default function ActividadesEncargo({ encargoId }: { encargoId: number }) {
  const consulta = useConsulta(`rd-encargo-actividades:${encargoId}`, (signal) =>
    listarActividadesDeEncargo(encargoId, signal),
  )
  if (consulta.error?.estado === 403 && !consulta.datos) {
    return (
      <EstadoSinAcceso
        nivel={3}
        titulo="No puedes ver las actividades"
        descripcion="Tu cuenta no tiene permiso para consultar los partes."
      />
    )
  }
  if (consulta.estado === 'error' && !consulta.datos) {
    return (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar las actividades"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  }
  if (!consulta.datos) return <EstadoCarga forma="tarjetas" texto="Cargando las actividades…" />
  const actividades = consulta.datos.results ?? []
  if (actividades.length === 0) {
    return (
      <EstadoVacio
        nivel={3}
        titulo="Sin actividades registradas"
        descripcion="Cuando la cuadrilla registre actividades de este encargo en su parte aparecerán aquí."
      />
    )
  }
  return (
    <ul className={estilos.lista} aria-label="Actividades del encargo">
      {actividades.map((a) => (
        <li key={a.id}>
          <strong>{a.tipo_actividad_nombre}</strong>
          <span className={estilos.secundario}>
            {a.area_verde_nombre} · {formatearFechaHora(a.fecha_hora_actividad)}
          </span>
          <span>
            <Estado tono={tonos[a.estado_actividad]} texto={textoEstadoActividad(a.estado_actividad)} />
          </span>
          {a.observaciones && <p>{a.observaciones}</p>}
        </li>
      ))}
    </ul>
  )
}
