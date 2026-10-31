/**
 * Opciones de los selectores «Espacio» y «Tipo de servicio» de los reportes de gestión del MOD-06.
 *
 * Reutiliza los catálogos de MOD-05 (misma sesión HTTP Basic): sus ids son los que el back-end espera en
 * `area_verde_id` y `tipo_servicio_id`. Se cargan todas las páginas (`listarTodo`).
 * - Si un catálogo falla, su selector queda bloqueado con el motivo y la página sigue funcionando sin él.
 * - Si viene incompleto, se muestran las opciones cargadas con una ayuda.
 */
import { useCallback } from 'react'
import type { OpcionSelector } from '../ui/Selector'
import { useConsulta } from '../../hooks/useConsulta'
import { listarAreasVerdes, listarTiposServicio, listarTodo } from '../../services/api/tercerizados'

export interface CatalogosFiltros {
  espacios: OpcionSelector[]
  tiposServicio: OpcionSelector[]
  /** Si el catálogo de espacios falló. */
  motivoBloqueoEspacios?: string
  motivoBloqueoTipos?: string
  /** Si el catálogo vino incompleto. */
  ayudaEspacios?: string
  ayudaTipos?: string
  /** Repite la carga de los catálogos que fallaron. */
  reintentar: () => void
}

/** Motivo del selector bloqueado cuando su catálogo no se pudo cargar. */
export const MOTIVO_CATALOGO_NO_DISPONIBLE = 'No se pudo cargar la lista. Usa «Actualizar» o vuelve a intentarlo más tarde'

/** Ayuda del selector cuando el catálogo tiene más elementos que los cargados. */
export const AYUDA_CATALOGO_INCOMPLETO = 'Se muestran los primeros resultados'

function aOpciones(elementos: { id: number; nombre: string }[]): OpcionSelector[] {
  return elementos
    .map((e) => ({ valor: String(e.id), texto: e.nombre }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es'))
}

export function useCatalogosFiltros(): CatalogosFiltros {
  const espacios = useConsulta('catalogo-espacios', (signal) =>
    listarTodo((page) => listarAreasVerdes({ page }, signal)),
  )
  const tipos = useConsulta('catalogo-tipos-servicio', (signal) =>
    listarTodo((page) => listarTiposServicio({ page }, signal)),
  )

  const reintentarEspacios = espacios.reintentar
  const reintentarTipos = tipos.reintentar
  const errorEspacios = espacios.estado === 'error'
  const errorTipos = tipos.estado === 'error'
  const reintentar = useCallback(() => {
    if (errorEspacios) reintentarEspacios()
    if (errorTipos) reintentarTipos()
  }, [errorEspacios, errorTipos, reintentarEspacios, reintentarTipos])

  return {
    espacios: aOpciones(espacios.datos?.resultados ?? []),
    tiposServicio: aOpciones(tipos.datos?.resultados ?? []),
    motivoBloqueoEspacios: errorEspacios ? MOTIVO_CATALOGO_NO_DISPONIBLE : undefined,
    motivoBloqueoTipos: errorTipos ? MOTIVO_CATALOGO_NO_DISPONIBLE : undefined,
    ayudaEspacios: espacios.datos && !espacios.datos.completo ? AYUDA_CATALOGO_INCOMPLETO : undefined,
    ayudaTipos: tipos.datos && !tipos.datos.completo ? AYUDA_CATALOGO_INCOMPLETO : undefined,
    reintentar,
  }
}
