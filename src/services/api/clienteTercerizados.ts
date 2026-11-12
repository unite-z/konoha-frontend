/**
 * Cliente de la API de MOD-05 (`/api/tercerizados/`).
 *
 * Misma sesión de MOD-01 que `cliente.ts` (MOD-06): la cookie `HttpOnly` viaja sola, las escrituras llevan el token
 * CSRF y un 401 avisa a la sesión para volver al ingreso. La interfaz no guarda ninguna credencial. Además:
 * - Métodos GET, POST y PATCH; cuerpo JSON o `FormData` (multipart, el navegador pone el `boundary`).
 * - Descarga de archivos autenticada (blob).
 * Es un envoltorio del cliente único (`cliente.ts`): los errores se interpretan igual que en MOD-06 (`ErrorApi`).
 */
import {
  construirUrlHttp,
  descargarHttp,
  guardarArchivo,
  solicitarHttp,
  type OpcionesHttp,
  type ValorParametro,
} from './cliente'

export const API_TERCERIZADOS_URL: string = import.meta.env.VITE_API_TERCERIZADOS_URL || '/api/tercerizados'

export interface OpcionesTercerizados {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Parámetros de consulta; se omiten los vacíos (`null`, `undefined` o cadena vacía). */
  parametros?: Record<string, ValorParametro>
  /** Cuerpo JSON. */
  cuerpo?: unknown
  /** Cuerpo multipart. Excluye `cuerpo`. */
  formulario?: FormData
  signal?: AbortSignal
  /** Base de la API si no es la de MOD-05 (MOD-03 usa el mismo transporte). */
  base?: string
  /** Cabeceras extra, como `Idempotency-Key` en las marcas del capataz (AV-260). */
  cabeceras?: Record<string, string>
}

/** URL absoluta de la ruta (relativa a la base de MOD-05), con los parámetros no vacíos. */
export function construirUrlTercerizados(
  ruta: string,
  parametros?: Record<string, ValorParametro>,
  baseApi: string = API_TERCERIZADOS_URL,
): string {
  return construirUrlHttp(ruta, parametros, baseApi)
}

/** Opciones propias de este transporte: solo la cookie de este origen y nunca reutilizar respuestas privadas. */
function opcionesHttp(opciones: OpcionesTercerizados): OpcionesHttp {
  return { ...opciones, base: opciones.base ?? API_TERCERIZADOS_URL, sinCache: true }
}

/**
 * Petición a la API de MOD-05 que devuelve JSON tipado.
 * Lanza `ErrorApi` (estado 0 sin conexión) o `DOMException` AbortError si se cancela.
 */
export function solicitarTercerizados<T>(ruta: string, opciones: OpcionesTercerizados = {}): Promise<T> {
  return solicitarHttp<T>(ruta, { ...opcionesHttp(opciones), cuerpoOk: 'estricto' })
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
  const { blob, cabeceras } = await descargarHttp(ruta, opcionesHttp({ signal }))
  guardarArchivo(blob, nombreDeDisposicion(cabeceras.get('Content-Disposition')) ?? nombre)
}
