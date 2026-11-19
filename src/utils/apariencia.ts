/**
 * Apariencia elegida por el usuario en Configuración (AV-389): tema y color de acento. Es una preferencia de este
 * navegador (no sale del dispositivo) y se aplica como atributos de `<html>`, que `tokens.css` traduce a colores:
 * `data-tema="oscuro" | "calido"` y `data-acento="<nombre>"`. Sin atributos, el tema claro con el azul institucional.
 */

export type Tema = 'claro' | 'calido' | 'oscuro' | 'sistema'
export type Acento = 'institucional' | 'azul' | 'verde' | 'morado' | 'magenta'

export interface Apariencia {
  tema: Tema
  acento: Acento
}

export const APARIENCIA_INICIAL: Apariencia = { tema: 'claro', acento: 'institucional' }

export const TEMAS: readonly Tema[] = ['claro', 'calido', 'oscuro', 'sistema']
export const ACENTOS: readonly Acento[] = ['institucional', 'azul', 'verde', 'morado', 'magenta']

const CLAVE = 'av:apariencia'
const CONSULTA_OSCURO = '(prefers-color-scheme: dark)'

/** La preferencia guardada; si no hay, o no se puede leer (modo privado, datos borrados), la inicial. */
export function leerApariencia(almacen: Pick<Storage, 'getItem'> | null = almacenLocal()): Apariencia {
  try {
    const crudo = almacen?.getItem(CLAVE)
    if (!crudo) return APARIENCIA_INICIAL
    const valor = JSON.parse(crudo) as Partial<Apariencia>
    return {
      tema: TEMAS.includes(valor.tema as Tema) ? (valor.tema as Tema) : APARIENCIA_INICIAL.tema,
      acento: ACENTOS.includes(valor.acento as Acento) ? (valor.acento as Acento) : APARIENCIA_INICIAL.acento,
    }
  } catch {
    return APARIENCIA_INICIAL
  }
}

export function guardarApariencia(apariencia: Apariencia, almacen: Pick<Storage, 'setItem'> | null = almacenLocal()) {
  try {
    almacen?.setItem(CLAVE, JSON.stringify(apariencia))
  } catch {
    // Sin almacenamiento: se aplica igual, solo que no se recuerda.
  }
}

/** Pone los atributos de `<html>`. Con «según el sistema», oscuro si el sistema lo prefiere. */
export function aplicarApariencia(apariencia: Apariencia, raiz: HTMLElement, sistemaOscuro: boolean) {
  const oscuro = apariencia.tema === 'oscuro' || (apariencia.tema === 'sistema' && sistemaOscuro)
  if (oscuro) raiz.dataset.tema = 'oscuro'
  else if (apariencia.tema === 'calido') raiz.dataset.tema = 'calido'
  else delete raiz.dataset.tema
  if (apariencia.acento === 'institucional') delete raiz.dataset.acento
  else raiz.dataset.acento = apariencia.acento
}

/** Aplica y recuerda una apariencia nueva (desde Configuración). */
export function cambiarApariencia(apariencia: Apariencia) {
  guardarApariencia(apariencia)
  aplicarApariencia(apariencia, document.documentElement, sistemaPrefiereOscuro())
}

/**
 * Al arrancar, antes de pintar: aplica la guardada y, con «según el sistema», sigue los cambios del sistema
 * (por ejemplo, el modo oscuro automático al anochecer).
 */
export function instalarApariencia() {
  aplicarApariencia(leerApariencia(), document.documentElement, sistemaPrefiereOscuro())
  window.matchMedia?.(CONSULTA_OSCURO).addEventListener?.('change', (evento) => {
    aplicarApariencia(leerApariencia(), document.documentElement, evento.matches)
  })
}

function sistemaPrefiereOscuro(): boolean {
  return window.matchMedia?.(CONSULTA_OSCURO).matches ?? false
}

function almacenLocal(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
