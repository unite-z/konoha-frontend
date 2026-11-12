/**
 * Cliente de la API de MOD-01 (`/api/v1/core/`).
 *
 * - La sesión viaja en la cookie `HttpOnly` `av_sesion`: el navegador la envía y ningún script la lee.
 *   No se guarda ninguna credencial en `localStorage` ni `sessionStorage`.
 * - Escrituras: reenvía la cookie `XSRF-TOKEN` en la cabecera `X-XSRF-TOKEN` (protección CSRF).
 * - 401 avisa a la sesión (`alPerderSesion`) para volver al ingreso (CU-MOD01-006 2b).
 * Es un envoltorio del cliente único (`cliente.ts`): los errores se interpretan igual en todos (`ErrorApi`).
 */
import { construirUrlHttp, descargarHttp, solicitarHttp, type OpcionesHttp, type ValorParametro } from './cliente'

export { alPerderSesion, avisarSesionPerdida, datosDeError, leerCookie } from './cliente'

export const API_CORE_URL: string = import.meta.env.VITE_API_CORE_URL || '/api/v1/core'

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

export function construirUrlCore(ruta: string, parametros?: Record<string, ValorParametro>): string {
  return construirUrlHttp(ruta, parametros, API_CORE_URL)
}

/** Opciones propias de MOD-01: su base y un 401 del ingreso no cierra la sesión. */
function opcionesHttp(ruta: string, opciones: OpcionesCore): OpcionesHttp {
  return { ...opciones, base: API_CORE_URL, avisarSesion: !ruta.startsWith('auth/login') }
}

/** Petición JSON a MOD-01. Lanza `ErrorApi` si la respuesta no es 2xx. Envoltorio del cliente único. */
export function solicitarCore<T>(ruta: string, opciones: OpcionesCore = {}): Promise<T> {
  return solicitarHttp<T>(ruta, opcionesHttp(ruta, opciones))
}

/** Descarga un archivo con la sesión y devuelve el blob (los enlaces directos no llevan la cabecera CSRF). */
export async function descargarCore(ruta: string, signal?: AbortSignal): Promise<Blob> {
  return (await descargarHttp(ruta, opcionesHttp(ruta, { signal }))).blob
}
