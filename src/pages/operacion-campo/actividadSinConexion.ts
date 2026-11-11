/**
 * Registro de actividades de campo sin conexión (RF-T-012, AV-226; HU-MOD04-012-OFF).
 *
 * La actividad necesita su parte. Sin red se usa el parte de la cuadrilla y fecha que ya se descargó en el
 * dispositivo; si no hay ninguno, se encola también la apertura del parte y la actividad espera a que exista para tomar
 * su `id` (`depende_de` y `referencias` de la cola). Así el capataz puede registrar varias actividades del mismo día sin
 * red y todas cuelgan del mismo parte.
 *
 * Las lecturas de partes pasan por `conCache`: con conexión guardan la última respuesta para la próxima vez sin red.
 */
import { ErrorApi } from '@/services/api/cliente'
import { todosCampo } from '@/services/api/operacionCampo'
import { encolar, leerEstadoCola } from '@/sincronizacion/cola'
import { conCache } from '@/sincronizacion/datosDescargados'
import type { ParteCampo } from '@/types/operacionCampo'

export const TIPO_PARTE = 'campo.parte'
export const TIPO_ACTIVIDAD = 'campo.actividad'

/** Partes de la cuadrilla en la fecha, con copia en el dispositivo. */
export function partesDe(cuadrillaId: string | number, fecha: string): Promise<ParteCampo[]> {
  return conCache(`partes-${cuadrillaId}-${fecha}`, () => todosCampo<ParteCampo>('partes/', { cuadrilla_id: cuadrillaId, fecha }))
}

/** `true` si el error significa que no hay red: la operación debe ir a la cola. */
export function esSinRed(error: unknown): boolean {
  return error instanceof ErrorApi && error.estado === 0
}

export interface ActividadPorEncolar {
  cuadrillaId: number
  fecha: string
  /** Cuerpo de `POST actividades/` sin `parte_id`. */
  cuerpo: Record<string, unknown>
  descripcion: string
  usuarioId: number
}

/** Guarda la actividad (y, si hace falta, su parte) en la cola. Devuelve el UUID de la actividad en la cola. */
export async function encolarActividad({ cuadrillaId, fecha, cuerpo, descripcion, usuarioId }: ActividadPorEncolar): Promise<string> {
  const conocido = await partesDe(cuadrillaId, fecha)
    .then((partes) => partes[0] ?? null)
    .catch(() => null)
  if (conocido?.estado === 'Cerrado') {
    throw new ErrorApi(409, 'ParteCerrado', 'El parte de esa cuadrilla está cerrado para la fecha seleccionada. No se pueden agregar actividades')
  }
  if (conocido) {
    return encolar({ tipo: TIPO_ACTIVIDAD, carga: { ...cuerpo, parte_id: conocido.id }, descripcion, usuario_id: usuarioId })
  }
  // Un parte de la misma cuadrilla y fecha que ya espera en la cola: la actividad cuelga de él.
  const enCola = leerEstadoCola().pendientes.find(
    (p) => p.tipo === TIPO_PARTE && p.estado !== 'rechazada' && p.carga.cuadrilla_id === cuadrillaId && p.carga.fecha === fecha,
  )
  const parte =
    enCola?.id ??
    (await encolar({
      tipo: TIPO_PARTE,
      carga: { cuadrilla_id: cuadrillaId, fecha },
      descripcion: `Parte del ${fecha}`,
      usuario_id: usuarioId,
    }))
  return encolar({
    tipo: TIPO_ACTIVIDAD,
    carga: { ...cuerpo, parte_id: null },
    descripcion,
    usuario_id: usuarioId,
    depende_de: parte,
    referencias: ['parte_id'],
  })
}
