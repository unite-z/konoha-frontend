/**
 * Cómo se nombra un ejemplar en pantalla: «Robertito (EJ-00733)» si tiene alias y solo el código si
 * no lo tiene.
 */
export function nombreEjemplar(codigo: string, alias?: string | null): string {
  const nombre = alias?.trim()
  return nombre ? `${nombre} (${codigo})` : codigo
}
