/**
 * Lecturas disponibles sin conexión (RF-T-012, AV-226): «consultar sus últimos encargos descargados».
 *
 * `conCache` guarda la última respuesta correcta de una lectura y, si no hay red (`ErrorApi` con estado 0), devuelve
 * esa copia. Cualquier otro error (401, 403, 404…) se propaga: el servidor sigue decidiendo.
 *
 * Las claves llevan el usuario de la sesión, y `olvidarDatos` las borra al cerrar sesión: nunca se ven datos de otro
 * usuario en el mismo dispositivo.
 */
import { aErrorApi, esCancelacion } from '@/services/api/cliente'
import { guardar, leer, vaciar } from './almacenLocal'

interface Copia {
  clave: string
  datos: unknown
  descargado_en: string
}

let usuarioActual: number | null = null
const descargas = new Map<string, string>()

/** Lo fija el proveedor de la sesión: sin usuario no se guarda ni se lee nada. */
export function fijarUsuarioDatos(usuarioId: number | null): void {
  usuarioActual = usuarioId
}

function claveCompleta(clave: string): string | null {
  return usuarioActual === null ? null : `${usuarioActual}:${clave}`
}

export async function conCache<T>(clave: string, cargar: () => Promise<T>): Promise<T> {
  const completa = claveCompleta(clave)
  try {
    const datos = await cargar()
    if (completa) {
      descargas.delete(completa)
      // Sin almacén (modo privado) la lectura sigue funcionando con conexión.
      await guardar<Copia>('datos', { clave: completa, datos, descargado_en: new Date().toISOString() }).catch(() => undefined)
    }
    return datos
  } catch (causa) {
    if (esCancelacion(causa) || !completa || aErrorApi(causa).estado !== 0) throw causa
    const copia = await leer<Copia>('datos', completa).catch(() => undefined)
    if (!copia) throw causa
    descargas.set(completa, copia.descargado_en)
    return copia.datos as T
  }
}

/** Si lo último que se mostró de `clave` es la copia del dispositivo, cuándo se descargó (para «Datos de las 08:10»). */
export function descargadoEn(clave: string): string | null {
  const completa = claveCompleta(clave)
  return completa ? (descargas.get(completa) ?? null) : null
}

export async function olvidarDatos(): Promise<void> {
  descargas.clear()
  await vaciar('datos').catch(() => undefined)
}
