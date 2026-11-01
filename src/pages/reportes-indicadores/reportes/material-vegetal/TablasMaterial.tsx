/**
 * Tablas de RF-REP-005 que se abren en los diálogos «Ver detalles»: movimientos del mes (consumido, propagado o
 * trasladado) y totales de un mes de la comparación. Paginan en el cliente (25, 50 o 100 por página).
 */
import TablaDatos, { type ColumnaTabla } from '../../../../components/ui/TablaDatos'
import type { TotalMaterial, TotalMes, TotalTraslado } from '../../../../types/reportesGestion'
import { formatearNumero } from '../../../../utils/formato'
import { numeroDeDecimal } from '../../../../utils/reportesGestion'

function columnaCantidad<F extends { cantidad: string }>(): ColumnaTabla<F> {
  return {
    clave: 'cantidad',
    titulo: 'Cantidad',
    alineacion: 'derecha',
    ordenable: true,
    valorOrden: (f) => numeroDeDecimal(f.cantidad),
    render: (f) => formatearNumero(numeroDeDecimal(f.cantidad)),
  }
}

function columnaMovimientos<F extends { movimientos: number }>(): ColumnaTabla<F> {
  return {
    clave: 'movimientos',
    titulo: 'Movimientos',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearNumero(f.movimientos),
  }
}

const COLUMNAS_MATERIAL: ColumnaTabla<TotalMaterial>[] = [
  { clave: 'espacio', titulo: 'Espacio', ordenable: true },
  { clave: 'tipo_material', titulo: 'Material', ordenable: true },
  { clave: 'categoria', titulo: 'Categoría', ordenable: true },
  columnaCantidad<TotalMaterial>(),
  { clave: 'unidad', titulo: 'Unidad' },
  columnaMovimientos<TotalMaterial>(),
]

const COLUMNAS_TRASLADO: ColumnaTabla<TotalTraslado>[] = [
  { clave: 'origen', titulo: 'Origen', ordenable: true },
  { clave: 'destino', titulo: 'Destino', ordenable: true },
  { clave: 'tipo_material', titulo: 'Material', ordenable: true },
  { clave: 'categoria', titulo: 'Categoría', ordenable: true },
  columnaCantidad<TotalTraslado>(),
  { clave: 'unidad', titulo: 'Unidad' },
  columnaMovimientos<TotalTraslado>(),
]

const COLUMNAS_MES: ColumnaTabla<TotalMes>[] = [
  { clave: 'tipo_material', titulo: 'Material', ordenable: true },
  columnaCantidad<TotalMes>(),
  { clave: 'unidad', titulo: 'Unidad' },
]

export function TablaMateriales({ titulo, filas }: { titulo: string; filas: TotalMaterial[] }) {
  return (
    <TablaDatos
      titulo={titulo}
      columnas={COLUMNAS_MATERIAL}
      filas={filas}
      claveFila={(f) => `${f.area_verde_id ?? 'sin'}|${f.tipo_material}|${f.unidad}`}
    />
  )
}

export function TablaTraslados({ titulo, filas }: { titulo: string; filas: TotalTraslado[] }) {
  return (
    <TablaDatos
      titulo={titulo}
      columnas={COLUMNAS_TRASLADO}
      filas={filas}
      claveFila={(f) => `${f.origen_area_id ?? 'sin'}|${f.destino_area_id ?? 'sin'}|${f.tipo_material}|${f.unidad}`}
    />
  )
}

export function TablaMes({ titulo, filas }: { titulo: string; filas: TotalMes[] }) {
  return (
    <TablaDatos
      titulo={titulo}
      columnas={COLUMNAS_MES}
      filas={filas}
      claveFila={(f) => `${f.tipo_material}|${f.unidad}`}
      ordenInicial={{ clave: 'cantidad', direccion: 'desc' }}
    />
  )
}
