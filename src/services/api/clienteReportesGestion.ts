/**
 * Cliente de los reportes de gestión del MOD-06 (`/api/v1/reportes/panel|material-vegetal|mapa-atenciones|…`).
 *
 * Reutiliza el transporte de MOD-05: misma sesión de MOD-01 y mismos errores (`ErrorApi`, que lee `errores` por
 * campo). 401 = sin sesión; 403 = sin permiso. Los demás reportes del MOD-06 van por `cliente.ts`, con la misma sesión.
 *
 * Descargas (RF-REP-009): `descargarReportesGestion` usa `descargarHttp` y `guardarArchivo` entrega el blob al navegador.
 */
import { descargarHttp, guardarArchivo } from './cliente'
import { nombreDeDisposicion, solicitarTercerizados, type OpcionesTercerizados } from './clienteTercerizados'

export { guardarArchivo } from './cliente'

export const API_REPORTES_GESTION_URL: string = import.meta.env.VITE_API_REPORTES_GESTION_URL || '/api/v1/reportes'

export function solicitarReportesGestion<T>(ruta: string, opciones: OpcionesTercerizados = {}): Promise<T> {
  return solicitarTercerizados<T>(ruta, { ...opciones, base: API_REPORTES_GESTION_URL })
}

/** Descarga (GET) un archivo de la API de reportes con la sesión de la cookie (un 401 no avisa a la sesión, como antes). */
export async function descargarReportesGestion(ruta: string, nombre: string, signal?: AbortSignal): Promise<void> {
  const { blob, cabeceras } = await descargarHttp(ruta, {
    base: API_REPORTES_GESTION_URL,
    sinCache: true,
    avisarSesion: false,
    signal,
  })
  guardarArchivo(blob, nombreDeDisposicion(cabeceras.get('Content-Disposition')) ?? nombre)
}
