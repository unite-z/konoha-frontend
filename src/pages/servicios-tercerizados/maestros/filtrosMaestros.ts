/** Filtros en la URL de las listas de proveedores, contratos y atención especial. */
import type { ProveedorMaestro } from '@/types/maestrosTercerizados'

export type ClaveFiltroMaestros = 'pestana' | 'q' | 'estado' | 'vinculo' | 'vigencia' | 'plaga' | 'pagina'

export const FILTROS_MAESTROS_VACIOS: Record<ClaveFiltroMaestros, string> = {
  pestana: 'proveedores',
  q: '',
  estado: '',
  vinculo: '',
  vigencia: '',
  plaga: '',
  pagina: '',
}

export type FiltrosMaestros = Record<ClaveFiltroMaestros, string>

export type EstablecerFiltros = (cambios: Partial<Record<ClaveFiltroMaestros, string | null>>) => void

/** Número de página de la URL: entero positivo; cualquier otra cosa es la primera. */
export function paginaDe(texto: string): number {
  const numero = Number(texto)
  return Number.isInteger(numero) && numero > 1 ? numero : 1
}

/** Tamaño de página de la API. */
export const POR_PAGINA = 25

/** Estado que recibe una lista tras registrar algo (aviso de confirmación). */
export interface EstadoNavegacionMaestros {
  aviso: string
}

export function avisoDeNavegacion(estado: unknown): string | null {
  const aviso = (estado as { aviso?: unknown } | null)?.aviso
  return typeof aviso === 'string' ? aviso : null
}

/** Filtros de la lista a los que vuelve la ficha: solo una consulta (`?…`) o nada. */
export function volverALista(estado: unknown): string {
  const volverA = (estado as { volverA?: unknown } | null)?.volverA
  return typeof volverA === 'string' && (volverA === '' || volverA.startsWith('?')) ? volverA : ''
}

/** Estado con el que la ficha de un proveedor abre «Registrar contrato» ya con ese proveedor elegido. */
export interface EstadoContratoDeProveedor {
  proveedor: ProveedorMaestro
  /** Filtros de la lista a los que vuelve la ficha (`volverALista`); viajan al formulario y regresan con el aviso. */
  volverA: string
}

/**
 * Proveedor con el que se abrió «Registrar contrato» desde su ficha; `null` si se llegó de otro modo o si el
 * proveedor no está habilitado (el servidor rechazaría el contrato).
 */
export function proveedorDeOrigen(estado: unknown): ProveedorMaestro | null {
  const proveedor = (estado as { proveedor?: Partial<ProveedorMaestro> } | null)?.proveedor
  if (!proveedor || typeof proveedor.id !== 'number' || typeof proveedor.razon_social !== 'string') return null
  return proveedor.activo === true ? (proveedor as ProveedorMaestro) : null
}

/** Estado que lleva la ficha de un contrato para volver a la lista con sus filtros, y el aviso tras editarlo. */
export interface EstadoNavegacionContrato {
  volverA: string
  aviso?: string
}

/**
 * «Volver» de la ficha de un contrato: una consulta (`?…`) hacia la lista, una ruta completa (`/…`, como la
 * ficha del proveedor desde el que se llegó) o nada. A diferencia de `volverALista`, admite rutas completas.
 */
export function volverAContrato(estado: unknown): string {
  const volverA = (estado as { volverA?: unknown } | null)?.volverA
  return typeof volverA === 'string' && (volverA === '' || volverA.startsWith('?') || volverA.startsWith('/')) ? volverA : ''
}
