/**
 * AV-274: si el inventario de MOD-02 no tiene áreas verdes activas, el catálogo de registro llega sin espacios y
 * el selector «Espacio» se queda vacío. En vez de un desplegable vacío, se bloquea con el motivo y qué hacer.
 */
export const MOTIVO_SIN_ESPACIOS =
  'No hay áreas verdes en el inventario. Pide que las den de alta en Inventario de áreas para poder registrar incidencias'

/** Motivo de bloqueo del selector «Espacio»: solo cuando el catálogo ya cargó y no trae ningún espacio. */
export function motivoSinEspacios(espacios: readonly unknown[] | undefined): string | undefined {
  return espacios !== undefined && espacios.length === 0 ? MOTIVO_SIN_ESPACIOS : undefined
}
