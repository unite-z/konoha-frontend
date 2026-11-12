/**
 * Cliente HTTP único de la aplicación (AV-354). Es el único sitio que llama a `fetch`: construye la URL, aplica la
 * sesión de MOD-01 e interpreta los errores. Cada módulo lo usa con su propia base (`base`) mediante un envoltorio fino:
 * `solicitar` (MOD-06, `/api/v1`), `solicitarCore` (MOD-01), `solicitarTercerizados` (MOD-05), `solicitarPlanificacion`
 * (MOD-03), `solicitarReportesGestion` y `campoApi` (MOD-04).
 *
 * Errores aceptados (ADR 0004 sigue «propuesto»; durante la transición se entienden todos los formatos):
 * - errores de dominio `{codigo, detalle}` (con `errores: {campo: [mensajes]}` opcional);
 * - errores propios de DRF y de la autenticación: `{detail: "..."}` (por ejemplo, 403);
 * - errores de validación: `{campo: [mensajes]}`, con objetos anidados.
 *
 * Sesión de MOD-01 (AV-327): la cookie `HttpOnly` viaja sola, las escrituras llevan el token CSRF y un 401 avisa a la
 * sesión para volver al ingreso. Un 403 no cierra la sesión: llega a la página como `ErrorApi` con `estado` 403.
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

export type ValorParametro = string | number | boolean | null | undefined

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

/** Opciones del cliente único; los envoltorios de cada módulo fijan la `base` y los modos que necesitan. */
export interface OpcionesHttp {
  /** Base de la API; por defecto la de MOD-06. */
  base?: string
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Parámetros de consulta; se omiten los vacíos (`null`, `undefined` o cadena vacía). */
  parametros?: Record<string, ValorParametro>
  /** Cuerpo JSON. */
  cuerpo?: unknown
  /** Cuerpo multipart. Excluye `cuerpo`; el navegador pone el `boundary`. */
  formulario?: FormData
  /** Cabeceras extra, como `Idempotency-Key`. */
  cabeceras?: Record<string, string>
  signal?: AbortSignal
  acepta?: string
  /** Pide `cache: 'no-store'` (respuestas privadas). */
  sinCache?: boolean
  /** `false` si un 401 no debe avisar a la sesión (por ejemplo, el propio ingreso). */
  avisarSesion?: boolean
  /**
   * Qué hacer con un cuerpo 2xx que no es JSON: `tolerante` lo da por `null`; `estricto` falla si no es JSON (vacío =
   * `null`); `obligatorio` falla también si está vacío.
   */
  cuerpoOk?: 'tolerante' | 'estricto' | 'obligatorio'
}

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

/** Construye la URL de la ruta relativa a `base`, con los parámetros no vacíos. */
export function construirUrlHttp(ruta: string, parametros?: Record<string, ValorParametro>, base: string = API_BASE_URL): string {
  const consulta = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros ?? {})) {
    if (valor === null || valor === undefined || valor === '') continue
    consulta.set(clave, String(valor))
  }
  const texto = consulta.toString()
  return `${base.replace(/\/+$/, '')}/${ruta.replace(/^\/+/, '')}${texto ? `?${texto}` : ''}`
}

/**
 * Hace la petición con la sesión (cookie y token CSRF) y devuelve la respuesta sin interpretarla. Lanza `ErrorApi`
 * sin conexión, `DOMException` (AbortError) si se cancela, y avisa del 401.
 */
export async function enviarHttp(ruta: string, opciones: OpcionesHttp = {}): Promise<Response> {
  const { metodo = 'GET', parametros, cuerpo, formulario, signal, base, acepta = 'application/json' } = opciones
  const cabeceras = new Headers({ Accept: acepta })
  if (metodo !== 'GET') {
    const token = leerCookie('XSRF-TOKEN')
    if (token) cabeceras.set('X-XSRF-TOKEN', token)
  }
  if (cuerpo !== undefined && formulario === undefined) cabeceras.set('Content-Type', 'application/json')
  for (const [nombre, valor] of Object.entries(opciones.cabeceras ?? {})) cabeceras.set(nombre, valor)
  let respuesta: Response
  try {
    respuesta = await fetch(construirUrlHttp(ruta, parametros, base), {
      method: metodo,
      headers: cabeceras,
      credentials: 'same-origin',
      ...(opciones.sinCache ? { cache: 'no-store' as const } : {}),
      body: formulario ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
      signal,
    })
  } catch (error) {
    if (esCancelacion(error)) throw error
    throw new ErrorApi(0, null, MENSAJE_SIN_CONEXION)
  }
  if (respuesta.status === 401 && opciones.avisarSesion !== false) avisarSesionPerdida()
  return respuesta
}

/** Lee el cuerpo como JSON; `legible` es `false` si estaba vacío o no era JSON. */
function leerJson(texto: string): { datos: unknown; legible: boolean } {
  if (!texto) return { datos: null, legible: false }
  try {
    return { datos: JSON.parse(texto), legible: true }
  } catch {
    return { datos: null, legible: false }
  }
}

/**
 * Petición JSON tipada. Lanza `ErrorApi` si la respuesta no es 2xx o no hay conexión, y `DOMException` (AbortError)
 * si se cancela.
 */
export async function solicitarHttp<T>(ruta: string, opciones: OpcionesHttp = {}): Promise<T> {
  const respuesta = await enviarHttp(ruta, opciones)
  const texto = await respuesta.text()
  const { datos, legible } = leerJson(texto)
  if (!respuesta.ok) throw errorDe(respuesta.status, datos)
  const modo = opciones.cuerpoOk ?? 'tolerante'
  if (!legible && (modo === 'obligatorio' || (modo === 'estricto' && texto !== ''))) throw interpretarError(respuesta.status, null)
  return datos as T
}

/** Descarga un archivo con la sesión: el blob y las cabeceras (para `Content-Disposition`). */
export async function descargarHttp(ruta: string, opciones: OpcionesHttp = {}): Promise<{ blob: Blob; cabeceras: Headers }> {
  const respuesta = await enviarHttp(ruta, { ...opciones, acepta: '*/*' })
  if (!respuesta.ok) throw errorDe(respuesta.status, leerJson(await respuesta.text()).datos)
  try {
    return { blob: await respuesta.blob(), cabeceras: respuesta.headers }
  } catch (error) {
    if (esCancelacion(error)) throw error
    throw new ErrorApi(0, null, MENSAJE_SIN_CONEXION)
  }
}

/** Petición a la API de MOD-06 (`/api/v1`). Envoltorio del cliente único. */
export function solicitar<T>(ruta: string, opciones: OpcionesSolicitud = {}): Promise<T> {
  return solicitarHttp<T>(ruta, opciones)
}

/** Descarga un archivo protegido (por ejemplo, una fotografía) como `Blob`, con la sesión. */
export async function solicitarBlob(ruta: string, signal?: AbortSignal): Promise<Blob> {
  return (await descargarHttp(ruta, { signal })).blob
}
