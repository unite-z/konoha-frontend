/**
 * Cliente de la API de MOD-05 (`/api/tercerizados/`).
 *
 * Diferencias con `cliente.ts` (MOD-06), que no cambia:
 * - Sesión de MOD-01 (AV-234): la cookie `HttpOnly` viaja sola y las escrituras llevan el token CSRF.
 *   La interfaz no guarda ninguna credencial. Un 401 avisa a la sesión de MOD-01 para volver al ingreso.
 * - Métodos GET, POST y PATCH; cuerpo JSON o `FormData` (multipart, el navegador pone el `boundary`).
 * - Descarga de archivos autenticada (blob).
 * Los errores se interpretan igual que en MOD-06 (`ErrorApi`), así las páginas los tratan del mismo modo.
 */
import { ErrorApi, MENSAJE_SIN_CONEXION, esCancelacion, interpretarError } from './cliente'
import { avisarSesionPerdida, leerCookie } from './clienteCore'

export const API_TERCERIZADOS_URL: string = import.meta.env.VITE_API_TERCERIZADOS_URL || '/api/tercerizados'

type ValorParametro = string | number | boolean | null | undefined

export interface OpcionesTercerizados {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  /** Parámetros de consulta; se omiten los vacíos (`null`, `undefined` o cadena vacía). */
  parametros?: Record<string, ValorParametro>
  /** Cuerpo JSON. */
  cuerpo?: unknown
  /** Cuerpo multipart. Excluye `cuerpo`. */
  formulario?: FormData
  signal?: AbortSignal
  /** Base de la API si no es la de MOD-05 (MOD-03 usa el mismo transporte). */
  base?: string
}

/** Espera antes de liberar el blob de una descarga. */
const REVOCAR_DESCARGA_MS = 60_000

/** URL absoluta de la ruta (relativa a la base de MOD-05), con los parámetros no vacíos. */
export function construirUrlTercerizados(
  ruta: string,
  parametros?: Record<string, ValorParametro>,
  baseApi: string = API_TERCERIZADOS_URL,
): string {
  const consulta = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros ?? {})) {
    if (valor === null || valor === undefined || valor === '') continue
    consulta.set(clave, String(valor))
  }
  const texto = consulta.toString()
  const base = baseApi.replace(/\/+$/, '')
  return `${base}/${ruta.replace(/^\/+/, '')}${texto ? `?${texto}` : ''}`
}

function cabeceras(opciones: OpcionesTercerizados, acepta: string): Headers {
  const resultado = new Headers({ Accept: acepta })
  if ((opciones.metodo ?? 'GET') !== 'GET') {
    const token = leerCookie('XSRF-TOKEN')
    if (token) resultado.set('X-XSRF-TOKEN', token)
  }
  if (opciones.cuerpo !== undefined) resultado.set('Content-Type', 'application/json')
  return resultado
}

async function enviar(ruta: string, opciones: OpcionesTercerizados, acepta: string): Promise<Response> {
  const { metodo = 'GET', parametros, cuerpo, formulario, signal, base } = opciones
  let respuesta: Response
  try {
    respuesta = await fetch(construirUrlTercerizados(ruta, parametros, base), {
      method: metodo,
      headers: cabeceras(opciones, acepta),
      body: formulario ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
      signal,
      // Solo la cookie de sesión de este mismo origen; nunca reutilizar respuestas privadas.
      credentials: 'same-origin',
      cache: 'no-store',
    })
  } catch (error) {
    if (esCancelacion(error)) throw error
    throw new ErrorApi(0, null, MENSAJE_SIN_CONEXION)
  }
  if (respuesta.status === 401) avisarSesionPerdida()
  return respuesta
}

async function errorDe(respuesta: Response): Promise<ErrorApi> {
  let datos: unknown = null
  try {
    const texto = await respuesta.text()
    datos = texto ? JSON.parse(texto) : null
  } catch {
    datos = null
  }
  return interpretarError(respuesta.status, datos)
}

/**
 * Petición a la API de MOD-05 que devuelve JSON tipado.
 * Lanza `ErrorApi` (estado 0 sin conexión) o `DOMException` AbortError si se cancela.
 */
export async function solicitarTercerizados<T>(ruta: string, opciones: OpcionesTercerizados = {}): Promise<T> {
  const respuesta = await enviar(ruta, opciones, 'application/json')
  if (!respuesta.ok) throw await errorDe(respuesta)
  const texto = await respuesta.text()
  if (!texto) return null as T
  try {
    return JSON.parse(texto) as T
  } catch {
    throw interpretarError(respuesta.status, null)
  }
}

/** Nombre del archivo de `Content-Disposition` (RFC 6266, con `filename*` UTF-8 si existe). */
export function nombreDeDisposicion(cabecera: string | null): string | null {
  if (!cabecera) return null
  const extendido = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(cabecera)
  if (extendido) {
    try {
      return decodeURIComponent(extendido[1].trim())
    } catch {
      /* se intenta con el nombre simple */
    }
  }
  const simple = /filename\s*=\s*"([^"]*)"|filename\s*=\s*([^;]+)/i.exec(cabecera)
  const nombre = simple?.[1] ?? simple?.[2]
  return nombre ? nombre.trim() : null
}

/**
 * Descarga un archivo protegido y lo entrega al navegador para guardarlo.
 * `nombre` se usa si la respuesta no trae `Content-Disposition`.
 */
export async function descargarArchivoTercerizados(ruta: string, nombre: string, signal?: AbortSignal): Promise<void> {
  const respuesta = await enviar(ruta, { signal }, '*/*')
  if (!respuesta.ok) throw await errorDe(respuesta)
  let blob: Blob
  try {
    blob = await respuesta.blob()
  } catch (error) {
    if (esCancelacion(error)) throw error
    throw new ErrorApi(0, null, MENSAJE_SIN_CONEXION)
  }
  const url = URL.createObjectURL(blob)
  try {
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombreDeDisposicion(respuesta.headers.get('Content-Disposition')) ?? nombre
    enlace.rel = 'noopener'
    document.body.append(enlace)
    enlace.click()
    enlace.remove()
  } finally {
    // Se libera cuando el navegador ya tomó el archivo (revocarlo de inmediato puede cancelar la descarga).
    window.setTimeout(() => URL.revokeObjectURL(url), REVOCAR_DESCARGA_MS)
  }
}
