/**
 * Cliente de los reportes de gestión del MOD-06 (`/api/v1/reportes/panel|material-vegetal|mapa-atenciones|…`).
 *
 * Reutiliza el transporte de MOD-05: misma sesión HTTP Basic (`establecerAutorizacion`) y mismos errores
 * (`ErrorApi`, que lee `errores` por campo). 401 = sin credenciales; 403 = sin permiso.
 * Los demás reportes del MOD-06 siguen con `cliente.ts` (sin autenticación): no cambian.
 *
 * Descargas (RF-REP-009): `descargarReportesGestion` usa las piezas que exporta el cliente de MOD-05 (URL y nombre
 * del archivo) sin modificarlo, y `guardarArchivo` entrega el blob al navegador.
 */
import { aErrorApi, esCancelacion, ErrorApi, interpretarError, MENSAJE_SIN_CONEXION } from './cliente'
import {
  construirUrlTercerizados,
  nombreDeDisposicion,
  solicitarTercerizados,
  type OpcionesTercerizados,
} from './clienteTercerizados'

export const API_REPORTES_GESTION_URL: string = import.meta.env.VITE_API_REPORTES_GESTION_URL || '/api/v1/reportes'

export function solicitarReportesGestion<T>(ruta: string, opciones: OpcionesTercerizados = {}): Promise<T> {
  return solicitarTercerizados<T>(ruta, { ...opciones, base: API_REPORTES_GESTION_URL })
}

/** Tiempo antes de liberar el blob: revocarlo de inmediato puede cancelar la descarga. */
const REVOCAR_DESCARGA_MS = 60_000

/** Entrega un archivo al navegador con un enlace temporal y libera el blob después. */
export function guardarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob)
  try {
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombre
    enlace.rel = 'noopener'
    document.body.append(enlace)
    enlace.click()
    enlace.remove()
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), REVOCAR_DESCARGA_MS)
  }
}

/** Descarga (GET) un archivo de la API de reportes con la sesión de la cookie. */
export async function descargarReportesGestion(ruta: string, nombre: string, signal?: AbortSignal): Promise<void> {
  let respuesta: Response
  try {
    respuesta = await fetch(construirUrlTercerizados(ruta, undefined, API_REPORTES_GESTION_URL), {
      method: 'GET',
      headers: { Accept: '*/*' },
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
    })
  } catch (error) {
    if (esCancelacion(error)) throw error
    throw new ErrorApi(0, null, MENSAJE_SIN_CONEXION)
  }
  if (!respuesta.ok) {
    const cuerpo: unknown = await respuesta.json().catch(() => null)
    throw interpretarError(respuesta.status, cuerpo)
  }
  try {
    const blob = await respuesta.blob()
    guardarArchivo(blob, nombreDeDisposicion(respuesta.headers.get('Content-Disposition')) ?? nombre)
  } catch (error) {
    if (esCancelacion(error)) throw error
    throw aErrorApi(error)
  }
}
