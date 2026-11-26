// RF-REP-009 · M6-11
import { useCallback, useState } from 'react'
import AvisoTemporal from '@/design-system/AvisoTemporal'
import Boton from '@/design-system/Boton'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import { puedeExportar } from '@/config/permisos'
import { useConsulta } from '@/hooks/useConsulta'
import HistorialExportaciones from '@/pages/reportes-indicadores/exportaciones/HistorialExportaciones'
import { listarExportaciones, listarTiposExportables } from '@/services/api/exportaciones'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type { ReporteGenerado, TipoReporte } from '@/types/exportaciones'
import { estiloTransicion, transicionar } from '@/rediseno/base/movimiento'
import PanelExportar from './PanelExportar'
import { TRANSICION_EXPORTAR } from './transicionExportar'
import estilos from './Exportar.module.css'
import { conMatrizDeshabilitada } from './tiposExportables'
import { useExportarUrl } from './useExportarUrl'

/** Tipos válidos del filtro del historial, sin esperar a cargar los exportables. */
const TIPOS_REPORTE: readonly TipoReporte[] = [
  'GestionOSG',
  'ServicioTercerizado',
  'MaterialVegetal',
  'DistribucionPersonal',
  'MatrizIncidencias',
  'Listado',
]

/**
 * «Exportar» y el historial de reportes generados. Con permiso de exportar, el botón abre el panel con el formulario
 * (el botón se transforma en el panel); sin él, solo se ve el historial.
 */
export default function SeccionExportaciones() {
  const sesion = useSesionActiva()
  const permite = puedeExportar(sesion)
  const url = useExportarUrl()
  const [tipoHistorial, setTipoHistorial] = useState('')
  const [pagina, setPagina] = useState(1)
  const [aviso, setAviso] = useState<string | null>(null)
  const cerrarAviso = useCallback(() => setAviso(null), [])

  const tipos = useConsulta('exportaciones-tipos', listarTiposExportables)
  const tipoValido = TIPOS_REPORTE.find((t) => t === tipoHistorial)
  const historial = useConsulta(`exportaciones|${tipoValido ?? ''}|${pagina}`, (signal) =>
    listarExportaciones({ page: pagina, tipo: tipoValido }, signal),
  )
  const abierto = permite && url.abierto
  const { reintentar: recargarHistorial } = historial

  function alGenerado(reporte: ReporteGenerado) {
    setAviso(`Reporte generado: ${reporte.archivo?.nombre ?? reporte.etiqueta_tipo}`)
    // El nuevo reporte encabeza el historial: primera página y sin filtro, o recarga.
    if (pagina !== 1 || tipoValido) {
      setPagina(1)
      setTipoHistorial('')
    } else recargarHistorial()
    transicionar(url.cerrar)
  }

  return (
    <section className={estilos.seccion} aria-label="Exportaciones">
      {permite && (
        <div className={estilos.barra}>
          <Boton
            variante="primario"
            icono="download"
            aria-expanded={abierto}
            style={abierto ? undefined : estiloTransicion(TRANSICION_EXPORTAR)} /* estilo-calculado */
            onClick={() => transicionar(url.abrir)}
          >
            Exportar
          </Boton>
        </div>
      )}
      {historial.error?.estado === 403 ? (
        <EstadoSinAcceso
          titulo="No tienes acceso al historial de exportaciones"
          descripcion={historial.error.detalle}
        />
      ) : (
        <HistorialExportaciones
          consulta={historial}
          tipos={conMatrizDeshabilitada(tipos.datos ?? [])}
          tipo={tipoValido ?? ''}
          pagina={pagina}
          onCambiarTipo={(valor) => {
            setTipoHistorial(valor)
            setPagina(1)
          }}
          onCambiarPagina={setPagina}
        />
      )}
      {permite && (
        <PanelExportar
          abierto={abierto}
          onCerrar={() => transicionar(url.cerrar)}
          tipos={{
            ...tipos,
            datos: tipos.datos ? conMatrizDeshabilitada(tipos.datos) : null,
          }}
          precarga={{ tipo: url.tipo, formato: url.formato, filtros: url.filtros }}
          onGenerado={alGenerado}
        />
      )}
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </section>
  )
}
