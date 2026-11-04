// RF-REP-009 · HU-MOD06-004 · CU-MOD06-004 (y CU-MOD06-002, reporte general de gestión)
/**
 * Exportaciones: generar un reporte en PDF o Excel (entre ellos el reporte periódico de gestión para la OSG) y
 * volver a descargar los ya generados.
 *
 * - El formulario se precarga con la URL (`?tipo=MaterialVegetal&mes=2026-10`), para que otras pantallas enlacen.
 * - Sin permiso de exportar, la página se ve con el historial, pero sin el formulario (y el 403 se maneja).
 * - Generar solo crea el registro del archivo: la información original no cambia (criterio 5).
 */
import { useCallback, useMemo, useState } from 'react'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import { puedeExportar } from '@/config/permisos'
import { useConsulta } from '@/hooks/useConsulta'
import { useFiltrosUrl } from '@/hooks/useFiltrosUrl'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS } from '@/router/rutasApp'
import { listarExportaciones, listarTiposExportables } from '@/services/api/exportaciones'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type { ReporteGenerado, TipoReporte } from '@/types/exportaciones'
import { mesActualLima } from '@/utils/reportesGestion'
import { mesEnCursoHastaHoy } from '@/utils/reporteServicio'
import estilosReportes from '../reportes/Reportes.module.css'
import estilos from './Exportaciones.module.css'
import FormularioExportacion from './FormularioExportacion'
import HistorialExportaciones from './HistorialExportaciones'

const TITULO = 'Exportaciones'

/** Tipos válidos del filtro del historial en la URL (TipoReporte), sin esperar a cargar los exportables. */
const TIPOS_REPORTE: readonly TipoReporte[] = [
  'GestionOSG',
  'ServicioTercerizado',
  'MaterialVegetal',
  'DistribucionPersonal',
  'MatrizIncidencias',
  'Listado',
]

export default function ExportacionesPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, { texto: TITULO }])
  const sesion = useSesionActiva()
  const permiteGenerar = puedeExportar(sesion)

  const predeterminado = useMemo(() => ({ ...mesEnCursoHastaHoy(), mes: mesActualLima() }), [])
  const { filtros, establecer } = useFiltrosUrl({
    tipo: 'GestionOSG',
    formato: 'PDF',
    desde: predeterminado.desde,
    hasta: predeterminado.hasta,
    mes: predeterminado.mes,
    tipo_servicio_id: '',
    proveedor_id: '',
    area_verde_id: '',
    modalidad: '',
    historial: '',
    page: '1',
  })
  const pagina = Math.max(1, Number(filtros.page) || 1)

  const tipos = useConsulta('exportaciones-tipos', listarTiposExportables)
  const listaTipos = tipos.datos ?? []
  const tipoHistorial = TIPOS_REPORTE.find((t) => t === filtros.historial)
  const historial = useConsulta(`exportaciones|${tipoHistorial ?? ''}|${pagina}`, (signal) =>
    listarExportaciones({ page: pagina, tipo: tipoHistorial }, signal),
  )

  const [aviso, setAviso] = useState<string | null>(null)
  const cerrarAviso = useCallback(() => setAviso(null), [])
  const reintentarHistorial = historial.reintentar

  function alGenerar(reporte: ReporteGenerado) {
    setAviso(`Reporte generado: ${reporte.archivo?.nombre ?? reporte.etiqueta_tipo}`)
    // El nuevo reporte encabeza el historial: se vuelve a la primera página sin filtro, o se refresca.
    if (pagina !== 1 || tipoHistorial) establecer({ page: null, historial: null })
    else reintentarHistorial()
  }

  let zonaGenerar = null
  if (!permiteGenerar) {
    zonaGenerar = (
      <AvisoEnLinea tono="info" titulo="No tienes permiso para generar reportes">
        Puedes consultar y descargar los reportes ya generados.
      </AvisoEnLinea>
    )
  } else if (tipos.estado === 'error' && tipos.error) {
    zonaGenerar =
      tipos.error.estado === 403 ? (
        <AvisoEnLinea tono="error">{tipos.error.detalle}</AvisoEnLinea>
      ) : (
        <EstadoError titulo="No se pudieron cargar los tipos de reporte" descripcion={tipos.error.detalle} onReintentar={tipos.reintentar} />
      )
  } else if (!tipos.datos) {
    zonaGenerar = tipos.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  } else {
    zonaGenerar = (
      <section className={estilos.zonaGenerar}>
        <FormularioExportacion
          tipos={listaTipos}
          tipoInicial={filtros.tipo}
          formatoInicial={filtros.formato}
          filtrosIniciales={{
            desde: filtros.desde,
            hasta: filtros.hasta,
            mes: filtros.mes,
            tipo_servicio_id: filtros.tipo_servicio_id,
            proveedor_id: filtros.proveedor_id,
            area_verde_id: filtros.area_verde_id,
            modalidad: filtros.modalidad,
          }}
          onGenerado={alGenerar}
        />
      </section>
    )
  }

  return (
    <div className={estilosReportes.pagina}>
      <AvisoDatosSimulados />
      {zonaGenerar}
      <HistorialExportaciones
        consulta={historial}
        tipos={listaTipos}
        tipo={tipoHistorial ?? ''}
        pagina={pagina}
        onCambiarTipo={(valor) => establecer({ historial: valor || null, page: null })}
        onCambiarPagina={(nueva) => establecer({ page: nueva > 1 ? String(nueva) : null })}
      />
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </div>
  )
}
