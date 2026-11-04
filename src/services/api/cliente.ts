/**
 * Cliente único de la API REST del MOD-06 (ADR-001: API REST desacoplada con contrato OpenAPI).
 *
 * Es el único punto que conoce la URL base, serializa los parámetros e interpreta los errores:
 * - errores de dominio `{codigo, detalle}` (400, 404, 409, 415, 422, 503);
 * - errores de validación de DRF: `{campo: [mensajes]}`;
 * - errores propios de DRF: `{detail: "..."}` (por ejemplo, 403).
 *
 * Sesión de MOD-01 (AV-327): la cookie `HttpOnly` viaja sola, las escrituras llevan el token CSRF y un 401 avisa a la
 * sesión para volver al ingreso.
 *
 * Las páginas nunca llaman a `fetch` directamente: usan `reportes.ts` e `ia.ts`.
 */

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '/api/v1'

/** Mensaje cuando el servidor no responde (texto propio, sin equivalente en el back-end). */
export const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo'

/** Mensaje cuando el servidor responde con un error sin cuerpo reconocible. */
const MENSAJE_ERROR_INESPERADO = 'El servidor no pudo atender la solicitud. Vuelve a intentarlo en unos minutos'

/** Error tipado de la API. `detalle` ya está escrito para el usuario: se muestra tal cual. */
export class ErrorApi extends Error {
  /** Código HTTP (0 si no hubo respuesta). */
  readonly estado: number
  /** Nombre de la excepción de dominio, o `null` en errores de validación de DRF. */
  readonly codigo: string | null
  /** Mensaje para el usuario. */
  readonly detalle: string
  /** Mensajes de validación por campo (formato de DRF). */
  readonly errores_campo: Record<string, string[]>

  constructor(estado: number, codigo: string | null, detalle: string, erroresCampo: Record<string, string[]> = {}) {
    super(detalle)
    this.name = 'ErrorApi'
    this.estado = estado
    this.codigo = codigo
    this.detalle = detalle
    this.errores_campo = erroresCampo
  }
}

/** `true` si el error se produjo porque la petición se canceló (petición obsoleta). */
export function esCancelacion(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/** Convierte cualquier error en `ErrorApi`. */
export function aErrorApi(error: unknown): ErrorApi {
  if (error instanceof ErrorApi) return error
  return new ErrorApi(0, null, MENSAJE_SIN_CONEXION)
}

type ValorParametro = string | number | boolean | null | undefined

export interface OpcionesSolicitud {
  metodo?: 'GET' | 'POST'
  /** Parámetros de consulta; se omiten los vacíos (`null`, `undefined` o cadena vacía). */
  parametros?: Record<string, ValorParametro>
  /** Cuerpo JSON (solo en POST). */
  cuerpo?: unknown
  /** Cuerpo multipart (solo en POST; excluye `cuerpo`). El navegador pone el `boundary`. */
  formulario?: FormData
  signal?: AbortSignal
}

let alPerder: (() => void) | null = null

/** Registra a quién avisar cuando la API responde 401 (sesión caducada, cerrada o cuenta desactivada). */
export function alPerderSesion(funcion: (() => void) | null): void {
  alPerder = funcion
}

/** Avisa de que la sesión se perdió (401). Lo usan todos los clientes con la sesión de MOD-01. */
export function avisarSesionPerdida(): void {
  alPerder?.()
}

/** Valor de una cookie legible por scripts (solo `XSRF-TOKEN`; la de sesión es `HttpOnly`). */
export function leerCookie(nombre: string, cookies: string = typeof document === 'undefined' ? '' : document.cookie): string | null {
  for (const parte of cookies.split(';')) {
    const [clave, ...valor] = parte.trim().split('=')
    if (clave === nombre) return decodeURIComponent(valor.join('='))
  }
  return null
}

/** Construye la URL relativa a `API_BASE_URL` con los parámetros no vacíos. */
function construirUrl(ruta: string, parametros?: Record<string, ValorParametro>): string {
  const consulta = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros ?? {})) {
    if (valor === null || valor === undefined || valor === '') continue
    consulta.set(clave, String(valor))
  }
  const texto = consulta.toString()
  return `${API_BASE_URL}/${ruta}${texto ? `?${texto}` : ''}`
}

/** Interpreta el cuerpo de una respuesta de error (también lo usa el cliente de MOD-05). */
export function interpretarError(estado: number, cuerpo: unknown): ErrorApi {
  if (cuerpo && typeof cuerpo === 'object') {
    const objeto = cuerpo as Record<string, unknown>
    // Error de dominio: {codigo, detalle}.
    if (typeof objeto.codigo === 'string' && typeof objeto.detalle === 'string') {
      // Con `errores: {campo: [mensajes]}` (MOD-03) se conservan los mensajes por campo.
      const erroresCampo: Record<string, string[]> = {}
      if (objeto.errores && typeof objeto.errores === 'object') {
        for (const [campo, mensajes] of Object.entries(objeto.errores)) erroresCampo[campo] = aplanarMensajes(mensajes)
      }
      return new ErrorApi(estado, objeto.codigo, objeto.detalle, erroresCampo)
    }
    // Error propio de DRF: {detail}.
    if (typeof objeto.detail === 'string') {
      return new ErrorApi(estado, null, objeto.detail)
    }
    // Error de validación de DRF: {campo: [mensajes]} (puede tener objetos anidados).
    const erroresCampo: Record<string, string[]> = {}
    for (const [campo, mensajes] of Object.entries(objeto)) {
      const lista = aplanarMensajes(mensajes)
      if (lista.length > 0) erroresCampo[campo] = lista
    }
    const primeros = Object.values(erroresCampo).flat()
    if (primeros.length > 0) {
      return new ErrorApi(estado, null, primeros.join('. '), erroresCampo)
    }
  }
  return new ErrorApi(estado, null, MENSAJE_ERROR_INESPERADO)
}

function aplanarMensajes(valor: unknown): string[] {
  if (typeof valor === 'string') return [valor]
  if (Array.isArray(valor)) return valor.flatMap(aplanarMensajes)
  if (valor && typeof valor === 'object') return Object.values(valor).flatMap(aplanarMensajes)
  return []
}

/**
 * Hace una petición a la API y devuelve el cuerpo JSON tipado.
 * Lanza `ErrorApi` si la respuesta no es 2xx o no hay conexión, y `DOMException` (AbortError) si se cancela.
 */
export async function solicitar<T>(ruta: string, opciones: OpcionesSolicitud = {}): Promise<T> {
  const respuesta = await enviar(ruta, opciones, 'application/json')

  let datos: unknown = null
  const texto = await respuesta.text()
  if (texto) {
    try {
      datos = JSON.parse(texto)
    } catch {
      datos = null
    }
  }

  if (!respuesta.ok) throw interpretarError(respuesta.status, datos)
  return datos as T
}

/** Hace la petición con la sesión (cookie y token CSRF). Lanza `ErrorApi` sin conexión y avisa del 401. */
async function enviar(ruta: string, opciones: OpcionesSolicitud, acepta: string): Promise<Response> {
  const { metodo = 'GET', parametros, cuerpo, formulario, signal } = opciones
  const token = metodo === 'GET' ? null : leerCookie('XSRF-TOKEN')
  const json = formulario === undefined && cuerpo !== undefined
  let respuesta: Response
  try {
    respuesta = await fetch(construirUrl(ruta, parametros), {
      method: metodo,
      headers: {
        Accept: acepta,
        ...(json ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { 'X-XSRF-TOKEN': token } : {}),
      },
      credentials: 'same-origin',
      body: formulario ?? (json ? JSON.stringify(cuerpo) : undefined),
      signal,
    })
  } catch (error) {
    if (esCancelacion(error)) throw error
    throw new ErrorApi(0, null, MENSAJE_SIN_CONEXION)
  }
  if (respuesta.status === 401) avisarSesionPerdida()
  return respuesta
}

/** Descarga un archivo protegido (por ejemplo, una fotografía) como `Blob`, con la sesión. */
export async function solicitarBlob(ruta: string, signal?: AbortSignal): Promise<Blob> {
  const respuesta = await enviar(ruta, { signal }, '*/*')
  if (!respuesta.ok) {
    let datos: unknown = null
    try {
      datos = JSON.parse(await respuesta.text())
    } catch {
      datos = null
    }
    throw interpretarError(respuesta.status, datos)
  }
  try {
    return await respuesta.blob()
  } catch (error) {
    if (esCancelacion(error)) throw error
    throw new ErrorApi(0, null, MENSAJE_SIN_CONEXION)
  }
}
