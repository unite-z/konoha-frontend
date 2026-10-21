/**
 * Sesión provisional del usuario.
 *
 * TODO: sustituir por la sesión del MOD-01 (RF-T-001, RF-T-004).
 * Mientras tanto devuelve el usuario de ejemplo de los mockups de alta fidelidad.
 */

/** Roles con sus nombres exactos (Modelo de BD v1, tabla 3). */
export type Rol = 'Jefe de sección' | 'Ingeniero de campo' | 'Practicante' | 'Capataz' | 'Operario'

export interface Sesion {
  nombre: string
  rol: Rol
}

export function obtenerSesion(): Sesion {
  return { nombre: 'Robert G.', rol: 'Jefe de sección' }
}
