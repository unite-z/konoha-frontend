/**
 * AV-367: tras un despliegue, una pestaña abierta con la versión anterior pide chunks que ya no existen y la
 * importación dinámica falla. Vite avisa con `vite:preloadError`: se recarga la página una sola vez para traer la
 * versión nueva. Si vuelve a fallar enseguida, no se recarga otra vez (sin bucles) y el error llega a la pantalla.
 */
export const MARCA_RECARGA = 'av:recarga-tras-despliegue'

/** Tiempo tras una recarga en el que otro fallo ya no recarga (evita el bucle si el chunk falta de verdad). */
export const VENTANA_SIN_RECARGA_MS = 60_000

interface Almacen {
  getItem(clave: string): string | null
  setItem(clave: string, valor: string): void
}

/** Decide si un fallo de carga de chunk debe recargar la página y deja la marca si es así. */
export function debeRecargar(almacen: Almacen, ahora: number = Date.now()): boolean {
  let ultima = Number.NaN
  try {
    ultima = Number(almacen.getItem(MARCA_RECARGA))
  } catch {
    return false // sin sessionStorage no hay forma de evitar el bucle: que lo vea la persona
  }
  if (Number.isFinite(ultima) && ultima > 0 && ahora - ultima < VENTANA_SIN_RECARGA_MS) return false
  try {
    almacen.setItem(MARCA_RECARGA, String(ahora))
  } catch {
    return false
  }
  return true
}

/** Escucha `vite:preloadError` y recarga una sola vez. Se llama una vez al arrancar la aplicación. */
export function instalarRecargaTrasDespliegue(ventana: Window = window): void {
  ventana.addEventListener('vite:preloadError', (evento) => {
    if (!debeRecargar(ventana.sessionStorage)) return
    evento.preventDefault() // el error no llega a la pantalla: se recarga
    ventana.location.reload()
  })
}
