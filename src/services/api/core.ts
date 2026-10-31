/**
 * Servicios de MOD-01: sesión, usuarios, roles, accesos, historial, adjuntos y repositorio.
 * Las páginas nunca llaman a `fetch`: usan estas funciones.
 */
import type {
  Acceso,
  Adjunto,
  CambioContrasena,
  CambioCuenta,
  CambioDatosUsuario,
  CodigoRol,
  Credenciales,
  EntidadRegistro,
  EntradaHistorial,
  NuevoUsuario,
  PaginaCore,
  PaginaRepositorio,
  ResultadoAcceso,
  RolConPermisos,
  RolUsuario,
  SesionCore,
  TipoRepositorio,
  UsuarioConContrasena,
  UsuarioResumen,
} from '../../types/core'
import { descargarCore, solicitarCore } from './clienteCore'

// --- Sesión (RF-T-001) ------------------------------------------------------------------------------------

export function iniciarSesion(credenciales: Credenciales): Promise<SesionCore> {
  return solicitarCore('auth/login/', { metodo: 'POST', cuerpo: credenciales })
}

export function obtenerSesion(signal?: AbortSignal): Promise<SesionCore> {
  return solicitarCore('auth/sesion/', { signal })
}

export function cerrarSesionCore(): Promise<void> {
  return solicitarCore('auth/logout/', { metodo: 'POST' })
}

export function cambiarContrasena(cambio: CambioContrasena): Promise<void> {
  return solicitarCore('auth/contrasena/', { metodo: 'POST', cuerpo: cambio })
}

// --- Usuarios y roles (RF-T-002 y RF-T-003) ------------------------------------------------------------

export interface FiltrosUsuarios {
  rol?: CodigoRol | ''
  estado?: string
  vigencia_proxima?: boolean
  page?: number
}

export function listarUsuarios(filtros: FiltrosUsuarios, signal?: AbortSignal): Promise<PaginaCore<UsuarioResumen>> {
  return solicitarCore('usuarios/', {
    parametros: { ...filtros, vigencia_proxima: filtros.vigencia_proxima || undefined },
    signal,
  })
}

export function obtenerUsuario(id: number, signal?: AbortSignal): Promise<UsuarioResumen> {
  return solicitarCore(`usuarios/${id}/`, { signal })
}

export function crearUsuario(nuevo: NuevoUsuario): Promise<UsuarioConContrasena> {
  return solicitarCore('usuarios/', { metodo: 'POST', cuerpo: nuevo })
}

export function actualizarUsuario(id: number, cambio: CambioDatosUsuario): Promise<UsuarioResumen> {
  return solicitarCore(`usuarios/${id}/`, { metodo: 'PATCH', cuerpo: cambio })
}

export function desactivarUsuario(id: number, motivo: string): Promise<UsuarioResumen> {
  return solicitarCore(`usuarios/${id}/desactivar/`, { metodo: 'POST', cuerpo: { motivo } })
}

export function activarUsuario(id: number): Promise<UsuarioConContrasena> {
  return solicitarCore(`usuarios/${id}/activar/`, { metodo: 'POST' })
}

export function desbloquearUsuario(id: number): Promise<UsuarioResumen> {
  return solicitarCore(`usuarios/${id}/desbloquear/`, { metodo: 'POST' })
}

export function cerrarSesionesUsuario(id: number): Promise<{ sesiones_cerradas: number }> {
  return solicitarCore(`usuarios/${id}/cerrar-sesiones/`, { metodo: 'POST' })
}

export function generarContrasenaTemporal(id: number): Promise<UsuarioConContrasena> {
  return solicitarCore(`usuarios/${id}/contrasena-temporal/`, { metodo: 'POST' })
}

export function historialUsuario(id: number, signal?: AbortSignal): Promise<CambioCuenta[]> {
  return solicitarCore(`usuarios/${id}/historial/`, { signal })
}

export function listarRoles(signal?: AbortSignal): Promise<RolConPermisos[]> {
  return solicitarCore('roles/', { signal })
}

export function obtenerRolUsuario(id: number, signal?: AbortSignal): Promise<RolUsuario> {
  return solicitarCore(`usuarios/${id}/rol/`, { signal })
}

export function cambiarRol(id: number, rol: CodigoRol, motivo: string): Promise<RolUsuario> {
  return solicitarCore(`usuarios/${id}/rol/`, { metodo: 'PUT', cuerpo: { rol, motivo } })
}

export function listarAccesos(
  filtros: { usuario_id?: number; resultado?: ResultadoAcceso | ''; page?: number },
  signal?: AbortSignal,
): Promise<PaginaCore<Acceso>> {
  return solicitarCore('accesos/', { parametros: filtros, signal })
}

// --- Historial, adjuntos y repositorio (RF-T-008, RF-T-007 y RF-T-010) -----------------------------------

export function historialRegistro(
  entidad: EntidadRegistro,
  registroId: number,
  signal?: AbortSignal,
): Promise<EntradaHistorial[]> {
  return solicitarCore('historial/', { parametros: { entidad, registro_id: registroId }, signal })
}

export function listarAdjuntos(entidad: EntidadRegistro, registroId: number, signal?: AbortSignal): Promise<Adjunto[]> {
  return solicitarCore('adjuntos/', { parametros: { entidad, registro_id: registroId }, signal })
}

/**
 * Adjunta un archivo. `clave` es un UUID por subida: reintentar con la misma no duplica el adjunto
 * (la API responde el que ya existía).
 */
export function subirAdjunto(
  entidad: EntidadRegistro,
  registroId: number,
  archivo: File,
  clave: string,
  descripcion?: string,
): Promise<Adjunto> {
  const formulario = new FormData()
  formulario.set('entidad', entidad)
  formulario.set('registro_id', String(registroId))
  if (descripcion) formulario.set('descripcion', descripcion)
  formulario.set('archivo', archivo)
  return solicitarCore('adjuntos/', { metodo: 'POST', formulario, cabeceras: { 'Idempotency-Key': clave } })
}

export function descargarAdjunto(id: number): Promise<Blob> {
  return descargarCore(`adjuntos/${id}/contenido/`)
}

export function buscarEnRepositorio(
  tipo: TipoRepositorio,
  texto: string,
  page: number,
  signal?: AbortSignal,
): Promise<PaginaRepositorio> {
  return solicitarCore('repositorio/', { parametros: { tipo, q: texto, page }, signal })
}
