import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_PROVEEDORES = 'proveedores'
export const RUTA_PROVEEDORES = `${PREFIJO_REDISENO}/${SEGMENTO_PROVEEDORES}`

/** Parámetro de la URL que abre el panel de un contrato (`?contrato=12`) o el de alta (`?contrato=nuevo`). */
export const PARAM_CONTRATO = 'contrato'
export const VALOR_CONTRATO_NUEVO = 'nuevo'
/** Con `?contrato=12&editar=1` el panel del contrato está en edición. */
export const PARAM_EDITAR = 'editar'

export const SEGMENTO_ATENCIONES = 'atenciones'

export function rutaProveedores(): string {
  return RUTA_PROVEEDORES
}

/** Lista de contratos con sus filtros en la URL (`q`, `vigencia`, `pagina`). */
export function rutaContratos(filtros: { q?: string; vigencia?: string; pagina?: number } = {}): string {
  const consulta = new URLSearchParams()
  if (filtros.q) consulta.set('q', filtros.q)
  if (filtros.vigencia) consulta.set('vigencia', filtros.vigencia)
  if (filtros.pagina && filtros.pagina > 1) consulta.set('pagina', String(filtros.pagina))
  const texto = consulta.toString()
  return texto ? `${RUTA_PROVEEDORES}?${texto}` : RUTA_PROVEEDORES
}

/** Lista con el panel del contrato abierto. */
export function rutaContrato(id: number): string {
  return `${RUTA_PROVEEDORES}?${PARAM_CONTRATO}=${id}`
}

/** Lista con el panel de alta de contrato abierto. */
export function rutaNuevoContrato(): string {
  return `${RUTA_PROVEEDORES}?${PARAM_CONTRATO}=${VALOR_CONTRATO_NUEVO}`
}

/** Ficha de una atención (la construye RD-53; hasta entonces lleva a «En construcción»). */
export function rutaAtencion(id: number): string {
  return `${RUTA_PROVEEDORES}/${SEGMENTO_ATENCIONES}/${id}`
}
