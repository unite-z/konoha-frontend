/**
 * Proveedor y modelo de IA desde Configuración (AV-395). Solo para quien tiene IA.PROPUESTA.VALIDAR.
 * Las claves siguen en el servidor: la API solo dice si están.
 */
import type { ConfiguracionIa, ProveedorIa, PruebaConexionIa } from '@/types/ia'
import { solicitar, solicitarHttp } from './cliente'

export interface CambioIa {
  proveedor: ProveedorIa
  modelo: string
}

/** `GET ia/configuracion/`. */
export function obtenerConfiguracionIa(signal?: AbortSignal) {
  return solicitar<ConfiguracionIa>('ia/configuracion/', { signal })
}

/** `PUT ia/configuracion/`: cambia el proveedor y el modelo de todos los asistentes. */
export function cambiarConfiguracionIa(cuerpo: CambioIa) {
  return solicitarHttp<ConfiguracionIa>('ia/configuracion/', { metodo: 'PUT', cuerpo })
}

/** `POST ia/configuracion/probar/`: una petición mínima; responde 200 también cuando la IA falla. */
export function probarConexionIa(cuerpo: CambioIa) {
  return solicitar<PruebaConexionIa>('ia/configuracion/probar/', { metodo: 'POST', cuerpo })
}
