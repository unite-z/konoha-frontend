/**
 * Nombres de `view-transition-name`: un elemento con el mismo nombre en dos vistas se transforma de
 * una a otra. Cada nombre tiene que ser único en la página en cada momento; con dos elementos
 * iguales el navegador salta la transición.
 */
export const nombresTransicion = {
  cabecera: 'cabecera',
  encabezado: 'encabezado',
  lentePestanas: 'lente-pestanas',
  panel: 'panel',
} as const

/** Fila de lista o tarjeta que crece hasta ser su panel o ficha (que usa `panel` con el mismo id). */
export function fila(id: string | number): string {
  // Un id con espacios, puntos o barras no es un identificador CSS válido y anularía el nombre.
  return `fila-${String(id).replace(/[^\w-]/g, '_')}`
}

/** Panel o ficha al que se transforma la fila o la tarjeta con ese id. */
export function panel(id: string | number): string {
  return fila(id)
}

/**
 * Atributo `style` para el elemento: `<li style={estiloTransicion(fila(id))}>`. comprobar-estilos.sh
 * exige el comentario `estilo-calculado` en esa misma línea.
 */
export function estiloTransicion(nombre: string): {
  viewTransitionName: string
} {
  return { viewTransitionName: nombre }
}
