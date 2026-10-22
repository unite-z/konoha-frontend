/**
 * Cliente de la API de MOD-03 (`/api/v1/planificacion`).
 *
 * Reutiliza el transporte de MOD-05: misma sesión HTTP Basic (`establecerAutorizacion`) y mismos errores
 * (`ErrorApi`, que además lee `errores` por campo). 401 = sin credenciales; 403 = sin permiso.
 */
import { solicitarTercerizados, type OpcionesTercerizados } from './clienteTercerizados'

export const API_PLANIFICACION_URL: string = import.meta.env.VITE_API_PLANIFICACION_URL || '/api/v1/planificacion'

export function solicitarPlanificacion<T>(ruta: string, opciones: OpcionesTercerizados = {}): Promise<T> {
  return solicitarTercerizados<T>(ruta, { ...opciones, base: API_PLANIFICACION_URL })
}
