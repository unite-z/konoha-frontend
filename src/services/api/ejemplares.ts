import { solicitarTercerizados } from './clienteTercerizados'
import type { EjemplarInventario, EspecieVegetal, SituacionEjemplar } from '@/types/ejemplares'
import type { FechaIso, InstanteIso } from '@/types/comun'

const BASE = '/api/v1/inventario'
export const EJEMPLARES_POR_PAGINA = 25

export function listarEjemplares(q = '', page = 1, signal?: AbortSignal, areaVerdeId?: number): Promise<EjemplarInventario[]> {
  return solicitarTercerizados('ejemplares', { parametros: { q, page, area_verde_id: areaVerdeId }, signal, base: BASE })
}

export async function listarEjemplaresDeArea(areaVerdeId: number, signal?: AbortSignal): Promise<EjemplarInventario[]> {
  // El listado de ejemplares usa páginas de 25 y devuelve un array sin metadatos.
  const ejemplares: EjemplarInventario[] = []
  for (let pagina = 1; ; pagina++) {
    const lote = await listarEjemplares('', pagina, signal, areaVerdeId)
    ejemplares.push(...lote)
    if (lote.length < EJEMPLARES_POR_PAGINA) return ejemplares
  }
}

export function crearEjemplar(entrada: {
  codigo_placa_antigua?: string | null; especie_id?: number | null; tipo_vegetacion?: string | null
  ubicacion?: string | null; latitud?: string | null; longitud?: string | null; cantidad?: number
  altura_total_m?: number | null
  area_verde_id?: number | null
}): Promise<EjemplarInventario> {
  return solicitarTercerizados('ejemplares', { metodo: 'POST', cuerpo: entrada, base: BASE })
}

export function vincularEjemplarConArea(id: number, areaVerdeId: number): Promise<EjemplarInventario> {
  return solicitarTercerizados(`ejemplares/${id}`, { metodo: 'PATCH', cuerpo: { area_verde_id: areaVerdeId }, base: BASE })
}

export function guardarAlturaEjemplar(id: number, altura: number): Promise<EjemplarInventario> {
  return solicitarTercerizados(`ejemplares/${id}`, { metodo: 'PATCH', cuerpo: { altura_total_m: altura }, base: BASE })
}

export type FuenteHistorialEjemplar = 'podas' | 'fitosanitario' | 'incidencias'

interface CambioSituacionEjemplar {
  situacion: SituacionEjemplar
  fecha: FechaIso
  motivo: string
  ubicacion?: string
  latitud?: string
  longitud?: string
  area_verde_id?: number
}

interface SituacionRegistrada {
  id: number
  situacion_anterior: SituacionEjemplar
  situacion_nueva: SituacionEjemplar
  fecha: FechaIso
  motivo: string
  autor: string
  ubicacion_anterior: string | null
  ubicacion_nueva: string | null
  latitud_anterior: number | null
  longitud_anterior: number | null
  latitud_nueva: number | null
  longitud_nueva: number | null
  area_anterior_id: number | null
  area_nueva_id: number | null
}

export function cambiarSituacionEjemplar(id: number, cambio: CambioSituacionEjemplar) {
  return solicitarTercerizados<EjemplarInventario>(`ejemplares/${id}/situacion`, {
    metodo: 'PATCH', cuerpo: cambio, base: BASE,
  })
}

export function listarHistorialSituacionEjemplar(id: number, signal?: AbortSignal) {
  return solicitarTercerizados<SituacionRegistrada[]>(`ejemplares/${id}/historial-situacion`, { signal, base: BASE })
}

interface EventoHistorialEjemplar {
  id: number
  fecha: FechaIso
  momento?: InstanteIso
  tipo: string
  origen: string
  ejecutor?: string | null
  detalle?: string | null
  evidencia_id?: number | null
  documento_id?: number | null
  reporte_id?: number | null
}

export function listarHistorialEjemplar(id: number, fuente: FuenteHistorialEjemplar, signal?: AbortSignal) {
  return solicitarTercerizados<EventoHistorialEjemplar[]>(`ejemplares/${id}/historial-intervenciones`, {
    parametros: { fuente }, signal, base: BASE,
  })
}
export function quitarPlacaAntigua(id: number): Promise<EjemplarInventario> {
  return solicitarTercerizados(`ejemplares/${id}/placa-antigua`, { metodo: 'DELETE', base: BASE })
}
export function listarEspecies(incluirInactivas = false, signal?: AbortSignal): Promise<EspecieVegetal[]> {
  return solicitarTercerizados('especies', { parametros: { incluir_inactivas: incluirInactivas }, signal, base: BASE })
}
export function crearEspecie(entrada: {
  nombre_comun: string; nombre_cientifico: string; forma_biologica: string
}): Promise<EspecieVegetal> {
  return solicitarTercerizados('especies', { metodo: 'POST', cuerpo: entrada, base: BASE })
}
export function cambiarEspecie(id: number, cambio: { activo?: boolean }): Promise<EspecieVegetal> {
  return solicitarTercerizados(`especies/${id}`, { metodo: 'PATCH', cuerpo: cambio, base: BASE })
}
