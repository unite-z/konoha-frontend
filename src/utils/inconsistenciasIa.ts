/**
 * Lógica pura de RF-IA-002 (revisión de inconsistencias con IA): textos e insignias de los hallazgos, la comparación
 * lado a lado de los registros, los recuentos de los filtros y el enlace de cada registro a su módulo.
 * La IA solo señala posibles problemas: nada de aquí modifica registros.
 */
import type { NombreIcono } from '../components/ui/Icono'
import type { Tono } from '../components/ui/tonos'
import { rutaDetalleAtencion, RUTAS_INVENTARIO, RUTAS_TERCERIZADOS } from '../router/rutasApp'
import type { EstadoSugerencia } from '../types/ia'
import type {
  ConjuntoDatos,
  ContenidoInconsistencia,
  FiltrosInconsistencias,
  NivelConfianza,
  RegistroImplicado,
  SugerenciaInconsistencia,
  TipoHallazgo,
} from '../types/inconsistenciasIa'
import { SIN_VALOR } from './formato'

export const ETIQUETA_TIPO_HALLAZGO: Record<TipoHallazgo, string> = {
  Duplicado: 'Posible duplicado',
  ValorAtipico: 'Valor atípico',
  CamposIncompatibles: 'Campos incompatibles',
  NombreNoNormalizado: 'Nombre no normalizado',
}

const TONO_TIPO_HALLAZGO: Record<TipoHallazgo, Tono> = {
  Duplicado: 'advertencia',
  ValorAtipico: 'info',
  CamposIncompatibles: 'advertencia',
  NombreNoNormalizado: 'neutral',
}

export const TIPOS_HALLAZGO = Object.keys(ETIQUETA_TIPO_HALLAZGO) as TipoHallazgo[]

/** Insignia del tipo de hallazgo (siempre con texto). */
export function insigniaTipoHallazgo(tipo: TipoHallazgo): { texto: string; tono: Tono } {
  return { texto: ETIQUETA_TIPO_HALLAZGO[tipo], tono: TONO_TIPO_HALLAZGO[tipo] }
}

export const ETIQUETA_CONJUNTO: Record<ConjuntoDatos, string> = {
  Atenciones: 'Atenciones',
  Ejemplares: 'Ejemplares',
  AreasVerdes: 'Áreas verdes',
  Proveedores: 'Proveedores',
}

export const CONJUNTOS = Object.keys(ETIQUETA_CONJUNTO) as ConjuntoDatos[]

const CONFIANZA: Record<NivelConfianza, { texto: string; tono: Tono; icono?: NombreIcono }> = {
  Alta: { texto: 'Confianza alta', tono: 'info' },
  Media: { texto: 'Confianza media', tono: 'neutral' },
  Baja: { texto: 'Confianza baja', tono: 'advertencia' },
}

export function insigniaConfianza(confianza: NivelConfianza): { texto: string; tono: Tono; icono?: NombreIcono } {
  return CONFIANZA[confianza]
}

/** Estados de un hallazgo con los textos de esta bandeja: aceptar = validar; descartar = rechazar. */
export const ESTADOS_HALLAZGO: readonly { valor: EstadoSugerencia; texto: string; plural: string; tono: Tono }[] = [
  { valor: 'Propuesta', texto: 'Pendiente de revisión', plural: 'Pendientes de revisión', tono: 'advertencia' },
  { valor: 'Validada', texto: 'Aceptada', plural: 'Aceptadas', tono: 'exito' },
  { valor: 'Rechazada', texto: 'Descartada', plural: 'Descartadas', tono: 'neutral' },
]

export function insigniaEstadoHallazgo(estado: EstadoSugerencia): { texto: string; tono: Tono } {
  const encontrado = ESTADOS_HALLAZGO.find((e) => e.valor === estado)
  return { texto: encontrado?.texto ?? estado, tono: encontrado?.tono ?? 'neutral' }
}

/** «Campo: valor», solo el valor, o `SIN_VALOR` (criterio 1: el dato observado). */
export function textoDatoObservado(contenido: Pick<ContenidoInconsistencia, 'campo_observado' | 'valor_observado'>): string {
  const { campo_observado: campo, valor_observado: valor } = contenido
  if (campo && valor) return `${campo}: ${valor}`
  return valor ?? campo ?? SIN_VALOR
}

/** Una fila de la comparación lado a lado: un campo con el valor de cada registro. */
export interface FilaComparacion {
  campo: string
  valores: (string | null)[]
  /** `true` si algún registro tiene un valor distinto (se marca con texto, nunca solo con color). */
  distinto: boolean
}

/** Filas campo × registro, en el orden en que aparecen los campos. */
export function filasComparacion(registros: RegistroImplicado[]): FilaComparacion[] {
  const campos: string[] = []
  for (const r of registros) for (const campo of Object.keys(r.campos)) if (!campos.includes(campo)) campos.push(campo)
  return campos.map((campo) => {
    const valores = registros.map((r) => r.campos[campo] ?? null)
    const normalizados = new Set(valores.map((v) => (v ?? '').trim()))
    return { campo, valores, distinto: normalizados.size > 1 }
  })
}

/** Recuento de sugerencias por estado. */
export function contarPorEstado(sugerencias: SugerenciaInconsistencia[]): Record<EstadoSugerencia, number> {
  const cuenta: Record<EstadoSugerencia, number> = { Propuesta: 0, Validada: 0, Rechazada: 0 }
  for (const s of sugerencias) cuenta[s.estado] += 1
  return cuenta
}

/** Recuento de sugerencias por tipo de hallazgo. */
export function contarPorTipo(sugerencias: SugerenciaInconsistencia[]): Record<TipoHallazgo, number> {
  const cuenta: Record<TipoHallazgo, number> = { Duplicado: 0, ValorAtipico: 0, CamposIncompatibles: 0, NombreNoNormalizado: 0 }
  for (const s of sugerencias) cuenta[s.contenido.tipo_hallazgo] += 1
  return cuenta
}

/**
 * Enlace del registro a su módulo: la atención tiene ficha propia; ejemplares, áreas verdes y proveedores solo
 * tienen su listado («Buscar en …»). `null` si la entidad no tiene pantalla.
 */
export function rutaRegistro(registro: Pick<RegistroImplicado, 'entidad' | 'registro_id'>): { ruta: string; texto: string } | null {
  switch (registro.entidad) {
    case 'atencion':
      return { ruta: rutaDetalleAtencion(registro.registro_id), texto: 'Abrir la atención' }
    case 'ejemplar':
      // TODO: enlazar a la ficha del ejemplar cuando Áreas verdes (MOD-02) la tenga.
      return { ruta: RUTAS_INVENTARIO.ejemplares, texto: 'Buscar en Ejemplares' }
    case 'area_verde':
      return { ruta: RUTAS_INVENTARIO.areasVerdes, texto: 'Buscar en Áreas verdes' }
    case 'proveedor':
      return { ruta: RUTAS_TERCERIZADOS.proveedoresContratos, texto: 'Buscar en Proveedores y contratos' }
    default:
      return null
  }
}

/** Filtros válidos de la URL para la API (los desconocidos se ignoran). */
export function filtrosDesdeUrl(url: { estado: string; tipo: string; conjunto: string; page: string }): FiltrosInconsistencias {
  const pagina = Math.max(1, Number(url.page) || 1)
  return {
    estado: ESTADOS_HALLAZGO.find((e) => e.valor === url.estado)?.valor,
    tipo_hallazgo: TIPOS_HALLAZGO.find((t) => t === url.tipo),
    conjunto: CONJUNTOS.find((c) => c === url.conjunto),
    page: pagina,
  }
}
