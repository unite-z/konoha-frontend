// RF-REP-009 · M6-11
import { useMemo } from 'react'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import type { ResultadoConsulta } from '@/hooks/useConsulta'
import FormularioExportacion from '@/pages/reportes-indicadores/exportaciones/FormularioExportacion'
import type { ReporteGenerado, TipoExportable } from '@/types/exportaciones'
import type { FiltrosExportacion } from '@/utils/exportaciones'
import { mesActualLima } from '@/utils/reportesGestion'
import { mesEnCursoHastaHoy } from '@/utils/reporteServicio'
import PanelLateral from '@/rediseno/base/PanelLateral/PanelLateral'
import { TRANSICION_EXPORTAR } from './transicionExportar'

export interface PanelExportarProps {
  abierto: boolean
  onCerrar: () => void
  tipos: ResultadoConsulta<TipoExportable[]>
  /** Valores de la URL (`?tipo=&formato=` y los filtros, como `&mes=`); lo que no venga toma el predeterminado. */
  precarga: { tipo: string; formato: string; filtros: Partial<FiltrosExportacion> }
  onGenerado: (reporte: ReporteGenerado) => void
}

function Contenido({ tipos, precarga, onGenerado }: Omit<PanelExportarProps, 'abierto' | 'onCerrar'>) {
  const predeterminado = useMemo(() => ({ ...mesEnCursoHastaHoy(), mes: mesActualLima() }), [])
  const { datos, error, estado, cargaVisible, reintentar } = tipos

  if (estado === 'error' && error) {
    return error.estado === 403 ? (
      <EstadoSinAcceso nivel={3} descripcion={error.detalle} />
    ) : (
      <EstadoError
        nivel={3}
        titulo="No se pudieron cargar los tipos de reporte"
        descripcion={error.detalle}
        onReintentar={reintentar}
      />
    )
  }
  if (!datos) return cargaVisible ? <EstadoCarga forma="pagina" /> : null
  if (datos.length === 0) {
    return (
      <EstadoVacio
        nivel={3}
        titulo="No hay tipos de reporte exportables"
        descripcion="Vuelve a intentarlo más tarde."
      />
    )
  }
  return (
    <FormularioExportacion
      tipos={datos}
      tipoInicial={precarga.tipo || 'GestionOSG'}
      formatoInicial={precarga.formato || 'PDF'}
      filtrosIniciales={{
        desde: predeterminado.desde,
        hasta: predeterminado.hasta,
        mes: predeterminado.mes,
        tipo_servicio_id: '',
        proveedor_id: '',
        area_verde_id: '',
        modalidad: '',
        ...precarga.filtros,
      }}
      onGenerado={onGenerado}
    />
  )
}

/** Panel de vidrio con el formulario de exportación (tipo, PDF o Excel y los filtros del tipo). */
export default function PanelExportar({ abierto, onCerrar, ...resto }: PanelExportarProps) {
  return (
    <PanelLateral
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Exportar reporte"
      subtitulo="PDF o Excel"
      viewTransitionName={TRANSICION_EXPORTAR}
    >
      <Contenido {...resto} />
    </PanelLateral>
  )
}
