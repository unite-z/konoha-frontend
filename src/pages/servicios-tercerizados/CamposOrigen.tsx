// RF-SER-011 · Origen de la atención y unidad solicitante (registro y corrección)
/**
 * Campos compartidos por el asistente de registro y por «Corregir origen»: los tres orígenes admitidos y,
 * para «Solicitud de una unidad», una unidad registrada o el nombre de una nueva (se crea como provisional).
 * Los ids usan `prefijo` para enlazar errores y resúmenes: `${prefijo}-origen-Demanda`, `${prefijo}-unidad`,
 * `${prefijo}-unidad-provisional`.
 */
import type { ReactNode } from 'react'
import CampoFormulario from '../../components/ui/CampoFormulario'
import GrupoOpciones from '../../components/ui/GrupoOpciones'
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

const MODOS_UNIDAD: { valor: ValorCamposOrigen['unidadModo']; texto: string }[] = [
  { valor: 'existente', texto: 'Unidad registrada' },
  { valor: 'provisional', texto: 'No figura en la lista' },
]

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
  return (
    <>
      <GrupoOpciones
        etiqueta="¿Por qué surge la atención?"
        idBase={`${prefijo}-origen`}
        opciones={OPCIONES_ORIGEN}
        valor={origen || null}
        onCambiar={(valor) => onCambiar({ origen: valor })}
        obligatorio
        error={errores.origen}
        deshabilitado={deshabilitado}
      />

      {origen === 'SolicitudUnidad' && (
        <div className={estilos.subgrupo}>
          <GrupoOpciones
            etiqueta="Unidad solicitante"
            idBase={`${prefijo}-unidad-modo`}
            opciones={MODOS_UNIDAD}
            valor={unidadModo}
            onCambiar={(valor) => onCambiar({ unidadModo: valor })}
            deshabilitado={deshabilitado}
          />
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
