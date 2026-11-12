import { solicitarTercerizados } from './clienteTercerizados'
import type { NuevoRetiroRutaCorte, ReincorporacionRutaCorte, RetiroRutaCorte, RutaCorte } from '@/types/rutaCorte'

/** Ruta de jardines del corte de césped (AV-129, RF-INV-004). */
const BASE = '/api/v1/inventario'

export function obtenerRutaCorte(fecha: string, signal?: AbortSignal): Promise<RutaCorte> {
  return solicitarTercerizados('ruta-corte/', { parametros: { fecha }, signal, base: BASE })
}
export function listarRetirosRutaCorte(signal?: AbortSignal): Promise<RetiroRutaCorte[]> {
  return solicitarTercerizados('ruta-corte/retiros/', { signal, base: BASE })
}
export function retirarJardinRutaCorte(entrada: NuevoRetiroRutaCorte): Promise<RetiroRutaCorte> {
  return solicitarTercerizados('ruta-corte/retiros/', { metodo: 'POST', cuerpo: entrada, base: BASE })
}
export function reincorporarJardinRutaCorte(
  retiroId: number,
  entrada: ReincorporacionRutaCorte,
): Promise<RetiroRutaCorte> {
  return solicitarTercerizados(`ruta-corte/retiros/${retiroId}/reincorporar/`, {
    metodo: 'POST',
    cuerpo: entrada,
    base: BASE,
  })
}
