/**
 * Tablas de RF-REP-005: las que se abren en los diálogos «Ver detalles» (movimientos del mes, consumido, propagado
 * o trasladado, y totales de un mes de la comparación) y la de productos aplicados por proveedores (flujo 3a), que
 * va en su propia sección. Paginan en el cliente (25, 50 o 100 por página).
 */
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import type { ProductoProveedor, TotalMaterial, TotalMes, TotalTraslado } from '@/types/reportesGestion'
import { formatearNumero, SIN_VALOR } from '@/utils/formato'
import { numeroDeDecimal } from '@/utils/reportesGestion'
import { textoLista } from './materialVegetal'

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

const COLUMNAS_PRODUCTOS: ColumnaTabla<ProductoProveedor>[] = [
  { clave: 'producto', titulo: 'Producto', ordenable: true },
  { clave: 'principio_activo', titulo: 'Principio activo', render: (f) => f.principio_activo ?? SIN_VALOR },
  { clave: 'proveedor', titulo: 'Proveedor', ordenable: true },
  {
    clave: 'aplicaciones',
    titulo: 'Atenciones',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearNumero(f.aplicaciones),
  },
  { clave: 'dosis', titulo: 'Dosis', render: (f) => textoLista(f.dosis) },
  { clave: 'atenciones', titulo: 'Códigos', render: (f) => textoLista(f.atenciones) },
]

export function TablaProductosProveedor({ filas }: { filas: ProductoProveedor[] }) {
  return (
    <TablaDatos
      titulo="Productos agronómicos aplicados por proveedores"
      columnas={COLUMNAS_PRODUCTOS}
      filas={filas}
      claveFila={(f) => `${f.producto_id}|${f.proveedor_id}`}
    />
  )
}

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
