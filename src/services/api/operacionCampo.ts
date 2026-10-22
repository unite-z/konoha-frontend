import { ErrorApi, interpretarError, esCancelacion, MENSAJE_SIN_CONEXION } from './cliente'
import type { PaginaCampo } from '../../types/operacionCampo'

export const CLAVE_SESION_CAMPO = 'areas-verdes.mod04.autorizacion'
const BASE = '/api/v1/operacion-campo'
export type ParametrosCampo = Record<string, string | number | boolean | null | undefined>
export interface OpcionesCampo { metodo?: 'GET' | 'POST' | 'PUT'; cuerpo?: unknown; parametros?: ParametrosCampo; signal?: AbortSignal; autorizacion?: string; claveIdempotencia?: string }

export function autorizacionCampo(): string | null {
  try { return sessionStorage.getItem(CLAVE_SESION_CAMPO) } catch { return null }
}
export function guardarSesionCampo(valor: string | null) {
  // Si el navegador bloquea el almacenamiento, se informa en vez de simular un ingreso exitoso.
  if (valor === null) sessionStorage.removeItem(CLAVE_SESION_CAMPO)
  else sessionStorage.setItem(CLAVE_SESION_CAMPO, valor)
}
export function urlCampo(ruta: string, parametros: ParametrosCampo = {}): string {
  const query = new URLSearchParams()
  Object.entries(parametros).forEach(([k,v]) => { if(v !== null && v !== undefined && v !== '') query.set(k, String(v)) })
  return `${BASE}/${ruta.replace(/^\/+/, '')}${query.size ? `?${query}` : ''}`
}
export async function campoApi<T>(ruta: string, opciones: OpcionesCampo = {}): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' })
  const auth = opciones.autorizacion ?? autorizacionCampo()
  if(auth) headers.set('Authorization',auth)
  if(opciones.claveIdempotencia) headers.set('Idempotency-Key',opciones.claveIdempotencia)
  if(opciones.cuerpo !== undefined) headers.set('Content-Type','application/json')
  let response: Response
  try {
    response = await fetch(urlCampo(ruta, opciones.parametros), {
      method: opciones.metodo ?? 'GET', headers, signal: opciones.signal,
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo), credentials: 'omit', cache: 'no-store',
    })
  } catch(error) {
    if(esCancelacion(error)) throw error
    throw new ErrorApi(0,null,MENSAJE_SIN_CONEXION)
  }
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
