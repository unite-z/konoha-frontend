/**
 * Comprobación de permisos de la sesión para las reglas de interfaz de cada módulo (AV-382). Los códigos son los de
 * MOD-01 (`core_permiso`); el backend vuelve a comprobarlo todo y responde 403.
 */

/** Permisos de la sesión, o `null` sin sesión. */
export type Permisos = readonly string[] | null | undefined

export function tiene(permisos: Permisos, permiso: string): boolean {
  return permisos != null && permisos.includes(permiso)
}
