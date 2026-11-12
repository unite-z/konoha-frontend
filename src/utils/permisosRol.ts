/**
 * Lógica pura de la matriz de permisos por rol (AV-381): agrupar el catálogo por módulo y comparar dos selecciones.
 */
import type { PermisoCatalogo } from '../types/core'

/** Solo del superadministrador: nunca se marca en otro rol (el backend responde 409 `permiso-reservado`). */
export const PERMISO_RESERVADO = 'CORE.ROL.GESTIONAR'

const NOMBRE_MODULO: Record<string, string> = {
  'MOD-01': 'MOD-01 · Core y seguridad',
  'MOD-02': 'MOD-02 · Inventario y arbolado',
  'MOD-03': 'MOD-03 · Planificación, corte e incidencias',
  'MOD-04': 'MOD-04 · Operación de campo',
  'MOD-05': 'MOD-05 · Servicios tercerizados',
  'MOD-06': 'MOD-06 · Reportes, indicadores e IA',
}

export interface GrupoPermisos {
  modulo: string
  permisos: PermisoCatalogo[]
}

/** Grupos en orden de módulo; dentro de cada uno, por descripción. */
export function agruparPorModulo(catalogo: PermisoCatalogo[]): GrupoPermisos[] {
  const grupos = new Map<string, PermisoCatalogo[]>()
  for (const permiso of catalogo) {
    const lista = grupos.get(permiso.modulo) ?? []
    lista.push(permiso)
    grupos.set(permiso.modulo, lista)
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([modulo, permisos]) => ({
      modulo: NOMBRE_MODULO[modulo] ?? modulo,
      permisos: [...permisos].sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es')),
    }))
}

/** Qué se añade y qué se quita al pasar de `antes` a `despues`, ordenado. */
export function diferenciaPermisos(antes: string[], despues: string[]): { anadidos: string[]; quitados: string[] } {
  const previos = new Set(antes)
  const nuevos = new Set(despues)
  return {
    anadidos: [...nuevos].filter((p) => !previos.has(p)).sort(),
    quitados: [...previos].filter((p) => !nuevos.has(p)).sort(),
  }
}
