/** Nombres de `view-transition-name`: un elemento con el mismo nombre en dos vistas se transforma de una a otra. */
export const nombresTransicion = {
  cabecera: "cabecera",
  encabezado: "encabezado",
  lentePestanas: "lente-pestanas",
  panel: "panel",
} as const;

/** Fila de lista que crece hasta ser su panel (el panel usa `panelDe` con el mismo id). */
export function fila(id: string | number): string {
  return `fila-${id}`;
}

/** Panel o ficha al que se transforma la fila o la tarjeta con ese id. */
export function panel(id: string | number): string {
  return fila(id);
}

/** Atributo `style` listo para el elemento: `<li style={estiloTransicion(fila(id))}>`. */
export function estiloTransicion(nombre: string): {
  viewTransitionName: string;
} {
  return { viewTransitionName: nombre };
}
