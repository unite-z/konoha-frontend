import { ErrorApi, interpretarError, esCancelacion, MENSAJE_SIN_CONEXION } from './cliente'
import { avisarSesionPerdida, leerCookie } from './clienteCore'
import type { PaginaCampo } from '../../types/operacionCampo'

const BASE = '/api/v1/operacion-campo'
export type ParametrosCampo = Record<string, string | number | boolean | null | undefined>
export interface OpcionesCampo { metodo?: 'GET' | 'POST' | 'PUT'; cuerpo?: unknown; parametros?: ParametrosCampo; signal?: AbortSignal; claveIdempotencia?: string }
export function urlCampo(ruta: string, parametros: ParametrosCampo = {}): string {
  const query = new URLSearchParams()
  Object.entries(parametros).forEach(([k,v]) => { if(v !== null && v !== undefined && v !== '') query.set(k, String(v)) })
  return `${BASE}/${ruta.replace(/^\/+/, '')}${query.size ? `?${query}` : ''}`
}
export async function campoApi<T>(ruta: string, opciones: OpcionesCampo = {}): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' })
  if ((opciones.metodo ?? 'GET') !== 'GET') {
    const token = leerCookie('XSRF-TOKEN')
    if (token) headers.set('X-XSRF-TOKEN', token)
  }
  if(opciones.claveIdempotencia) headers.set('Idempotency-Key',opciones.claveIdempotencia)
  if(opciones.cuerpo !== undefined) headers.set('Content-Type','application/json')
  let response: Response
  try {
    response = await fetch(urlCampo(ruta, opciones.parametros), {
      method: opciones.metodo ?? 'GET', headers, signal: opciones.signal,
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo), credentials: 'same-origin', cache: 'no-store',
    })
  } catch(error) {
    if(esCancelacion(error)) throw error
    throw new ErrorApi(0,null,MENSAJE_SIN_CONEXION)
  }
  if (response.status === 401) avisarSesionPerdida()
  let datos: unknown
  try { datos = await response.json() } catch { throw interpretarError(response.status,null) }
  if(!response.ok) throw interpretarError(response.status,datos)
  return datos as T
}
/** Obtiene todos los registros mediante páginas propias de la API; nunca sigue URLs externas de next. */
export async function todosCampo<T>(ruta: string, parametros: ParametrosCampo = {}, signal?: AbortSignal): Promise<T[]> {
  const resultados: T[] = []
  for(let page=1;page<=1000;page++) {
    const datos = await campoApi<PaginaCampo<T>>(ruta,{parametros:{...parametros,page},signal})
    resultados.push(...datos.results)
    if(!datos.next) return resultados
  }
  throw new ErrorApi(0,null,'Hay demasiados registros para cargar el selector. Contacta al administrador')
}
