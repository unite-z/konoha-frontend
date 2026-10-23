/** Errores al registrar proveedores, contratos y ejemplares con atención especial: cómo se interpretan. */
import { aErrorApi } from '../../../services/api/cliente'

export type FalloRegistro =
  | { tipo: 'conexion' }
  /** El servidor informa que el RUC (o el ejemplar) ya está registrado: 409. */
  | { tipo: 'existente'; detalle: string }
  | { tipo: 'mensaje'; titulo: string; detalle: string[] }

/** `accion` completa la frase «No se pudo …», por ejemplo «registrar el proveedor». */
export function interpretarFallo(causa: unknown, accion: string): FalloRegistro {
  const error = aErrorApi(causa)
  if (error.estado === 0) return { tipo: 'conexion' }
  if (error.estado === 409) return { tipo: 'existente', detalle: error.detalle }
  if (error.estado === 403) {
    return {
      tipo: 'mensaje',
      titulo: 'Sin permiso',
      detalle: [`Tu usuario no puede ${accion}. Si cambiaron tus roles, vuelve a ingresar.`],
    }
  }
  const campos = Object.values(error.errores_campo).flat()
  return { tipo: 'mensaje', titulo: `No se pudo ${accion}`, detalle: campos.length > 0 ? campos : [error.detalle] }
}

/** Lleva el foco al campo con el `id` dado (después de que React pinte el error). */
export function enfocar(id: string) {
  window.setTimeout(() => document.getElementById(id)?.focus(), 0)
}
