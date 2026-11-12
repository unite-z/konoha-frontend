/**
 * Acciones de MOD-05 por permiso y estado (AV-382: los códigos de MOD-01 de la sesión, no el nombre del rol).
 *
 * La interfaz oculta lo que la sesión no puede hacer y deshabilita, con su motivo, lo que el estado aún no
 * permite. El back-end vuelve a comprobarlo todo: estas reglas nunca sustituyen su respuesta.
 */
import type { Atencion, RolTercerizados } from '../types/tercerizados'
import { tiene, type Permisos } from './permisosSesion'
import { haTerminado, textoOrden } from '../utils/estadosTercerizados'

export const ROLES_TERCERIZADOS: readonly RolTercerizados[] = [
  'Jefe de sección',
  'Ingeniero de campo',
  'Practicante autorizado',
]

/** Códigos de MOD-05 (`core_permiso`). */
export const PERMISOS_TERCERIZADOS = {
  /** Consultar atenciones y avanzar su ciclo: orden de compra, inicio, fin, reporte. */
  registrarAtencion: 'SER.ATENCION.REGISTRAR',
  /** Registrar atenciones y decidir sobre ellas: origen, acuerdo, plan fitosanitario. */
  gestionarAtencion: 'SER.ATENCION.GESTIONAR',
  registrarConformidad: 'SER.CONFORMIDAD.REGISTRAR',
  verificarSeguridad: 'SER.SEGURIDAD.VERIFICAR',
  consultarContratos: 'SER.CONTRATO.CONSULTAR',
  gestionarContratos: 'SER.CONTRATO.GESTIONAR',
} as const

export type AccionAtencion =
  | 'ordenCompra'
  | 'inicio'
  | 'fin'
  | 'corregirOrigen'
  | 'acuerdoUnidad'
  | 'adjuntarReporte'
  | 'seguridad'
  | 'conformidad'

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

/** Registrar atenciones (RF-SER-003): `SER.ATENCION.GESTIONAR` (hoy, el jefe de sección). */
export function puedeRegistrarAtencion(permisos: Permisos): boolean {
  return tiene(permisos, PERMISOS_TERCERIZADOS.gestionarAtencion)
}

/** Disponibilidad de una acción sobre la atención para los permisos de la sesión. */
export function disponibilidad(
  accion: AccionAtencion,
  permisos: Permisos,
  atencion: Pick<Atencion, 'estado' | 'es_riesgo' | 'origen' | 'clase' | 'numero_orden_compra' | 'verificaciones_seguridad'>,
): DisponibilidadAccion {
  if (!tiene(permisos, PERMISOS_TERCERIZADOS.registrarAtencion)) return OCULTA
  const { estado } = atencion
  const esJefe = tiene(permisos, PERMISOS_TERCERIZADOS.gestionarAtencion)
  const antesDelInicio = estado === 'Requerimiento registrado' || estado === 'OC referenciada'
  const terminada = haTerminado(estado)

  switch (accion) {
    case 'ordenCompra':
      return antesDelInicio ? LISTA : OCULTA
    case 'seguridad':
      return atencion.es_riesgo && antesDelInicio && tiene(permisos, PERMISOS_TERCERIZADOS.verificarSeguridad) ? LISTA : OCULTA
    case 'inicio':
      if (estado === 'Requerimiento registrado') return bloqueada(`Registra primero la ${textoOrden(atencion.clase)} emitida por Logística`)
      if (estado !== 'OC referenciada') return OCULTA
      if (atencion.es_riesgo && !atencion.verificaciones_seguridad?.length) {
        return bloqueada('Atención de riesgo: registra primero la verificación de seguridad')
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
      // Con la atención conforme ya no se aceptan más revisiones.
      return terminada && estado !== 'Conforme / cerrado' ? LISTA : OCULTA
    case 'conformidad':
      if (!tiene(permisos, PERMISOS_TERCERIZADOS.registrarConformidad)) return OCULTA
      if (estado === 'Reporte adjunto') return LISTA
      if (estado === 'Ejecutado pendiente de reporte') return bloqueada('Adjunta primero el informe del proveedor')
      if (estado === 'Observado') return bloqueada('Espera la nueva revisión del informe para volver a evaluarlo')
      return OCULTA
  }
}
