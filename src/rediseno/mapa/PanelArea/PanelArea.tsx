/**
 * PanelArea (RD-18): el panel de vidrio del área abierta. Crece desde su fila de la lista (`panel(areaId)` comparte
 * nombre de transición con `fila(areaId)`) y trae Resumen, Ejemplares (con buscador) e Historial. Las acciones van en
 * el pie y son enlaces al módulo dueño. La cámara y los marcadores los lleva `MapaPage`.
 */
import { PERMISOS } from '@/config/permisosCore'
import { tiene } from '@/config/permisosSesion'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { useConsulta, type ResultadoConsulta } from '@/hooks/useConsulta'
import { cargarResumenArea } from '@/services/api/resumenArea'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { EjemplarInventario } from '@/types/ejemplares'
import type { PaginaHistorialArea } from '@/types/resumenArea'
import PanelLateral, { type PestanaPanel } from '@/rediseno/base/PanelLateral/PanelLateral'
import { panel } from '@/rediseno/base/movimiento'
import AccionesArea from './AccionesArea'
import PestanaEjemplares from './PestanaEjemplares'
import PestanaHistorial from './PestanaHistorial'
import PestanaResumen from './PestanaResumen'
import { useHistorialArea } from './useHistorialArea'

interface Props {
  areaId: number
  /** Nombre que ya se conoce por la lista, mientras llega el resumen. */
  nombreProvisional: string | null
  tieneContorno: boolean
  ejemplares: ResultadoConsulta<EjemplarInventario[]>
  onElegirEjemplar: (ejemplar: EjemplarInventario) => void
  onCerrar: () => void
}

const HISTORIAL_VACIO: PaginaHistorialArea = { count: 0, next: null, previous: null, results: [] }

export default function PanelArea({
  areaId,
  nombreProvisional,
  tieneContorno,
  ejemplares,
  onElegirEjemplar,
  onCerrar,
}: Props) {
  const permisos = usePermisos()
  const puedeVerIncidencias = tiene(permisos, PERMISOS.registrarIncidencia)
  const resumen = useConsulta(`rd-area-resumen:${areaId}`, (signal) =>
    cargarResumenArea(areaId, puedeVerIncidencias, signal),
  )
  const datos = resumen.datos
  const historial = useHistorialArea(areaId, datos?.historial ?? HISTORIAL_VACIO)

  const pestanas: PestanaPanel[] | undefined = datos
    ? [
        {
          valor: 'resumen',
          texto: 'Resumen',
          contenido: <PestanaResumen resumen={datos} tieneContorno={tieneContorno} />,
        },
        {
          valor: 'ejemplares',
          texto: 'Ejemplares',
          contenido: <PestanaEjemplares ejemplares={ejemplares} onElegir={onElegirEjemplar} />,
        },
        { valor: 'historial', texto: 'Historial', contenido: <PestanaHistorial historial={historial} /> },
      ]
    : undefined

  const area = datos?.area
  const subtitulo = area ? [area.sector_nombre, area.tipo_uso_nombre].filter(Boolean).join(' · ') : undefined

  return (
    <PanelLateral
      abierto
      onCerrar={onCerrar}
      titulo={area?.nombre ?? nombreProvisional ?? `Área ${areaId}`}
      subtitulo={subtitulo || undefined}
      pestanas={pestanas}
      pie={<AccionesArea areaId={areaId} permisos={permisos} />}
      viewTransitionName={panel(areaId)}
    >
      {!datos &&
        (resumen.error?.estado === 403 ? (
          <EstadoSinAcceso
            titulo="No puedes ver esta área"
            descripcion="El servidor no te permite consultar el inventario. Solicita el permiso a una persona administradora."
          />
        ) : resumen.error?.estado === 404 ? (
          <EstadoVacio
            nivel={3}
            titulo="No se encontró el área"
            descripcion="Puede que se haya eliminado o que el enlace no sea correcto."
          />
        ) : resumen.estado === 'error' ? (
          <EstadoError
            nivel={3}
            titulo="No pudimos cargar el área"
            descripcion={resumen.error?.detalle ?? 'Revisa tu conexión e inténtalo de nuevo.'}
            onReintentar={resumen.reintentar}
          />
        ) : (
          <EstadoCarga forma="tabla" texto="Cargando el área…" />
        ))}
    </PanelLateral>
  )
}
