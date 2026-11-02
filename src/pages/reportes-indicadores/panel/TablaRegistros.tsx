/**
 * Tabla de registros de un indicador del panel (RF-REP-001): la usan los diálogos «Ver detalles» del panel y
 * del detalle. Cada indicador tiene sus columnas; la tabla pagina en el cliente (25, 50 o 100 por página).
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Badge from '../../../components/ui/Badge'
import TablaDatos, { type ColumnaTabla } from '../../../components/ui/TablaDatos'
import { rutaDetalleAtencion } from '../../../router/rutasApp'
import type {
  ClaveIndicadorPanel,
  FilaAtencionEspacio,
  FilaAtencionPeriodo,
  FilaMovimientoMaterial,
} from '../../../types/reportesGestion'
import { formatearFecha, formatearNumero, SIN_VALOR } from '../../../utils/formato'
import { insigniaEstadoAtencion, numeroDeDecimal } from '../../../utils/reportesGestion'
import { TEXTO_SIN_ESPACIO } from './desglose'
import { MAXIMO_REGISTROS } from './registros'

/** Código de la atención con enlace a su ficha de MOD-05 (misma sesión; Guía Web 5.8: «abre la atención»). */
function enlaceAtencion(fila: { atencion_id: number; codigo: string }): ReactNode {
  return <Link to={rutaDetalleAtencion(fila.atencion_id)}>{fila.codigo}</Link>
}

const COLUMNAS_ATENCIONES_ESPACIO: ColumnaTabla<FilaAtencionEspacio>[] = [
  { clave: 'fecha', titulo: 'Fecha', ordenable: true, render: (f) => formatearFecha(f.fecha) },
  { clave: 'codigo', titulo: 'Atención', ordenable: true, render: enlaceAtencion },
  { clave: 'tipo_servicio', titulo: 'Tipo de servicio', ordenable: true },
  { clave: 'estado', titulo: 'Estado', ordenable: true, render: (f) => <Badge {...insigniaEstadoAtencion(f.estado)} /> },
  { clave: 'espacio', titulo: 'Espacio', ordenable: true, render: (f) => f.espacio ?? TEXTO_SIN_ESPACIO },
]

const COLUMNAS_CUMPLIMIENTO: ColumnaTabla<FilaAtencionPeriodo>[] = [
  { clave: 'fecha', titulo: 'Fecha', ordenable: true, render: (f) => formatearFecha(f.fecha) },
  { clave: 'codigo', titulo: 'Atención', ordenable: true, render: enlaceAtencion },
  { clave: 'tipo_servicio', titulo: 'Tipo de servicio', ordenable: true },
  { clave: 'estado', titulo: 'Estado', ordenable: true, render: (f) => <Badge {...insigniaEstadoAtencion(f.estado)} /> },
  { clave: 'proveedor', titulo: 'Proveedor', ordenable: true },
]

/**
 * MOD-04 aún no registra el material. En desarrollo, con `MOD06_DATOS_EJEMPLO=true` en el back-end, llegan
 * registros de EJEMPLO; esto variará cuando se programe MOD-04 (sus columnas reales pueden cambiar).
 */
const COLUMNAS_CONSUMO: ColumnaTabla<FilaMovimientoMaterial>[] = [
  { clave: 'fecha', titulo: 'Fecha', ordenable: true, render: (f) => formatearFecha(f.fecha) },
  { clave: 'espacio', titulo: 'Espacio', ordenable: true, render: (f) => f.espacio ?? TEXTO_SIN_ESPACIO },
  { clave: 'tipo_material', titulo: 'Material', ordenable: true },
  { clave: 'categoria', titulo: 'Categoría', ordenable: true },
  {
    clave: 'cantidad',
    titulo: 'Cantidad',
    alineacion: 'derecha',
    ordenable: true,
    valorOrden: (f) => numeroDeDecimal(f.cantidad),
    render: (f) => formatearNumero(numeroDeDecimal(f.cantidad)),
  },
  { clave: 'unidad', titulo: 'Unidad', render: (f) => f.unidad || SIN_VALOR },
]

export interface TablaRegistrosProps {
  clave: ClaveIndicadorPanel
  titulo: string
  filas: unknown[]
  /** Hay más registros que los descargados (tope de MAXIMO_REGISTROS). */
  incompleto?: boolean
}

export default function TablaRegistros({ clave, titulo, filas, incompleto = false }: TablaRegistrosProps) {
  let tabla: ReactNode
  switch (clave) {
    case 'atenciones-por-espacio':
      tabla = (
        <TablaDatos
          titulo={titulo}
          columnas={COLUMNAS_ATENCIONES_ESPACIO}
          filas={filas as FilaAtencionEspacio[]}
          // Una atención se repite por cada espacio de su alcance.
          claveFila={(f) => `${f.atencion_id}-${f.area_verde_id ?? 'sin'}`}
          ordenInicial={{ clave: 'fecha', direccion: 'desc' }}
        />
      )
      break
    case 'cumplimiento-tercerizados':
      tabla = (
        <TablaDatos
          titulo={titulo}
          columnas={COLUMNAS_CUMPLIMIENTO}
          filas={filas as FilaAtencionPeriodo[]}
          claveFila={(f) => String(f.atencion_id)}
          ordenInicial={{ clave: 'fecha', direccion: 'desc' }}
        />
      )
      break
    case 'consumo-materiales':
      tabla = (
        <TablaDatos
          titulo={titulo}
          columnas={COLUMNAS_CONSUMO}
          filas={filas as FilaMovimientoMaterial[]}
          claveFila={(f) => String(f.id)}
          ordenInicial={{ clave: 'fecha', direccion: 'desc' }}
        />
      )
      break
    default:
      return <AvisoEnLinea tono="info">El detalle de este indicador todavía no se puede mostrar</AvisoEnLinea>
  }
  return (
    <>
      {incompleto && (
        <AvisoEnLinea tono="advertencia" titulo={`Se muestran los primeros ${formatearNumero(MAXIMO_REGISTROS)} registros`}>
          Hay más registros con estos filtros. Acota el periodo o añade filtros para verlos todos.
        </AvisoEnLinea>
      )}
      {tabla}
    </>
  )
}
