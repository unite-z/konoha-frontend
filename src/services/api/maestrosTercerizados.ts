/**
 * Servicios de proveedores, contratos y atención especial de MOD-05 (RF-SER-001, RF-SER-002 y RF-INV-011).
 * Separados de `tercerizados.ts` para no tocar las llamadas de la bandeja de atenciones.
 * Las páginas no llaman a `fetch`: usan estas funciones.
 */
import type {
  AtencionEspecial,
  AtencionEspecialEntrada,
  ContratoEntrada,
  ContratoMaestro,
  EstadoAtencionEspecial,
  Plaga,
  ProveedorEntrada,
  ProveedorMaestro,
  TipoVinculo,
} from '../../types/maestrosTercerizados'
import type { Paginado } from '../../types/tercerizados'
import { solicitarTercerizados } from './clienteTercerizados'

// --- Proveedores (RF-SER-001) ---------------------------------------------------------------------------

export interface FiltrosProveedores {
  q?: string
  activo?: boolean
  tipo_vinculo?: TipoVinculo
}

export function listarProveedoresMaestro(filtros: FiltrosProveedores = {}, pagina = 1, signal?: AbortSignal) {
  return solicitarTercerizados<Paginado<ProveedorMaestro>>('proveedores/', {
    parametros: { ...filtros, page: pagina > 1 ? pagina : undefined },
    signal,
  })
}

/** No es idempotente: un reintento tras perder la conexión puede dar «ya registrado» (409 `ProveedorExistente`). */
export function registrarProveedor(entrada: ProveedorEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<ProveedorMaestro>('proveedores/', { metodo: 'POST', cuerpo: entrada, signal })
}

// --- Contratos (RF-SER-002) -----------------------------------------------------------------------------

export interface FiltrosContratos {
  q?: string
  vigente?: boolean
  proveedor_id?: number
  tipo_servicio_id?: number
}

export function listarContratosMaestro(filtros: FiltrosContratos = {}, pagina = 1, signal?: AbortSignal) {
  return solicitarTercerizados<Paginado<ContratoMaestro>>('contratos/', {
    parametros: { ...filtros, page: pagina > 1 ? pagina : undefined },
    signal,
  })
}

/** No es idempotente: un reintento crea otro contrato con otro número. */
export function registrarContrato(entrada: ContratoEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<ContratoMaestro>('contratos/', { metodo: 'POST', cuerpo: entrada, signal })
}

// --- Atención especial (RF-INV-011) ---------------------------------------------------------------------

export interface FiltrosAtencionEspecial {
  q?: string
  plaga_id?: number
  estado?: EstadoAtencionEspecial
}

export function listarAtencionesEspeciales(filtros: FiltrosAtencionEspecial = {}, pagina = 1, signal?: AbortSignal) {
  return solicitarTercerizados<Paginado<AtencionEspecial>>('atenciones-especiales/', {
    parametros: { ...filtros, page: pagina > 1 ? pagina : undefined },
    signal,
  })
}

/** Un ejemplar se marca una sola vez (409 si ya lo está). */
export function marcarAtencionEspecial(entrada: AtencionEspecialEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<AtencionEspecial>('atenciones-especiales/', { metodo: 'POST', cuerpo: entrada, signal })
}

export function listarPlagas(consulta: { q?: string; activo?: boolean; page?: number } = {}, signal?: AbortSignal) {
  return solicitarTercerizados<Paginado<Plaga>>('plagas/', { parametros: { ...consulta }, signal })
}
