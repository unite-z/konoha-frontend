// RF-SER-011 · Origen de la atención y unidad solicitante (registro y corrección)
/**
 * Campos compartidos por el asistente de registro y por «Corregir origen»: los tres orígenes admitidos y,
 * para «Solicitud de una unidad», una unidad registrada o el nombre de una nueva (se crea como provisional).
 * Los ids usan `prefijo` para enlazar errores y resúmenes: `${prefijo}-origen-Demanda`, `${prefijo}-unidad`,
 * `${prefijo}-unidad-provisional`.
 */
import type { ReactNode } from 'react'
import CampoFormulario from '../../components/ui/CampoFormulario'
import Icono from '../../components/ui/Icono'
import SelectorBuscable from '../../components/ui/SelectorBuscable'
import { listarUnidadesInstitucionales } from '../../services/api/tercerizados'
import type { OrigenAtencion, UnidadInstitucional } from '../../types/tercerizados'
import { OPCIONES_ORIGEN } from '../../utils/estadosTercerizados'
import { LARGO_MAXIMO_UNIDAD_PROVISIONAL } from '../../utils/validacionTercerizados'
import estilos from './nueva/NuevaAtencion.module.css'

export interface ValorCamposOrigen {
  origen: OrigenAtencion | ''
  unidadModo: 'existente' | 'provisional'
  unidad: UnidadInstitucional | null
  unidadProvisional: string
}

export interface CamposOrigenProps extends ValorCamposOrigen {
  prefijo: string
  errores: { origen?: string; unidad?: string; unidadProvisional?: string }
  deshabilitado?: boolean
  onCambiar: (cambios: Partial<ValorCamposOrigen>) => void
  /** Contenido bajo los campos de la unidad (por ejemplo, un aviso sobre el acuerdo). */
  notaUnidad?: ReactNode
}

export default function CamposOrigen({
  prefijo,
  origen,
  unidadModo,
  unidad,
  unidadProvisional,
  errores,
  deshabilitado = false,
  onCambiar,
  notaUnidad,
}: CamposOrigenProps) {
  const idError = `${prefijo}-origen-error`
  return (
    <>
      <fieldset className={estilos.opciones} aria-describedby={errores.origen ? idError : undefined} disabled={deshabilitado}>
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
              id={`${prefijo}-origen-${opcion.valor}`}
              type="radio"
              name={`${prefijo}-origen`}
              value={opcion.valor}
              checked={origen === opcion.valor}
              onChange={() => onCambiar({ origen: opcion.valor })}
            />
            {opcion.texto}
          </label>
        ))}
        {errores.origen && (
          <p id={idError} className={estilos.error}>
            <Icono nombre="aspa" tamano="sm" />
            <span>{errores.origen}</span>
          </p>
        )}
      </fieldset>

      {origen === 'SolicitudUnidad' && (
        <div className={estilos.subgrupo}>
          <fieldset className={estilos.opciones} disabled={deshabilitado}>
            <legend className={estilos.leyenda}>Unidad solicitante</legend>
            <label className={estilos.radio}>
              <input
                type="radio"
                name={`${prefijo}-unidad-modo`}
                checked={unidadModo === 'existente'}
                onChange={() => onCambiar({ unidadModo: 'existente' })}
              />
              Unidad registrada
            </label>
            <label className={estilos.radio}>
              <input
                type="radio"
                name={`${prefijo}-unidad-modo`}
                checked={unidadModo === 'provisional'}
                onChange={() => onCambiar({ unidadModo: 'provisional' })}
              />
              No figura en la lista
            </label>
          </fieldset>
          {unidadModo === 'existente' ? (
            <SelectorBuscable<UnidadInstitucional>
              id={`${prefijo}-unidad`}
              etiqueta="Unidad"
              obligatorio
              error={errores.unidad}
              valor={unidad}
              claveDe={(u) => u.id}
              textoDe={(u) => u.nombre}
              detalleDe={(u) => (u.provisional ? 'Unidad provisional' : 'Unidad registrada')}
              buscar={(q, signal) => listarUnidadesInstitucionales({ activo: true, q: q || undefined }, signal)}
              onCambiar={(elegida) => onCambiar({ unidad: elegida })}
            />
          ) : (
            <CampoFormulario
              id={`${prefijo}-unidad-provisional`}
              etiqueta="Nombre de la unidad"
              obligatorio
              maxLength={LARGO_MAXIMO_UNIDAD_PROVISIONAL}
              ayuda="Se registrará como unidad provisional hasta que exista la lista oficial. Si ya existe con ese nombre, se reutiliza."
              value={unidadProvisional}
              onChange={(e) => onCambiar({ unidadProvisional: e.target.value })}
              error={errores.unidadProvisional}
              disabled={deshabilitado}
            />
          )}
          {notaUnidad}
        </div>
      )}
    </>
  )
}
