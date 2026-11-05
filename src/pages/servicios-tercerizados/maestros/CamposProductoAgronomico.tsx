// RF-FIT-003 · Campos del formulario de producto agronómico, compartidos entre registrar y editar
import CampoFormulario from '@/components/ui/CampoFormulario'
import Tarjeta from '@/components/ui/Tarjeta'
import type { BorradorProducto, ErroresProducto } from '@/utils/validacionMaestros'
import estilos from './Maestros.module.css'

export const IDS_PRODUCTO = {
  nombre: 'producto-nombre',
  principioActivo: 'producto-principio-activo',
  presentacion: 'producto-presentacion',
} as const

export const ORDEN_PRODUCTO: (keyof ErroresProducto)[] = ['nombre', 'principioActivo', 'presentacion']

export interface CamposProductoAgronomicoProps {
  borrador: BorradorProducto
  errores: ErroresProducto
  onCambiar: (cambios: Partial<BorradorProducto>) => void
}

export default function CamposProductoAgronomico({ borrador, errores, onCambiar }: CamposProductoAgronomicoProps) {
  return (
    <Tarjeta titulo="Datos del producto" relleno="amplio">
      <div className={estilos.cuadricula}>
        <CampoFormulario
          id={IDS_PRODUCTO.nombre}
          etiqueta="Nombre"
          obligatorio
          maxLength={150}
          ayuda="Nombre comercial del producto"
          value={borrador.nombre}
          onChange={(e) => onCambiar({ nombre: e.target.value })}
          error={errores.nombre}
        />
        <CampoFormulario
          id={IDS_PRODUCTO.principioActivo}
          etiqueta="Principio activo (opcional)"
          maxLength={150}
          value={borrador.principioActivo}
          onChange={(e) => onCambiar({ principioActivo: e.target.value })}
          error={errores.principioActivo}
        />
        <CampoFormulario
          id={IDS_PRODUCTO.presentacion}
          etiqueta="Presentación (opcional)"
          maxLength={120}
          ayuda="Por ejemplo, frasco 250 ml"
          value={borrador.presentacion}
          onChange={(e) => onCambiar({ presentacion: e.target.value })}
          error={errores.presentacion}
        />
      </div>
    </Tarjeta>
  )
}
