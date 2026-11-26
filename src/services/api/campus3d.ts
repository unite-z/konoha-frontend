/**
 * Datos del campus en 3D (AV-424). Fichero estático servido con la aplicación (`public/datos/campus-3d.json`), leído con
 * el cliente único para respetar la regla de que ningún componente llama a `fetch`.
 */
import type { DatosCampus } from '@/types/campus3d'
import { solicitarHttp } from './cliente'

export const RUTA_DATOS_CAMPUS = 'campus-3d.json'
const BASE_DATOS = '/datos'

export function obtenerCampus3d(signal?: AbortSignal): Promise<DatosCampus> {
  return solicitarHttp<DatosCampus>(RUTA_DATOS_CAMPUS, { base: BASE_DATOS, signal, cuerpoOk: 'obligatorio' })
}
