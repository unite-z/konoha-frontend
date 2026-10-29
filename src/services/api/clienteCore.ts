/**
 * Cliente de la API de MOD-01 (`/api/v1/core/`).
 *
 * - La sesión viaja en la cookie `HttpOnly` `av_sesion`: el navegador la envía y ningún script la lee.
 *   No se guarda ninguna credencial en `localStorage` ni `sessionStorage`.
 * - Escrituras: reenvía la cookie `XSRF-TOKEN` en la cabecera `X-XSRF-TOKEN` (protección CSRF).
 * - 401 avisa a la sesión (`alPerderSesion`) para volver al ingreso (CU-MOD01-006 2b).
 * Los errores se interpretan igual que en el resto de clientes (`ErrorApi`).
 */
import { ErrorApi, MENSAJE_SIN_CONEXION, esCancelacion, interpretarError } from './cliente'

export const API_CORE_URL: string = import.meta.env.VITE_API_CORE_URL || '/api/v1/core'

type ValorParametro = string | number | boolean | null | undefined

export interface OpcionesCore {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  parametros?: Record<string, ValorParametro>
  /** Cuerpo JSON. */
  cuerpo?: unknown
  /** Cuerpo multipart. Excluye `cuerpo`. */
  formulario?: FormData
  cabeceras?: Record<string, string>
  signal?: AbortSignal
}

let alPerder: (() => void) | null = null

/** Cuerpo completo de cada error, para los campos extra de MOD-01 (por ejemplo, `cuenta_id`). */
const cuerpos = new WeakMap<ErrorApi, Record<string, unknown>>()

/** Campos del cuerpo del error devuelto por la API (vacío si no hubo cuerpo). */
export function datosDeError(error: unknown): Record<string, unknown> {
  return error instanceof ErrorApi ? (cuerpos.get(error) ?? {}) : {}
}

function errorDe(estado: number, datos: unknown): ErrorApi {
  const error = interpretarError(estado, datos)
  if (datos && typeof datos === 'object') cuerpos.set(error, datos as Record<string, unknown>)
  return error
}

/** Registra a quién avisar cuando la API responde 401 (sesión caducada, cerrada o cuenta desactivada). */
export function alPerderSesion(funcion: (() => void) | null): void {
  alPerder = funcion
}

/** Valor de una cookie legible por scripts (solo `XSRF-TOKEN`; la de sesión es `HttpOnly`). */
export function leerCookie(nombre: string, cookies: string = typeof document === 'undefined' ? '' : document.cookie): string | null {
  for (const parte of cookies.split(';')) {
    const [clave, ...valor] = parte.trim().split('=')
    if (clave === nombre) return decodeURIComponent(valor.join('='))
  }
  return null
}

export function construirUrlCore(ruta: string, parametros?: Record<string, ValorParametro>): string {
  const consulta = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros ?? {})) {
    if (valor === null || valor === undefined || valor === '') continue
    consulta.set(clave, String(valor))
  }
  const texto = consulta.toString()
  return `${API_CORE_URL.replace(/\/+$/, '')}/${ruta.replace(/^\/+/, '')}${texto ? `?${texto}` : ''}`
}

async function enviar(ruta: string, opciones: OpcionesCore, acepta: string): Promise<Response> {
  const { metodo = 'GET', parametros, cuerpo, formulario, signal } = opciones
  const cabeceras = new Headers({ Accept: acepta, ...opciones.cabeceras })
  if (cuerpo !== undefined) cabeceras.set('Content-Type', 'application/json')
  if (metodo !== 'GET') {
    const token = leerCookie('XSRF-TOKEN')
    if (token) cabeceras.set('X-XSRF-TOKEN', token)
  }
  let respuesta: Response
  try {
    respuesta = await fetch(construirUrlCore(ruta, parametros), {
      method: metodo,
      headers: cabeceras,
      credentials: 'same-origin',
      body: formulario ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
      signal,
    })
  } catch (error) {
    if (esCancelacion(error)) throw error
    throw new ErrorApi(0, null, MENSAJE_SIN_CONEXION)
  }
  if (respuesta.status === 401 && !ruta.startsWith('auth/login')) alPerder?.()
  return respuesta
}

async function cuerpoJson(respuesta: Response): Promise<unknown> {
  const texto = await respuesta.text()
  if (!texto) return null
  try {
    return JSON.parse(texto)
  } catch {
    return null
  }
}

/** Petición JSON. Lanza `ErrorApi` si la respuesta no es 2xx. */
export async function solicitarCore<T>(ruta: string, opciones: OpcionesCore = {}): Promise<T> {
  const respuesta = await enviar(ruta, opciones, 'application/json')
  const datos = await cuerpoJson(respuesta)
  if (!respuesta.ok) throw errorDe(respuesta.status, datos)
  return datos as T
}

/** Descarga un archivo con la sesión y devuelve el blob (los enlaces directos no llevan la cabecera CSRF). */
export async function descargarCore(ruta: string, signal?: AbortSignal): Promise<Blob> {
  const respuesta = await enviar(ruta, { signal }, '*/*')
  if (!respuesta.ok) throw errorDe(respuesta.status, await cuerpoJson(respuesta))
  return respuesta.blob()
}
