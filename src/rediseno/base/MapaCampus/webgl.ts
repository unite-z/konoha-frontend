/** Detección de WebGL sin cargar Three.js (el envoltorio decide si merece la pena importar la escena). */
export function hayWebGL(): boolean {
  try {
    const lienzo = document.createElement('canvas')
    return Boolean(lienzo.getContext('webgl2') ?? lienzo.getContext('webgl'))
  } catch {
    return false
  }
}
