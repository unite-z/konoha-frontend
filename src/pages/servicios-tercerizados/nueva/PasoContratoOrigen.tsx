// RF-SER-003 y RF-SER-011 · Paso 1: contrato, descripción y origen
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import CampoFormulario, { AreaTexto } from '../../../components/ui/CampoFormulario'
import Icono from '../../../components/ui/Icono'
import ListaDescripcion from '../../../components/ui/ListaDescripcion'
import SelectorBuscable from '../../../components/ui/SelectorBuscable'
import { listarContratos, listarUnidadesInstitucionales } from '../../../services/api/tercerizados'
import type { Contrato, TipoServicio, UnidadInstitucional } from '../../../types/tercerizados'
import { OPCIONES_ORIGEN } from '../../../utils/estadosTercerizados'
import { formatearFecha } from '../../../utils/formato'
import { LARGO_MAXIMO_UNIDAD, type BorradorAtencion, type ErroresPaso1 } from '../../../utils/nuevaAtencion'
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
  const esUnidad = borrador.origen === 'SolicitudUnidad'

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
        <fieldset className={estilos.opciones} aria-describedby={errores.origen ? 'nueva-origen-error' : undefined}>
          <legend className={estilos.leyenda}>
            ¿Por qué surge la atención?
            <span className={estilos.asterisco} aria-hidden="true">
              {' '}
              *
            </span>
          </legend>
          {OPCIONES_ORIGEN.map((opcion) => (
            <label key={opcion.valor} className={estilos.radio}>
              <input
                id={`nueva-origen-${opcion.valor}`}
                type="radio"
                name="nueva-origen"
                value={opcion.valor}
                checked={borrador.origen === opcion.valor}
                onChange={() => cambiar({ origen: opcion.valor })}
              />
              {opcion.texto}
            </label>
          ))}
          {errores.origen && (
            <p id="nueva-origen-error" className={estilos.error}>
              <Icono nombre="aspa" tamano="sm" />
              <span>{errores.origen}</span>
            </p>
          )}
        </fieldset>

        {esUnidad && (
          <div className={estilos.subgrupo}>
            <fieldset className={estilos.opciones}>
              <legend className={estilos.leyenda}>Unidad solicitante</legend>
              <label className={estilos.radio}>
                <input
                  type="radio"
                  name="nueva-unidad-modo"
                  checked={borrador.unidadModo === 'existente'}
                  onChange={() => cambiar({ unidadModo: 'existente' })}
                />
                Unidad registrada
              </label>
              <label className={estilos.radio}>
                <input
                  type="radio"
                  name="nueva-unidad-modo"
                  checked={borrador.unidadModo === 'provisional'}
                  onChange={() => cambiar({ unidadModo: 'provisional' })}
                />
                No figura en la lista
              </label>
            </fieldset>
            {borrador.unidadModo === 'existente' ? (
              <SelectorBuscable<UnidadInstitucional>
                id={IDS_PASO1.unidad}
                etiqueta="Unidad"
                obligatorio
                error={errores.unidad}
                valor={borrador.unidad}
                claveDe={(u) => u.id}
                textoDe={(u) => u.nombre}
                detalleDe={(u) => (u.provisional ? 'Unidad provisional' : 'Unidad registrada')}
                buscar={(q, signal) => listarUnidadesInstitucionales({ activo: true, q: q || undefined }, signal)}
                onCambiar={(unidad) => cambiar({ unidad })}
              />
            ) : (
              <CampoFormulario
                id={IDS_PASO1.unidadProvisional}
                etiqueta="Nombre de la unidad"
                obligatorio
                maxLength={LARGO_MAXIMO_UNIDAD}
                ayuda="Se registrará como unidad provisional hasta que exista la lista oficial. Si ya existe con ese nombre, se reutiliza."
                value={borrador.unidadProvisional}
                onChange={(e) => cambiar({ unidadProvisional: e.target.value })}
                error={errores.unidadProvisional}
              />
            )}
            <AvisoEnLinea tono="info">
              Cuando termine el servicio podrás registrar si la unidad está de acuerdo con el trabajo. Ese acuerdo no
              sustituye la conformidad del jefe de sección.
            </AvisoEnLinea>
          </div>
        )}
      </section>
    </div>
  )
}
