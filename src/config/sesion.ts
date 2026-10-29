/**
 * Roles con sus nombres exactos (`core_rol.nombre`), los que usa la interfaz de MOD-06 para decidir qué
 * mostrar. La sesión real es la de MOD-01 (`sesion/ProveedorSesion.tsx`): `useRolActual` da el rol.
 */
export type Rol = 'Jefe de sección' | 'Ingeniero de campo' | 'Practicante' | 'Capataz' | 'Operario'
