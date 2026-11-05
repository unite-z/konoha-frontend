// RF-SER-002 · Campos del formulario de contrato, compartidos entre registrar y editar
import CampoFormulario, { AreaTexto } from '@/components/ui/CampoFormulario'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Selector from '@/components/ui/Selector'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { listarProveedoresMaestro } from '@/services/api/maestrosTercerizados'
import { listarTiposServicio, listarTodo } from '@/services/api/tercerizados'
import type { ProveedorMaestro } from '@/types/maestrosTercerizados'
import { OPCIONES_FRECUENCIA, type BorradorContrato, type ErroresContrato } from '@/utils/validacionMaestros'
import estilos from './Maestros.module.css'

export const IDS_CONTRATO = {
  proveedor: 'contrato-proveedor',
  tipoServicio: 'contrato-tipo-servicio',
  area: 'contrato-area',
  monto: 'contrato-monto',
  frecuenciaCantidad: 'contrato-frecuencia-cantidad',
  frecuenciaUnidad: 'contrato-frecuencia-unidad',
  inicio: 'contrato-inicio',
  fin: 'contrato-fin',
} as const

export const ORDEN_CONTRATO: (keyof ErroresContrato)[] = [
  'proveedor',
  'tipoServicio',
  'area',
  'monto',
  'frecuenciaCantidad',
  'frecuenciaUnidad',
  'inicio',
  'fin',
]

export interface CamposContratoProps {
  borrador: BorradorContrato
  errores: ErroresContrato
  /** `true` si la vigencia ya terminó (muestra el aviso de histórico). */
  vencido: boolean
  onCambiar: (cambios: Partial<BorradorContrato>) => void
}

export default function CamposContrato({ borrador, errores, vencido, onCambiar }: CamposContratoProps) {
  // Solo los servicios que ejecuta un tercero admiten contrato (regla de RF-SER-003).
  const servicios = useConsulta('tipos-servicio-activos', (signal) =>
    listarTodo((page) => listarTiposServicio({ activo: true, page }, signal)),
  )
  const opcionesServicio = [
    { valor: '', texto: 'Selecciona el tipo de servicio' },
    ...(servicios.datos?.resultados ?? [])
      .filter((t) => t.ejecutor === 'Tercerizado')
      .map((t) => ({ valor: String(t.id), texto: t.nombre })),
  ]

  return (
    <>
      <Tarjeta titulo="Proveedor" relleno="amplio">
        <div className={estilos.cuadricula}>
          <SelectorBuscable<ProveedorMaestro>
            id={IDS_CONTRATO.proveedor}
            etiqueta="Proveedor"
            etiquetaOculta
            obligatorio
            ayuda="Solo proveedores habilitados"
            error={errores.proveedor}
            valor={borrador.proveedor}
            claveDe={(p) => p.id}
            textoDe={(p) => p.razon_social}
            detalleDe={(p) => (p.ruc ? `RUC ${p.ruc}` : 'Sin RUC')}
            buscar={(q, signal) => listarProveedoresMaestro({ q: q || undefined, activo: true }, 1, signal)}
            onCambiar={(proveedor) => onCambiar({ proveedor })}
          />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Servicio y costo" relleno="amplio">
        <div className={estilos.cuadricula}>
          <Selector
            id={IDS_CONTRATO.tipoServicio}
            etiqueta="Tipo de servicio"
            obligatorio
            ayuda="Solo servicios que ejecuta un tercero"
            valor={borrador.tipoServicioId}
            opciones={opcionesServicio}
            error={errores.tipoServicio}
            bloqueadoMotivo={
              servicios.estado === 'error'
                ? 'No se pudieron cargar los tipos de servicio. Recarga la página para reintentar'
                : undefined
            }
            onCambiar={(valor) => onCambiar({ tipoServicioId: valor })}
          />
          <CampoFormulario
            id={IDS_CONTRATO.area}
            etiqueta="Área o metrado estimado"
            obligatorio
            maxLength={120}
            ayuda="Por ejemplo, 120 ejemplares o 3 500 m²"
            value={borrador.area}
            onChange={(e) => onCambiar({ area: e.target.value })}
            error={errores.area}
          />
          <CampoFormulario
            id={IDS_CONTRATO.monto}
            etiqueta="Monto fijo (S/)"
            obligatorio
            formato="decimal"
            decimales={2}
            ayuda="Por ejemplo, 12000"
            value={borrador.monto}
            onChange={(e) => onCambiar({ monto: e.target.value })}
            error={errores.monto}
          />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Frecuencia y vigencia" relleno="amplio">
        <div className={estilos.cuadricula}>
          <CampoFormulario
            id={IDS_CONTRATO.frecuenciaCantidad}
            etiqueta="Frecuencia (veces)"
            obligatorio
            formato="entero"
            maxLength={3}
            ayuda="Por ejemplo, 4"
            value={borrador.frecuenciaCantidad}
            onChange={(e) => onCambiar({ frecuenciaCantidad: e.target.value })}
            error={errores.frecuenciaCantidad}
          />
          <Selector
            id={IDS_CONTRATO.frecuenciaUnidad}
            etiqueta="Período de la frecuencia"
            obligatorio
            valor={borrador.frecuenciaUnidad}
            opciones={[{ valor: '', texto: 'Selecciona el período' }, ...OPCIONES_FRECUENCIA]}
            error={errores.frecuenciaUnidad}
            onCambiar={(valor) => onCambiar({ frecuenciaUnidad: valor as BorradorContrato['frecuenciaUnidad'] })}
          />
          <CampoFormulario
            id={IDS_CONTRATO.inicio}
            etiqueta="Inicio de la vigencia"
            obligatorio
            ayuda="Primer día del contrato"
            type="date"
            value={borrador.inicio}
            onChange={(e) => onCambiar({ inicio: e.target.value })}
            error={errores.inicio}
          />
          <CampoFormulario
            id={IDS_CONTRATO.fin}
            etiqueta="Fin de la vigencia"
            obligatorio
            ayuda="Último día del contrato"
            type="date"
            value={borrador.fin}
            onChange={(e) => onCambiar({ fin: e.target.value })}
            error={errores.fin}
          />
        </div>
        {vencido && (
          <AvisoEnLinea tono="advertencia" titulo="La vigencia ya terminó">
            El contrato se conservará como histórico y no se podrá usar en nuevas atenciones.
          </AvisoEnLinea>
        )}
        <AreaTexto
          id="contrato-condiciones"
          etiqueta="Condiciones (opcional)"
          rows={3}
          ayuda="Condiciones principales del contrato"
          value={borrador.condiciones}
          onChange={(e) => onCambiar({ condiciones: e.target.value })}
        />
      </Tarjeta>
    </>
  )
}
