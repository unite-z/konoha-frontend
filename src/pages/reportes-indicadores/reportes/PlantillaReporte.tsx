/**
 * Plantilla común de las páginas de reporte (RF-REP-002, RF-REP-004 y RF-REP-006).
 *
 * Coloca la barra de filtros encima del contenido, muestra «Actualizado el …» con «Actualizar» y aplica
 * los estados de toda la página (Guía Web 5.12 y 6.1):
 * - carga: esqueleto solo si la consulta dura más de 300 ms; mientras tanto se mantienen los datos anteriores;
 * - vacío: `sin_datos` del back-end, con su `mensaje_sin_datos`;
 * - error: 403 y 400 sin campo en un aviso con el `detalle`; 400 del periodo junto al campo (lo muestra
 *   `FiltroPeriodo`); el resto con «Reintentar», conservando los filtros.
 *
 * Ningún reporte modifica datos: solo consultan (GET).
 */
import type { ReactNode } from 'react'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import EstadoCarga from '../../../components/ui/EstadoCarga'
import EstadoError from '../../../components/ui/EstadoError'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import IndicadorActualizacion from '../../../components/ui/IndicadorActualizacion'
import type { ResultadoConsulta } from '../../../hooks/useConsulta'
import type { ReporteBase } from '../../../types/comun'
import { formatearFechaHora } from '../../../utils/formato'
import { erroresDePeriodo } from './erroresPeriodo'
import estilos from './Reportes.module.css'

/** Título del error de carga de un reporte. */
const TITULO_ERROR_CARGA = 'No se pudo cargar el reporte'

export interface PlantillaReporteProps<T extends ReporteBase<unknown>> {
  consulta: ResultadoConsulta<T>
  /** Barra de filtros (y chips de filtros activos). */
  filtros: ReactNode
  vacio: { titulo: string; accion?: ReactNode }
  children: (datos: T) => ReactNode
}

export default function PlantillaReporte<T extends ReporteBase<unknown>>({
  consulta,
  filtros,
  vacio,
  children,
}: PlantillaReporteProps<T>) {
  const { estado, datos, error, cargaVisible, reintentar } = consulta

  let contenido: ReactNode = null
  if (estado === 'error' && error) {
    if (erroresDePeriodo(error)) {
      contenido = null // el mensaje va junto al campo del periodo
    } else if (error.estado === 403 || error.estado === 400) {
      contenido = <AvisoEnLinea tono="error">{error.detalle}</AvisoEnLinea>
    } else {
      contenido = <EstadoError titulo={TITULO_ERROR_CARGA} descripcion={error.detalle} onReintentar={reintentar} />
    }
  } else if (estado === 'cargando' && (cargaVisible || !datos)) {
    contenido = cargaVisible ? <EstadoCarga forma="pagina" /> : null
  } else if (datos) {
    contenido = (
      <div className={estilos.pagina} aria-busy={estado === 'cargando' || undefined}>
        <IndicadorActualizacion
          actualizadoEl={formatearFechaHora(datos.generado_en)}
          onActualizar={reintentar}
          cargando={estado === 'cargando'}
        />
        {datos.sin_datos ? (
          <EstadoVacio
            titulo={vacio.titulo}
            descripcion={datos.mensaje_sin_datos ?? undefined}
            accion={vacio.accion}
          />
        ) : (
          children(datos)
        )}
      </div>
    )
  }

  return (
    <div className={estilos.pagina}>
      {filtros}
      {contenido}
    </div>
  )
}
