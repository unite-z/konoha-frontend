import { ErrorApi, construirUrlHttp, solicitarHttp } from './cliente'
import type { PaginaCampo } from '@/types/operacionCampo'

const BASE = '/api/v1/operacion-campo'
export type ParametrosCampo = Record<string, string | number | boolean | null | undefined>
export interface OpcionesCampo {
  metodo?: 'GET' | 'POST' | 'PUT'
  cuerpo?: unknown
  parametros?: ParametrosCampo
  signal?: AbortSignal
  claveIdempotencia?: string
}
export function urlCampo(ruta: string, parametros: ParametrosCampo = {}): string {
  return construirUrlHttp(ruta, parametros, BASE)
}
/** Petición a MOD-04 sobre el cliente único: el JSON es obligatorio y no se reutilizan respuestas privadas. */
export function campoApi<T>(ruta: string, opciones: OpcionesCampo = {}): Promise<T> {
  const { claveIdempotencia, ...resto } = opciones
  return solicitarHttp<T>(ruta, {
    ...resto,
    base: BASE,
    sinCache: true,
    cuerpoOk: 'obligatorio',
    cabeceras: claveIdempotencia ? { 'Idempotency-Key': claveIdempotencia } : undefined,
  })
}
/** Obtiene todos los registros mediante páginas propias de la API; nunca sigue URLs externas de next. */
export async function todosCampo<T>(
  ruta: string,
  parametros: ParametrosCampo = {},
  signal?: AbortSignal,
): Promise<T[]> {
  const resultados: T[] = []
  for (let page = 1; page <= 1000; page++) {
    const datos = await campoApi<PaginaCampo<T>>(ruta, { parametros: { ...parametros, page }, signal })
    resultados.push(...datos.results)
    if (!datos.next) return resultados
  }
  throw new ErrorApi(0, null, 'Hay demasiados registros para cargar el selector. Contacta al administrador')
}
