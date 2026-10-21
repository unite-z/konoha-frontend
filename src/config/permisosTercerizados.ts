/**
 * Acciones de MOD-05 por rol y estado (Spring Boot: `backend-mod05/`).
 *
 * La interfaz oculta lo que el rol no puede hacer y deshabilita, con su motivo, lo que el estado aún no
 * permite. El back-end vuelve a comprobarlo todo: estas reglas nunca sustituyen su respuesta.
 */
import type { Atencion, RolTercerizados } from '../types/tercerizados'

export const ROLES_TERCERIZADOS: readonly RolTercerizados[] = [
  'Jefe de sección',
  'Ingeniero de campo',
  'Practicante autorizado',
]

const JEFE: RolTercerizados = 'Jefe de sección'

export type AccionAtencion =
  | 'ordenCompra'
  | 'inicio'
  | 'fin'
  | 'corregirOrigen'
  | 'acuerdoUnidad'
  | 'adjuntarReporte'

/** Resultado para una acción: si se muestra y, si se muestra deshabilitada, por qué. */
export interface DisponibilidadAccion {
  visible: boolean
  habilitada: boolean
  motivo?: string
}

const OCULTA: DisponibilidadAccion = { visible: false, habilitada: false }
const LISTA: DisponibilidadAccion = { visible: true, habilitada: true }

function bloqueada(motivo: string): DisponibilidadAccion {
  return { visible: true, habilitada: false, motivo }
}

export function esRolTercerizados(valor: unknown): valor is RolTercerizados {
  return typeof valor === 'string' && (ROLES_TERCERIZADOS as readonly string[]).includes(valor)
}

/** Solo el jefe de sección registra atenciones (RF-SER-003). */
export function puedeRegistrarAtencion(rol: RolTercerizados | null): boolean {
  return rol === JEFE
}

/** Disponibilidad de una acción sobre la atención para el rol dado. */
export function disponibilidad(
  accion: AccionAtencion,
  rol: RolTercerizados | null,
  atencion: Pick<Atencion, 'estado' | 'es_riesgo' | 'origen' | 'numero_orden_compra'>,
): DisponibilidadAccion {
  if (!esRolTercerizados(rol)) return OCULTA
  const { estado } = atencion
  const esJefe = rol === JEFE
  const antesDelInicio = estado === 'Requerimiento registrado' || estado === 'OC referenciada'
  const terminada = estado === 'Ejecutado pendiente de reporte' || estado === 'Reporte adjunto'

  switch (accion) {
    case 'ordenCompra':
      return antesDelInicio ? LISTA : OCULTA
    case 'inicio':
      if (estado === 'Requerimiento registrado') return bloqueada('Registra primero la orden de compra emitida por Logística')
      if (estado !== 'OC referenciada') return OCULTA
      if (atencion.es_riesgo) {
        return bloqueada('Atención de riesgo: el inicio queda bloqueado hasta integrar la revisión de seguridad')
      }
      return LISTA
    case 'fin':
      return estado === 'En ejecución' ? LISTA : OCULTA
    case 'corregirOrigen':
      return esJefe && antesDelInicio ? LISTA : OCULTA
    case 'acuerdoUnidad':
      if (!esJefe || atencion.origen !== 'SolicitudUnidad') return OCULTA
      return terminada ? LISTA : bloqueada('Se registra cuando termine la ejecución del servicio')
    case 'adjuntarReporte':
      return terminada ? LISTA : OCULTA
  }
}
