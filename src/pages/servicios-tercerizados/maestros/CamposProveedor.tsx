// RF-SER-001 · Campos del formulario de proveedor, compartidos entre registrar y editar
import CampoFormulario from '@/components/ui/CampoFormulario'
import Selector from '@/components/ui/Selector'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
import Tarjeta from '@/components/ui/Tarjeta'
import { listarProveedoresMaestro } from '@/services/api/maestrosTercerizados'
import type { ProveedorMaestro, TipoVinculo } from '@/types/maestrosTercerizados'
import { OPCIONES_VINCULO, requiereRelacionado, type BorradorProveedor, type ErroresProveedor } from '@/utils/validacionMaestros'
import estilos from './Maestros.module.css'

export const IDS_PROVEEDOR = {
  razonSocial: 'proveedor-razon-social',
  ruc: 'proveedor-ruc',
  contactoNombre: 'proveedor-contacto-nombre',
  contactoTelefono: 'proveedor-contacto-telefono',
  contactoCorreo: 'proveedor-contacto-correo',
  relacionado: 'proveedor-relacionado',
} as const

export const ORDEN_PROVEEDOR: (keyof ErroresProveedor)[] = [
  'razonSocial',
  'ruc',
  'contactoNombre',
  'contactoTelefono',
  'contactoCorreo',
  'relacionado',
]

export interface CamposProveedorProps {
  borrador: BorradorProveedor
  errores: ErroresProveedor
  onCambiar: (cambios: Partial<BorradorProveedor>) => void
}

export default function CamposProveedor({ borrador, errores, onCambiar }: CamposProveedorProps) {
  return (
    <>
      <Tarjeta titulo="Datos del proveedor" relleno="amplio">
        <div className={estilos.cuadricula}>
          <CampoFormulario
            id={IDS_PROVEEDOR.ruc}
            etiqueta="RUC"
            obligatorio
            formato="entero"
            maxLength={11}
            ayuda="11 dígitos"
            value={borrador.ruc}
            onChange={(e) => onCambiar({ ruc: e.target.value })}
            error={errores.ruc}
          />
          <CampoFormulario
            id={IDS_PROVEEDOR.razonSocial}
            etiqueta="Razón social"
            obligatorio
            maxLength={200}
            ayuda="Nombre legal de la empresa"
            value={borrador.razonSocial}
            onChange={(e) => onCambiar({ razonSocial: e.target.value })}
            error={errores.razonSocial}
          />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Persona de contacto (opcional)" relleno="amplio">
        <div className={estilos.cuadricula}>
          <CampoFormulario
            id={IDS_PROVEEDOR.contactoNombre}
            etiqueta="Nombre"
            maxLength={120}
            ayuda="Nombre de la persona de contacto"
            value={borrador.contactoNombre}
            onChange={(e) => onCambiar({ contactoNombre: e.target.value })}
            error={errores.contactoNombre}
          />
          <CampoFormulario
            id={IDS_PROVEEDOR.contactoTelefono}
            etiqueta="Teléfono"
            type="tel"
            maxLength={30}
            ayuda="Por ejemplo, 999 000 000"
            value={borrador.contactoTelefono}
            onChange={(e) => onCambiar({ contactoTelefono: e.target.value })}
            error={errores.contactoTelefono}
          />
          <CampoFormulario
            id={IDS_PROVEEDOR.contactoCorreo}
            etiqueta="Correo"
            type="email"
            maxLength={254}
            ayuda="Por ejemplo, nombre@empresa.pe"
            value={borrador.contactoCorreo}
            onChange={(e) => onCambiar({ contactoCorreo: e.target.value })}
            error={errores.contactoCorreo}
          />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Vínculo con otras empresas" relleno="amplio">
        <div className={estilos.cuadricula}>
          <Selector
            id="proveedor-vinculo"
            etiqueta="Tipo de vínculo"
            ayuda="Empresa principal, subsidiaria o vinculada con otro proveedor"
            valor={borrador.tipoVinculo}
            opciones={OPCIONES_VINCULO.map((o) => ({ valor: o.valor, texto: o.texto }))}
            onCambiar={(valor) =>
              onCambiar({
                tipoVinculo: valor as TipoVinculo,
                relacionado: requiereRelacionado(valor as TipoVinculo) ? borrador.relacionado : null,
              })
            }
          />
          {requiereRelacionado(borrador.tipoVinculo) && (
            <SelectorBuscable<ProveedorMaestro>
              id={IDS_PROVEEDOR.relacionado}
              etiqueta="Proveedor relacionado"
              obligatorio
              ayuda="Empresa principal con la que se vincula"
              error={errores.relacionado}
              valor={borrador.relacionado}
              claveDe={(p) => p.id}
              textoDe={(p) => p.razon_social}
              detalleDe={(p) => (p.ruc ? `RUC ${p.ruc}` : 'Sin RUC')}
              buscar={(q, signal) => listarProveedoresMaestro({ q: q || undefined, activo: true }, 1, signal)}
              onCambiar={(relacionado) => onCambiar({ relacionado })}
            />
          )}
        </div>
      </Tarjeta>
    </>
  )
}
