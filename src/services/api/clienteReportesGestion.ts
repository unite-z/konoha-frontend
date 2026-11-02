/**
 * Cliente de los reportes de gestión del MOD-06 (`/api/v1/reportes/panel|material-vegetal|mapa-atenciones`).
 *
 * Reutiliza el transporte de MOD-05: misma sesión HTTP Basic (`establecerAutorizacion`) y mismos errores
 * (`ErrorApi`, que lee `errores` por campo). 401 = sin credenciales; 403 = sin permiso.
 * Los demás reportes del MOD-06 siguen con `cliente.ts` (sin autenticación): no cambian.
 */
import { solicitarTercerizados, type OpcionesTercerizados } from './clienteTercerizados'

export const API_REPORTES_GESTION_URL: string = import.meta.env.VITE_API_REPORTES_GESTION_URL || '/api/v1/reportes'

export function solicitarReportesGestion<T>(ruta: string, opciones: OpcionesTercerizados = {}): Promise<T> {
  return solicitarTercerizados<T>(ruta, { ...opciones, base: API_REPORTES_GESTION_URL })
}
