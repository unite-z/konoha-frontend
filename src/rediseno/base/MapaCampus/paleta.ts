/** Colores del mapa leídos de las variables CSS `--mapa-*` en tiempo de ejecución (AV-413) y aviso de cambio de tema. */

export const CLAVES_PALETA = ['fondo', 'isla', 'cesped', 'tinta', 'verde', 'pared', 'arbol', 'sel'] as const
export type ClavePaleta = (typeof CLAVES_PALETA)[number]
export type Paleta = Record<ClavePaleta, string>

/** Valor de cada `--mapa-*` aplicado ahora mismo a `elemento`. Vacío si el token no existe. */
export function leerPaleta(elemento: Element = document.documentElement): Paleta {
  const estilo = getComputedStyle(elemento)
  const paleta = {} as Paleta
  for (const clave of CLAVES_PALETA) paleta[clave] = estilo.getPropertyValue(`--mapa-${clave}`).trim()
  return paleta
}

/** Llama a `alCambiar` cuando cambia `data-tema` (o el acento) de `<html>`. Devuelve la función que deja de observar. */
export function observarTema(alCambiar: () => void): () => void {
  const observador = new MutationObserver(alCambiar)
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema', 'data-acento'] })
  return () => observador.disconnect()
}

/** Valor de un token CSS cualquiera (`--color-success`…) aplicado ahora mismo. Vacío si no existe. */
export function leerToken(token: string, elemento: Element = document.documentElement): string {
  return getComputedStyle(elemento).getPropertyValue(token).trim()
}
