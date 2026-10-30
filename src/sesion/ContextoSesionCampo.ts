import { useSesionActiva } from './ContextoSesion'
import type { UsuarioCampo } from '../types/operacionCampo'

/** MOD-04 comparte el ingreso de MOD-01; no almacena credenciales propias. */
export function useSesionCampo(): { usuario: UsuarioCampo | null } {
  const sesion = useSesionActiva()
  const usuario: UsuarioCampo | null = sesion ? {
    id: sesion.usuario.id,
    usuario: sesion.usuario.nombre_usuario,
    nombre: sesion.usuario.nombre,
    rol: sesion.rol.codigo === 'practicante' ? 'Practicante autorizado' : sesion.rol.nombre,
    personal_id: null,
  } : null
  return { usuario }
}
