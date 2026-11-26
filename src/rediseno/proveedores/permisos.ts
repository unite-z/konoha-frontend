/** Permisos de la vista de contratos (por código de `core_permiso`; el backend los vuelve a comprobar). */
import { PERMISOS_TERCERIZADOS } from '@/config/permisosTercerizados'

/** Ver los montos de los contratos; sin él, el backend devuelve `monto_fijo` nulo. */
export const VER_MONTOS = 'SER.CONTRATO.VER_MONTOS'

export function puedeConsultarContratos(permisos: readonly string[] | null): boolean {
  return permisos !== null && permisos.includes(PERMISOS_TERCERIZADOS.consultarContratos)
}

export function puedeVerMontos(permisos: readonly string[] | null): boolean {
  return permisos !== null && permisos.includes(VER_MONTOS)
}

/** Crear y editar contratos: solo la jefatura de sección. */
export function puedeGestionarContratos(permisos: readonly string[] | null): boolean {
  return permisos !== null && permisos.includes(PERMISOS_TERCERIZADOS.gestionarContratos)
}
