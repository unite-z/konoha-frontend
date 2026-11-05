/**
 * Servicios de proveedores, contratos y atención especial de MOD-05 (RF-SER-001, RF-SER-002 y RF-INV-011).
 * Separados de `tercerizados.ts` para no tocar las llamadas de la bandeja de atenciones.
 * Las páginas no llaman a `fetch`: usan estas funciones.
 */
import type {
  AplicacionAdicionalEntrada,
  AtencionEspecial,
  AtencionEspecialDetalle,
  AtencionEspecialEntrada,
  CancelarAtencionEspecialEntrada,
  ContratoEntrada,
  ContratoMaestro,
  EstadoAtencionEspecial,
  ObservacionPlaga,
  ObservacionPlagaEntrada,
  Plaga,
  PlanFitosanitarioEntrada,
  ProductoAgronomico,
  ProductoAgronomicoEntrada,
  ProveedorEntrada,
  ProveedorMaestro,
  TipoVinculo,
} from '@/types/maestrosTercerizados'
import type { Atencion, Paginado } from '@/types/tercerizados'
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

export function obtenerProveedor(id: number, signal?: AbortSignal) {
  return solicitarTercerizados<ProveedorMaestro>(`proveedores/${id}/`, { signal })
}

/** Edición completa (RUC, razón social, contacto y vínculo). Solo el jefe de sección. */
export function editarProveedor(id: number, entrada: ProveedorEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<ProveedorMaestro>(`proveedores/${id}/`, { metodo: 'PUT', cuerpo: entrada, signal })
}

/** Habilitar es inmediato; inhabilitar impide contratos y atenciones nuevos (lo registrado se conserva). */
export function cambiarEstadoProveedor(id: number, activo: boolean, signal?: AbortSignal) {
  return solicitarTercerizados<ProveedorMaestro>(`proveedores/${id}/estado/`, { metodo: 'PATCH', cuerpo: { activo }, signal })
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

export function obtenerContrato(id: number, signal?: AbortSignal) {
  return solicitarTercerizados<ContratoMaestro>(`contratos/${id}/`, { signal })
}

/** Edición completa del contrato (proveedor, servicio, costo, frecuencia, vigencia y condiciones). Solo el jefe de sección. */
export function editarContrato(id: number, entrada: ContratoEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<ContratoMaestro>(`contratos/${id}/`, { metodo: 'PUT', cuerpo: entrada, signal })
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

/** Ficha del ejemplar marcado, con el historial de sus aplicaciones adicionales (RF-FIT-006). */
export function obtenerAtencionEspecial(id: number, signal?: AbortSignal) {
  return solicitarTercerizados<AtencionEspecialDetalle>(`atenciones-especiales/${id}/`, { signal })
}

/** Cancela el seguimiento (error al marcar, o el riesgo ya no corresponde). No se borra: queda como histórico. */
export function cancelarAtencionEspecial(id: number, entrada: CancelarAtencionEspecialEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<AtencionEspecialDetalle>(`atenciones-especiales/${id}/cancelar/`, {
    metodo: 'POST',
    cuerpo: entrada,
    signal,
  })
}

export function listarPlagas(consulta: { q?: string; activo?: boolean; page?: number } = {}, signal?: AbortSignal) {
  return solicitarTercerizados<Paginado<Plaga>>('plagas/', { parametros: { ...consulta }, signal })
}

// --- Aplicaciones adicionales (RF-FIT-006) --------------------------------------------------------------

/**
 * Programa una aplicación adicional del ejemplar marcado. RN-010: no se admite más allá de las aplicaciones
 * adicionales fijadas al marcarlo (400 si ya se programaron todas). No es idempotente: un reintento tras
 * perder la conexión puede duplicarla.
 */
export function programarAplicacionAdicional(especialId: number, entrada: AplicacionAdicionalEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<AtencionEspecialDetalle>(`atenciones-especiales/${especialId}/aplicaciones/`, {
    metodo: 'POST',
    cuerpo: entrada,
    signal,
  })
}

// --- Plan fitosanitario estacional (RF-FIT-001) ---------------------------------------------------------

/** No es idempotente: un reintento puede duplicar las atenciones del plan. */
export function programarPlanFitosanitario(entrada: PlanFitosanitarioEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<Atencion[]>('plan-fitosanitario/', { metodo: 'POST', cuerpo: entrada, signal })
}

// --- Catálogo de productos agronómicos (RF-FIT-003) -----------------------------------------------------

export interface FiltrosProductosAgronomicos {
  q?: string
  activo?: boolean
}

export function listarProductosAgronomicos(filtros: FiltrosProductosAgronomicos = {}, pagina = 1, signal?: AbortSignal) {
  return solicitarTercerizados<Paginado<ProductoAgronomico>>('productos-agronomicos/', {
    parametros: { ...filtros, page: pagina > 1 ? pagina : undefined },
    signal,
  })
}

/** No es idempotente: un reintento tras perder la conexión puede dar «ya registrado» (409 `ProductoExistente`). */
export function registrarProductoAgronomico(entrada: ProductoAgronomicoEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<ProductoAgronomico>('productos-agronomicos/', { metodo: 'POST', cuerpo: entrada, signal })
}

export function obtenerProductoAgronomico(id: number, signal?: AbortSignal) {
  return solicitarTercerizados<ProductoAgronomico>(`productos-agronomicos/${id}/`, { signal })
}

export function editarProductoAgronomico(id: number, entrada: ProductoAgronomicoEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<ProductoAgronomico>(`productos-agronomicos/${id}/`, { metodo: 'PUT', cuerpo: entrada, signal })
}

/** Habilitar es inmediato; inhabilitar impide aplicarlo en atenciones nuevas (lo registrado se conserva). */
export function cambiarEstadoProductoAgronomico(id: number, activo: boolean, signal?: AbortSignal) {
  return solicitarTercerizados<ProductoAgronomico>(`productos-agronomicos/${id}/estado/`, { metodo: 'PATCH', cuerpo: { activo }, signal })
}

// --- Observaciones de plagas (RF-FIT-005) ---------------------------------------------------------------

export interface FiltrosObservacionesPlagas {
  q?: string
  area_verde_id?: number
  ejemplar_id?: number
  plaga_id?: number
}

export function listarObservacionesPlagas(filtros: FiltrosObservacionesPlagas = {}, pagina = 1, signal?: AbortSignal) {
  return solicitarTercerizados<Paginado<ObservacionPlaga>>('observaciones-plagas/', {
    parametros: { ...filtros, page: pagina > 1 ? pagina : undefined },
    signal,
  })
}

export function registrarObservacionPlaga(entrada: ObservacionPlagaEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<ObservacionPlaga>('observaciones-plagas/', { metodo: 'POST', cuerpo: entrada, signal })
}

export function obtenerObservacionPlaga(id: number, signal?: AbortSignal) {
  return solicitarTercerizados<ObservacionPlaga>(`observaciones-plagas/${id}/`, { signal })
}

/**
 * Observaciones ya registradas para los espacios o ejemplares indicados, sin paginar (aviso del asistente
 * de «Nueva atención» al elegir alcances). Vacío si no se indica ningún id.
 */
export function listarObservacionesPorAlcance(areaVerdeIds: number[], ejemplarIds: number[], signal?: AbortSignal) {
  if (areaVerdeIds.length === 0 && ejemplarIds.length === 0) return Promise.resolve<ObservacionPlaga[]>([])
  return solicitarTercerizados<ObservacionPlaga[]>('observaciones-plagas/por-alcance/', {
    parametros: {
      area_verde_id: areaVerdeIds.length > 0 ? areaVerdeIds.join(',') : undefined,
      ejemplar_id: ejemplarIds.length > 0 ? ejemplarIds.join(',') : undefined,
    },
    signal,
  })
}
