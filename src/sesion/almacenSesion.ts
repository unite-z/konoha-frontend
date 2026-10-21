/**
 * Persistencia de la sesión de MOD-05 en `sessionStorage` (decisión del plan, §4.1).
 *
 * Se guarda la cabecera `Authorization` (HTTP Basic). Dura lo que la pestaña y se borra al cerrar sesión.
 * Nunca se usa `localStorage`: las credenciales no deben sobrevivir al cierre de la pestaña.
 *
 * Riesgo conocido: un script inyectado en la página podría leerla (como cualquier credencial en el
 * navegador). TODO: sustituir por la sesión o los tokens de MOD-01 cuando existan.
 *
 * El almacenamiento puede no estar disponible (navegación privada, políticas del navegador): entonces la
 * sesión vive solo en memoria y se pierde al recargar.
 */

export const CLAVE_SESION = 'areasVerdes.mod05.autorizacion'

/** Subconjunto de `Storage` que se usa (permite probar sin navegador). */
export type AlmacenClaveValor = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function almacenPredeterminado(): AlmacenClaveValor | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

/** Cabecera guardada, o `null` si no hay (o si no tiene forma de cabecera Basic). */
export function leerAutorizacion(almacen: AlmacenClaveValor | null = almacenPredeterminado()): string | null {
  try {
    const valor = almacen?.getItem(CLAVE_SESION) ?? null
    return valor && /^Basic [A-Za-z0-9+/]+={0,2}$/.test(valor) ? valor : null
  } catch {
    return null
  }
}

/** Guarda la cabecera. Devuelve `false` si no se pudo (la sesión seguirá solo en memoria). */
export function guardarAutorizacion(valor: string, almacen: AlmacenClaveValor | null = almacenPredeterminado()): boolean {
  try {
    if (!almacen) return false
    almacen.setItem(CLAVE_SESION, valor)
    return true
  } catch {
    return false
  }
}

export function borrarAutorizacion(almacen: AlmacenClaveValor | null = almacenPredeterminado()): void {
  try {
    almacen?.removeItem(CLAVE_SESION)
  } catch {
    /* nada que borrar */
  }
}
