// RF-SER-003 y RF-SER-011 · Paso 1: contrato, descripción y origen
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import { AreaTexto } from '../../../components/ui/CampoFormulario'
import ListaDescripcion from '../../../components/ui/ListaDescripcion'
import SelectorBuscable from '../../../components/ui/SelectorBuscable'
import { listarContratos } from '../../../services/api/tercerizados'
import type { Contrato, TipoServicio } from '../../../types/tercerizados'
import { formatearFecha } from '../../../utils/formato'
import type { BorradorAtencion, ErroresPaso1 } from '../../../utils/nuevaAtencion'
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
      <section className={estilos.grupo} aria-labelledby="titulo-contrato">
        <h2 id="titulo-contrato" className={estilos.tituloGrupo}>
          Contrato
        </h2>
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
        <div className={estilos.casilla}>
          <input
            id="nueva-riesgo"
            type="checkbox"
            checked={borrador.es_riesgo || riesgoCatalogo}
            disabled={riesgoCatalogo}
            aria-describedby="nueva-riesgo-ayuda"
            onChange={(e) => cambiar({ es_riesgo: e.target.checked })}
          />
          <div>
            <label htmlFor="nueva-riesgo">Atención de riesgo</label>
            <p id="nueva-riesgo-ayuda" className={estilos.ayuda}>
              {riesgoCatalogo
                ? `El servicio «${servicio?.nombre}» es de riesgo según el catálogo; la marca no se puede quitar.`
                : 'Márcala si el trabajo implica riesgo para las personas.'}{' '}
              El inicio de una atención de riesgo queda bloqueado hasta integrar la revisión de seguridad.
            </p>
          </div>
        </div>
      </section>

      <section className={estilos.grupo} aria-labelledby="titulo-requerimiento">
        <h2 id="titulo-requerimiento" className={estilos.tituloGrupo}>
          Requerimiento
        </h2>
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
      </section>

      <section className={estilos.grupo} aria-labelledby="titulo-origen">
        <h2 id="titulo-origen" className={estilos.tituloGrupo}>
          Origen
        </h2>
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
      </section>
    </div>
  )
}
