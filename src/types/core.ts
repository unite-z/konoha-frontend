/**
 * Tipos del contrato de MOD-01 (`/api/v1/core/`). Reflejan `konoha-backend/docs/modulos/mod01.md`.
 * Las claves van en snake_case, como las envía la API (ADR 0005).
 */
import type { FechaIso, InstanteIso } from './comun'

/** Códigos estables de rol (`core_rol.codigo`). El operario está previsto pero inactivo (RS-004). */
export type CodigoRol = 'jefe-seccion' | 'ingeniero-campo' | 'practicante' | 'capataz' | 'operario'

export type CanalSesion = 'oficina' | 'campo'

/** `GET auth/sesion/` y respuesta de `POST auth/login/`. */
export interface SesionCore {
  usuario: { id: number; nombre: string; nombre_usuario: string }
  rol: { codigo: CodigoRol; nombre: string }
  /** Códigos `MODULO.RECURSO.ACCION` concedidos al rol: la interfaz arma el menú con ellos. */
  permisos: string[]
  debe_cambiar_contrasena: boolean
  expira: InstanteIso | null
}

export interface Credenciales {
  identificador: string
  contrasena: string
  canal?: CanalSesion
  mantener_sesion?: boolean
}

export interface CambioContrasena {
  contrasena_actual: string
  contrasena_nueva: string
  confirmacion: string
}

/** Página de la API: 25 elementos con enlaces a la anterior y la siguiente. */
export interface PaginaCore<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type EstadoCuenta = 'activa' | 'inactiva' | 'bloqueada'

/** Destacados de CU-MOD01-007: sin acceso en N días, vigencia que vence pronto, varios rechazos. */
export type Destacado = 'sin-uso' | 'vence-pronto' | 'rechazos'

export interface UsuarioResumen {
  id: number
  correo: string | null
  nombre: string
  telefono: string | null
  rol: CodigoRol
  rol_nombre: string
  estado: EstadoCuenta
  fecha_fin_vigencia: FechaIso | null
  ultimo_acceso: InstanteIso | null
  debe_cambiar_contrasena: boolean
  destacados: Destacado[]
}

export interface NuevoUsuario {
  correo: string
  nombre: string
  telefono: string | null
  rol: CodigoRol
  fecha_fin_vigencia: FechaIso | null
}

export interface CambioDatosUsuario {
  nombre: string
  telefono: string | null
  /** `null` quita la vigencia. */
  fecha_fin_vigencia: FechaIso | null
}

/** Alta, reactivación o contraseña temporal: la contraseña solo viaja en esta respuesta. */
export interface UsuarioConContrasena {
  usuario: UsuarioResumen
  contrasena_temporal: string
  avisos: string[]
}

export interface RolConPermisos {
  codigo: CodigoRol
  nombre: string
  descripcion: string
  activo: boolean
  permisos: string[]
}

export interface CambioRol {
  rol_anterior: CodigoRol
  rol_nuevo: CodigoRol
  motivo: string
  autor: string
  fecha_hora: InstanteIso
}

export interface RolUsuario {
  usuario_id: number
  rol: RolConPermisos
  historial: CambioRol[]
}

export type AccionAuditoria = 'Alta' | 'Modificacion' | 'CambioEstado' | 'CambioRol' | 'BajaLogica'

/** Fila del historial de una cuenta (`GET usuarios/{id}/historial/`). */
export interface CambioCuenta {
  id: number
  entidad: string
  registro_id: number
  accion: AccionAuditoria
  usuario_id: number
  usuario_nombre: string
  fecha_hora: InstanteIso
  valores_anteriores: Record<string, unknown>
  valores_nuevos: Record<string, unknown>
  motivo: string | null
}

export type ResultadoAcceso = 'Exitoso' | 'Fallido' | 'Bloqueado' | 'Denegado' | 'SinPermiso' | 'CierreSesion'

export interface Acceso {
  id: number
  usuario_id: number | null
  usuario_nombre: string | null
  identificador: string | null
  fecha_hora: InstanteIso
  canal: 'oficina' | 'campo' | 'api'
  resultado: ResultadoAcceso
  motivo: string | null
  ruta: string | null
}

/** Entidades con historial y adjuntos (RF-T-007 y RF-T-008). */
export type EntidadRegistro = 'actividad' | 'atencion' | 'incidencia' | 'ejemplar'

/** Entrada de `GET historial/`. La acción de MOD-05 puede traer otros textos. */
export interface EntradaHistorial {
  accion: string
  usuario: string
  fecha_hora: InstanteIso
  valores_anteriores: Record<string, unknown>
  valores_nuevos: Record<string, unknown>
  motivo: string | null
}

export interface Adjunto {
  id: number
  uuid_cliente: string
  entidad: EntidadRegistro
  registro_id: number
  nombre: string
  tipo_mime: string
  tamano_bytes: number
  descripcion: string | null
  usuario: string
  fecha_creacion: InstanteIso
}

export type TipoRepositorio = 'jardin' | 'especie' | 'sector' | 'servicio'

export interface ElementoRepositorio {
  id: number
  tipo: TipoRepositorio
  nombre: string
  detalle: string | null
  modulo: string
}

/** `disponible: false` si el módulo dueño aún no publicó su tabla. */
export interface PaginaRepositorio extends PaginaCore<ElementoRepositorio> {
  disponible: boolean
}
