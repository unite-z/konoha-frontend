/**
 * Datos ficticios de RF-IA-006 (solo con `VITE_DATOS_SIMULADOS=true`): ejemplares, atenciones especiales, el catálogo
 * de plagas y las hipótesis que daría la IA según la especie. Sin datos personales reales ni imágenes en el repo.
 */
import type {
  AtencionBuscable,
  ContenidoEvidencia,
  EjemplarEvidencia,
  HipotesisFitosanitaria,
  PlagaCatalogo,
} from '@/types/evidenciaFitosanitariaIa'
import { hoyLima } from '@/utils/instanteLima'

export function haceDias(dias: number): string {
  const [anio, mes, dia] = hoyLima().split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia - dias)).toISOString().slice(0, 10)
}

export const EJEMPLARES: EjemplarEvidencia[] = [
  { id: 412, codigo: 'EJ-00412', especie: 'Ficus', espacio: 'Jardín Central' },
  { id: 519, codigo: 'EJ-00519', especie: 'Palmera real', espacio: 'Explanada de Ciencias' },
  { id: 630, codigo: 'EJ-00630', especie: null, espacio: 'Bosque de Ficus' },
  { id: 711, codigo: 'EJ-00711', especie: 'Ficus', espacio: 'Plaza de Letras' },
]

export const ATENCIONES: AtencionBuscable[] = [
  { id: 41, ejemplar: EJEMPLARES[0], plaga: 'Queresa' },
  { id: 52, ejemplar: EJEMPLARES[1], plaga: 'Picudo rojo' },
]

export const PLAGAS: PlagaCatalogo[] = [
  { id: 1, nombre: 'Queresa' },
  { id: 2, nombre: 'Fumagina' },
  { id: 3, nombre: 'Picudo rojo' },
  { id: 4, nombre: 'Pulgón' },
  { id: 5, nombre: 'Mosca blanca' },
  { id: 6, nombre: 'Oídio' },
  { id: 7, nombre: 'Cochinilla' },
]

const FICUS: HipotesisFitosanitaria[] = [
  {
    clave: 'queresa',
    categoria: 'Plaga',
    nombre: 'Queresa',
    plaga_id: 1,
    confianza: 0.62,
    nivel_confianza: 'Media',
    evidencias: ['Puntos blancos algodonosos en el envés', 'Ramas jóvenes con secreción pegajosa'],
  },
  {
    clave: 'fumagina',
    categoria: 'Enfermedad',
    nombre: 'Fumagina',
    plaga_id: 2,
    confianza: 0.31,
    nivel_confianza: 'Baja',
    evidencias: ['Hojas con hollín negro'],
  },
]

const PALMERA: HipotesisFitosanitaria[] = [
  {
    clave: 'estres-hidrico',
    categoria: 'EstresHidrico',
    nombre: 'Estrés hídrico',
    plaga_id: null,
    confianza: 0.48,
    nivel_confianza: 'Media',
    evidencias: ['Amarillamiento de las hojas basales', 'Puntas secas en las hojas bajas'],
  },
  {
    clave: 'picudo-rojo',
    categoria: 'Plaga',
    nombre: 'Picudo rojo',
    plaga_id: 3,
    confianza: null,
    nivel_confianza: 'Incierta',
    evidencias: ['Hojas centrales caídas', 'Posibles orificios en la base de las hojas (poco visibles en la foto)'],
  },
]

const SIN_ESPECIE: HipotesisFitosanitaria[] = [
  {
    clave: 'deficiencia',
    categoria: 'DeficienciaNutricional',
    nombre: 'Clorosis',
    plaga_id: null,
    confianza: 0.35,
    nivel_confianza: 'Baja',
    evidencias: ['Hojas amarillas con nervaduras verdes'],
  },
  {
    clave: 'dano-mecanico',
    categoria: 'DanoMecanico',
    nombre: 'Corteza dañada',
    plaga_id: null,
    confianza: null,
    nivel_confianza: 'Incierta',
    evidencias: ['Herida en la base del tronco'],
  },
]

/** Hipótesis según la especie del ejemplar. */
export function hipotesisPara(especie: string | null): HipotesisFitosanitaria[] {
  if (especie === 'Ficus') return FICUS
  if (especie === 'Palmera real') return PALMERA
  return SIN_ESPECIE
}

/** Metadatos de la IA de un análisis simulado. */
export function metadatos(
  ejemplar: EjemplarEvidencia | null,
  sintomas: string | null,
  nFotos: number,
  opciones: { calidad: boolean; forzarParcial: boolean },
  ahora: string,
): Omit<ContenidoEvidencia, 'version_contenido' | 'origen' | 'ejemplar' | 'atencion' | 'sintomas' | 'fotografias' | 'hipotesis' | 'validacion' | 'validada_por'> {
  const sinEspecie = ejemplar?.especie == null
  const parcial = opciones.forzarParcial || !sintomas
  return {
    ia: { proveedor: 'Simulado', modelo: 'demo-fitosanitario', solicitado_en: ahora, duracion_ms: 3400 },
    calidad_suficiente: opciones.calidad,
    contexto_reducido: sinEspecie,
    suficiencia: !opciones.calidad ? 'insuficiente' : parcial ? 'parcial' : 'suficiente',
    faltantes: !opciones.calidad ? ['Fotografías nítidas en las que la planta ocupe buena parte de la imagen'] : parcial ? ['Sin síntomas descritos ni historial sanitario'] : [],
    datos_utilizados: [
      nFotos === 1 ? '1 fotografía' : `${nFotos} fotografías`,
      ...(ejemplar ? [`Ejemplar ${ejemplar.codigo}${ejemplar.especie ? `, ${ejemplar.especie}` : ''}`] : []),
      ...(ejemplar?.espacio ? [`Ubicación: ${ejemplar.espacio}`] : []),
      ...(sintomas ? ['Síntomas observados'] : []),
    ],
    limitaciones: [
      ...(sinEspecie ? ['La especie no está identificada: hay menos contexto'] : []),
      'Solo se analizan las fotografías: la IA no ve el interior del tronco ni las raíces',
      'Son hipótesis: no es un diagnóstico ni indica un tratamiento',
    ],
    explicacion: opciones.calidad
      ? 'Se comparan los síntomas visibles en las fotografías con afectaciones frecuentes de la especie y de la zona.'
      : 'Las fotografías no permiten distinguir los síntomas. Sube otras más nítidas o registra una evaluación manual.',
  }
}
