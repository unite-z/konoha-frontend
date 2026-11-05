import { solicitarTercerizados } from './clienteTercerizados'
import type { CambioCampana, CampanaPoda, EjemplarCampana, EstadoCampana, NuevaCampana, PaginaApi, VentanaCierre } from '@/types/campanasPoda'

const BASE = '/api/v1/inventario'
const RUTA = 'campanas-poda/'

export function listarCampanas(filtros: { anio?: number; estado?: EstadoCampana; page?: number } = {}, signal?: AbortSignal): Promise<PaginaApi<CampanaPoda>> {
  return solicitarTercerizados(RUTA, { parametros: filtros, signal, base: BASE })
}
export function obtenerCampana(id: number, signal?: AbortSignal): Promise<CampanaPoda> {
  return solicitarTercerizados(`${RUTA}${id}/`, { signal, base: BASE })
}
export function crearCampana(entrada: NuevaCampana): Promise<CampanaPoda> {
  return solicitarTercerizados(RUTA, { metodo: 'POST', cuerpo: entrada, base: BASE })
}
export function cambiarCampana(id: number, cambio: CambioCampana): Promise<CampanaPoda> {
  return solicitarTercerizados(`${RUTA}${id}/`, { metodo: 'PATCH', cuerpo: cambio, base: BASE })
}
export function retirarCampana(id: number): Promise<void> {
  return solicitarTercerizados(`${RUTA}${id}/`, { metodo: 'DELETE', base: BASE })
}
export function listarEjemplaresCampana(id: number, filtros: { q?: string; page?: number } = {}, signal?: AbortSignal): Promise<PaginaApi<EjemplarCampana>> {
  return solicitarTercerizados(`${RUTA}${id}/ejemplares/`, { parametros: filtros, signal, base: BASE })
}
/** Toda la lista de la campaña, para editarla. El servidor pagina de 25 en 25. */
export async function listarTodosEjemplaresCampana(id: number, signal?: AbortSignal): Promise<EjemplarCampana[]> {
  const todos: EjemplarCampana[] = []
  let pagina = 1
  let hayMas = true
  while (hayMas) {
    const respuesta = await listarEjemplaresCampana(id, { page: pagina }, signal)
    todos.push(...respuesta.results)
    hayMas = respuesta.next !== null
    pagina += 1
  }
  return todos
}
export function consultarVentanaCierre(anio: number, signal?: AbortSignal): Promise<VentanaCierre> {
  return solicitarTercerizados(`${RUTA}ventana-cierre/`, { parametros: { anio }, signal, base: BASE })
}
export function planificarCampana(id: number): Promise<CampanaPoda> {
  return solicitarTercerizados(`${RUTA}${id}/planificacion/`, { metodo: 'POST', base: BASE })
}
export function iniciarCampana(id: number): Promise<CampanaPoda> {
  return solicitarTercerizados(`${RUTA}${id}/inicio/`, { metodo: 'POST', base: BASE })
}
export function finalizarCampana(id: number): Promise<CampanaPoda> {
  return solicitarTercerizados(`${RUTA}${id}/fin/`, { metodo: 'POST', base: BASE })
}
