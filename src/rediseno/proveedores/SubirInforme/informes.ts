/** Informe de la lista de «Subir informe» (RD-56): la atención a la que se asocia y su propuesta de extracción, si ya la hay. */
export interface InformeEnCola {
  clave: string
  atencionId: number
  extraccionId: number | null
  /** Sube al registrar en bloque: la revisión abierta vuelve a leer la propuesta. */
  version: number
}

let contador = 0

export function nuevoInforme(atencionId: number): InformeEnCola {
  contador += 1
  return { clave: `informe-${contador}`, atencionId, extraccionId: null, version: 0 }
}

const ENTERO = /^[1-9]\d{0,8}$/

/** `?atencion_id=<id>` válido o `null`. */
export function leerAtencionId(valor: string | null): number | null {
  const texto = valor?.trim() ?? ''
  return ENTERO.test(texto) ? Number(texto) : null
}
