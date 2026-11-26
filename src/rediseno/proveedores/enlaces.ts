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

/** Claves de la bandeja de atenciones en la URL (las de RD-85: `desde`, `hasta` y `area_verde_id`). */
export type ParametroAtenciones =
  | 'q'
  | 'estado'
  | 'origen'
  | 'clase'
  | 'contrato_id'
  | 'desde'
  | 'hasta'
  | 'area_verde_id'
  | 'pagina'

/** Pestaña «Atenciones»: la bandeja con sus filtros en la URL. */
export function rutaAtenciones(filtros: Partial<Record<ParametroAtenciones, string>> = {}): string {
  const consulta = new URLSearchParams()
  for (const [clave, valor] of Object.entries(filtros)) if (valor) consulta.set(clave, valor)
  const texto = consulta.toString()
  const base = `${RUTA_PROVEEDORES}/${SEGMENTO_ATENCIONES}`
  return texto ? `${base}?${texto}` : base
}

export const SEGMENTO_INFORMES = 'informes'
export const SEGMENTO_SUBIR_INFORME = 'subir'

/** Subir un informe (lo construye RD-56; hasta entonces lleva a «En construcción»), con o sin atención de origen. */
export function rutaSubirInforme(atencionId?: number): string {
  const base = `${RUTA_PROVEEDORES}/${SEGMENTO_INFORMES}/${SEGMENTO_SUBIR_INFORME}`
  return atencionId === undefined ? base : `${base}?atencion_id=${atencionId}`
}
