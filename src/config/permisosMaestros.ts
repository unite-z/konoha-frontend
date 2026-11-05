/**
 * Quién puede hacer qué en proveedores, contratos y atención especial (RF-SER-001, RF-SER-002, RF-INV-011).
 * La interfaz solo oculta lo que el rol no puede hacer: el back-end vuelve a comprobarlo todo.
 */
import type { RolTercerizados } from '../types/tercerizados'

const JEFE: RolTercerizados = 'Jefe de sección'

/** Solo el jefe de sección registra proveedores y contratos. */
export function puedeRegistrarProveedoresYContratos(rol: RolTercerizados | null): boolean {
  return rol === JEFE
}

/** Los tres roles del módulo marcan ejemplares con atención especial (RF-INV-011). */
export function puedeMarcarAtencionEspecial(rol: RolTercerizados | null): boolean {
  return rol !== null
}

/** Solo el jefe de sección habilita o inhabilita un proveedor. */
export function puedeCambiarEstadoProveedor(rol: RolTercerizados | null): boolean {
  return rol === JEFE
}

/** Solo el jefe de sección administra el catálogo de productos agronómicos (RF-FIT-003). */
export function puedeAdministrarProductosAgronomicos(rol: RolTercerizados | null): boolean {
  return rol === JEFE
}

/** Los tres roles del módulo registran observaciones de plagas (RF-FIT-005). */
export function puedeRegistrarObservacionPlaga(rol: RolTercerizados | null): boolean {
  return rol !== null
}
