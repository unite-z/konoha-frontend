import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_CAMPO = 'campo'
export const RUTA_CAMPO = `${PREFIJO_REDISENO}/${SEGMENTO_CAMPO}`
export const SEGMENTO_RUTA_DE_HOY = 'ruta-de-hoy'
export const SEGMENTO_SEMANA = 'semana'
export const SEGMENTO_ENCARGOS = 'encargos'
export const SEGMENTO_INCIDENCIAS = 'incidencias'
export const SEGMENTO_MAS = 'mas'

/** Parámetro de la URL con el jardín cuya hoja «ya está marcado» está abierta. */
export const PARAM_JARDIN = 'jardin'

/** Entrada de campo: lleva a la ruta de hoy. */
export function rutaCampo(): string {
  return RUTA_CAMPO
}

/** Ruta de hoy del capataz (V13). */
export function rutaCampoRutaDeHoy(): string {
  return `${RUTA_CAMPO}/${SEGMENTO_RUTA_DE_HOY}`
}

/** Ruta de hoy con la hoja «ya está marcado» del jardín abierta. */
export function rutaCampoJardin(jardinId: number): string {
  return `${rutaCampoRutaDeHoy()}?${PARAM_JARDIN}=${jardinId}`
}

/** Semana de la cuadrilla, solo lectura (V13). */
export function rutaCampoSemana(): string {
  return `${RUTA_CAMPO}/${SEGMENTO_SEMANA}`
}

/** Encargos del capataz (RD-71). */
export function rutaCampoEncargos(): string {
  return `${RUTA_CAMPO}/${SEGMENTO_ENCARGOS}`
}

/** Reportar y seguir incidencias en el móvil (RD-70, V14). */
export function rutaCampoIncidencias(): string {
  return `${RUTA_CAMPO}/${SEGMENTO_INCIDENCIAS}`
}

/** Menú «Más» del capataz: lo que la barra inferior no enseña. */
export function rutaCampoMas(): string {
  return `${RUTA_CAMPO}/${SEGMENTO_MAS}`
}
