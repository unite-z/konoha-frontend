/**
 * Cliente único de la API REST del MOD-06 (ADR-001: API REST desacoplada con contrato OpenAPI).
 *
 * Es el único punto que conoce la URL base, serializa los parámetros e interpreta los errores:
 * - errores de dominio `{codigo, detalle}` (400, 404, 409, 415, 422, 503);
 * - errores de validación de DRF: `{campo: [mensajes]}`;
 * - errores propios de DRF: `{detail: "..."}` (por ejemplo, 403).
 *
 * Las páginas nunca llaman a `fetch` directamente: usan `reportes.ts` e `ia.ts`.
 */

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL

/** Mensaje cuando el servidor no responde (texto propio, sin equivalente en el back-end). */
const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo'

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
  signal?: AbortSignal
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

/** Interpreta el cuerpo de una respuesta de error. */
function interpretarError(estado: number, cuerpo: unknown): ErrorApi {
  if (cuerpo && typeof cuerpo === 'object') {
    const objeto = cuerpo as Record<string, unknown>
    // Error de dominio: {codigo, detalle}.
    if (typeof objeto.codigo === 'string' && typeof objeto.detalle === 'string') {
      return new ErrorApi(estado, objeto.codigo, objeto.detalle)
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
  const { metodo = 'GET', parametros, cuerpo, signal } = opciones
  let respuesta: Response
  try {
    respuesta = await fetch(construirUrl(ruta, parametros), {
      method: metodo,
      headers: {
        Accept: 'application/json',
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal,
    })
  } catch (error) {
    if (esCancelacion(error)) throw error
    throw new ErrorApi(0, null, MENSAJE_SIN_CONEXION)
  }

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
