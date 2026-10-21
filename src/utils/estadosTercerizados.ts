/**
 * Presentación de los valores de dominio de MOD-05 (Guía Web 5.6: el badge cambia de texto, no de patrón).
 * Los estados se muestran con el texto exacto del back-end.
 */
import type { Tono } from '../components/ui/Badge'
import type { CategoriaDocumento, EstadoAtencion, OrigenAtencion } from '../types/tercerizados'

/** Orden del ciclo (línea de estados del detalle). */
export const ESTADOS_ATENCION: readonly EstadoAtencion[] = [
  'Requerimiento registrado',
  'OC referenciada',
  'En ejecución',
  'Ejecutado pendiente de reporte',
  'Reporte adjunto',
]

/**
 * Tono de cada estado. «Reporte adjunto» es éxito de la carga, no conformidad (fuera de esta entrega).
 * Neutral en los dos primeros para no confundir programación con éxito (Guía Web, tabla 10).
 */
const TONO_ESTADO: Record<EstadoAtencion, Tono> = {
  'Requerimiento registrado': 'neutral',
  'OC referenciada': 'neutral',
  'En ejecución': 'info',
  'Ejecutado pendiente de reporte': 'advertencia',
  'Reporte adjunto': 'exito',
}

export function insigniaEstado(estado: EstadoAtencion): { texto: string; tono: Tono } {
  return { texto: estado, tono: TONO_ESTADO[estado] ?? 'neutral' }
}

/** Posición del estado en el ciclo (0 a 4); -1 si es desconocido. */
export function indiceEstado(estado: EstadoAtencion): number {
  return ESTADOS_ATENCION.indexOf(estado)
}

const TEXTO_ORIGEN: Record<OrigenAtencion, string> = {
  Demanda: 'Demanda',
  ProgramacionEstacional: 'Programación estacional',
  SolicitudUnidad: 'Solicitud de una unidad',
}

export function textoOrigen(origen: OrigenAtencion): string {
  return TEXTO_ORIGEN[origen] ?? origen
}

export const OPCIONES_ORIGEN: { valor: OrigenAtencion; texto: string }[] = (
  Object.keys(TEXTO_ORIGEN) as OrigenAtencion[]
).map((valor) => ({ valor, texto: TEXTO_ORIGEN[valor] }))

const TEXTO_CATEGORIA: Record<CategoriaDocumento, string> = {
  InformeFinal: 'Informe final',
  Metrado: 'Metrado',
  PlantasAtendidas: 'Plantas atendidas',
  FichasDiarias: 'Fichas diarias',
  CharlasTecnicas: 'Charlas técnicas',
  PlagasAtendidas: 'Plagas atendidas',
  ProductosAplicados: 'Productos aplicados',
  EvidenciaEspacio: 'Evidencia por espacio',
  RutaRecorrida: 'Ruta recorrida',
}

export function textoCategoria(categoria: CategoriaDocumento): string {
  return TEXTO_CATEGORIA[categoria] ?? categoria
}

export const OPCIONES_CATEGORIA: { valor: CategoriaDocumento; texto: string }[] = (
  Object.keys(TEXTO_CATEGORIA) as CategoriaDocumento[]
).map((valor) => ({ valor, texto: TEXTO_CATEGORIA[valor] }))

/** Acuerdo de la unidad: pendiente, de acuerdo o en desacuerdo. */
export function insigniaAcuerdo(acuerdo: boolean | null): { texto: string; tono: Tono } {
  if (acuerdo === null) return { texto: 'Pendiente', tono: 'neutral' }
  return acuerdo ? { texto: 'De acuerdo', tono: 'exito' } : { texto: 'En desacuerdo', tono: 'advertencia' }
}
