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
