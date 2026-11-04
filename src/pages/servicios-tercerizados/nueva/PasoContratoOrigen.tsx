// RF-SER-003 y RF-SER-011 · Paso 1: contrato, descripción y origen
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Casilla from '@/components/ui/Casilla'
import { AreaTexto } from '@/components/ui/CampoFormulario'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
import Tarjeta from '@/components/ui/Tarjeta'
import { listarContratos } from '@/services/api/tercerizados'
import type { Contrato, TipoServicio } from '@/types/tercerizados'
import { formatearFecha } from '@/utils/formato'
import type { BorradorAtencion, ErroresPaso1 } from '@/utils/nuevaAtencion'
import CamposOrigen from '../CamposOrigen'
import { IDS_PASO1 } from './idsCampos'
import estilos from './NuevaAtencion.module.css'

export interface PasoContratoOrigenProps {
  borrador: BorradorAtencion
  cambiar: (cambios: Partial<BorradorAtencion>) => void
  errores: ErroresPaso1
  /** Servicio del contrato elegido (para la marca de riesgo); `null` si aún no se conoce. */
  servicio: TipoServicio | null
}

function detalleContrato(c: Contrato) {
  return `${c.proveedor_nombre ?? 'Proveedor sin nombre'} · ${c.tipo_servicio_nombre ?? 'Servicio'} · vigente hasta ${formatearFecha(c.vigencia_fin)}`
}

export default function PasoContratoOrigen({ borrador, cambiar, errores, servicio }: PasoContratoOrigenProps) {
  const riesgoCatalogo = Boolean(servicio?.es_riesgo)

  return (
    <div className={estilos.paso}>
      <Tarjeta titulo="Contrato" relleno="amplio">
        <SelectorBuscable<Contrato>
          id={IDS_PASO1.contrato}
          etiqueta="Contrato vigente"
          obligatorio
          ayuda="Busca por número, proveedor o servicio. Solo se listan contratos vigentes hoy."
          error={errores.contrato}
          valor={borrador.contrato}
          claveDe={(c) => c.id}
          textoDe={(c) => c.numero}
          detalleDe={detalleContrato}
          buscar={(q, signal) => listarContratos({ vigente: true, q: q || undefined }, signal)}
          onCambiar={(contrato) => cambiar({ contrato })}
        />
        {borrador.contrato && (
          <ListaDescripcion
            elementos={[
              { etiqueta: 'Proveedor', valor: borrador.contrato.proveedor_nombre },
              { etiqueta: 'Servicio', valor: borrador.contrato.tipo_servicio_nombre },
              {
                etiqueta: 'Vigencia',
                valor: `${formatearFecha(borrador.contrato.vigencia_inicio)} al ${formatearFecha(borrador.contrato.vigencia_fin)}`,
              },
            ]}
          />
        )}
        <Casilla
          id="nueva-riesgo"
          etiqueta="Atención de riesgo"
          marcada={borrador.es_riesgo || riesgoCatalogo}
          disabled={riesgoCatalogo}
          onCambiar={(marcada) => cambiar({ es_riesgo: marcada })}
          ayuda={`${
            riesgoCatalogo
              ? `El servicio «${servicio?.nombre}» es de riesgo según el catálogo; la marca no se puede quitar.`
              : 'Márcala si el trabajo implica riesgo para las personas.'
          } El inicio de una atención de riesgo queda bloqueado hasta integrar la revisión de seguridad.`}
        />
      </Tarjeta>

      <Tarjeta titulo="Requerimiento" relleno="amplio">
        <AreaTexto
          id={IDS_PASO1.descripcion}
          etiqueta="Descripción del trabajo"
          obligatorio
          rows={4}
          ayuda="Qué se pide al proveedor y dónde"
          value={borrador.descripcion}
          onChange={(e) => cambiar({ descripcion: e.target.value })}
          error={errores.descripcion}
        />
      </Tarjeta>

      <Tarjeta titulo="Origen" relleno="amplio">
        <CamposOrigen
          prefijo="nueva"
          origen={borrador.origen}
          unidadModo={borrador.unidadModo}
          unidad={borrador.unidad}
          unidadProvisional={borrador.unidadProvisional}
          errores={errores}
          onCambiar={cambiar}
          notaUnidad={
            <AvisoEnLinea tono="info">
              Cuando termine el servicio podrás registrar si la unidad está de acuerdo con el trabajo. Ese acuerdo no
              sustituye la conformidad del jefe de sección.
            </AvisoEnLinea>
          }
        />
      </Tarjeta>
    </div>
  )
}
