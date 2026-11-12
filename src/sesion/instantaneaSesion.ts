/**
 * Instantánea de la sesión para abrir la aplicación sin conexión (RF-T-012, AV-226).
 *
 * Guarda solo lo que devolvió `GET auth/sesion/` (usuario, rol y permisos). La credencial es la cookie `HttpOnly`,
 * que nunca se toca. Sin conexión, la interfaz deja trabajar con la instantánea; el servidor vuelve a comprobar la
 * sesión, los permisos y la vigencia de la cuenta en cuanto llega cada operación de la cola.
 */
import { borrar, guardar, leer } from '@/sincronizacion/almacenLocal'
import type { SesionCore } from '@/types/core'

const CLAVE = 'ultima'

interface Instantanea {
  clave: string
  sesion: SesionCore
  guardada_en: string
}

export async function guardarInstantanea(sesion: SesionCore): Promise<void> {
  await guardar<Instantanea>('sesion', { clave: CLAVE, sesion, guardada_en: new Date().toISOString() }).catch(() => undefined)
}

export async function leerInstantanea(): Promise<SesionCore | null> {
  const instantanea = await leer<Instantanea>('sesion', CLAVE).catch(() => undefined)
  return instantanea?.sesion ?? null
}

export async function borrarInstantanea(): Promise<void> {
  await borrar('sesion', CLAVE).catch(() => undefined)
}
