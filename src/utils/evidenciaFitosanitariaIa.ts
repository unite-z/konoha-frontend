/**
 * Lógica pura de RF-IA-006 (análisis de evidencia fitosanitaria con IA): validación de las fotografías, el FormData
 * del envío, el orden y el texto de la confianza de las hipótesis, y la validación técnica. Las hipótesis nunca se
 * registran solas como diagnóstico, y nada de esto indica un tratamiento.
 */
import type {
  CategoriaAfectacion,
  ContenidoEvidencia,
  CuerpoValidacionEvidencia,
  DatosSolicitudEvidencia,
  HipotesisFitosanitaria,
  NivelConfianzaIA,
  ValidacionEvidencia,
} from '../types/evidenciaFitosanitariaIa'
import type { EstadoSugerencia } from '../types/ia'

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'] as const
/** Valor de `accept`: con `image/*` el móvil ofrece la cámara; los tipos se validan después. */
export const ACEPTA_IMAGENES = 'image/*,.jpg,.jpeg,.png,.webp'
export const MAX_FOTOGRAFIAS = 5
export const MAX_MB_FOTOGRAFIA = 10
const MAX_BYTES = MAX_MB_FOTOGRAFIA * 1024 * 1024
export const AYUDA_FOTOGRAFIAS = `De 1 a ${MAX_FOTOGRAFIAS} imágenes JPG, PNG o WEBP, de hasta ${MAX_MB_FOTOGRAFIA} MB cada una`

/** Separa las imágenes admitidas de las que no, con un mensaje por cada rechazo. `yaElegidas` cuenta para el máximo. */
export function validarArchivosImagen(archivos: File[], yaElegidas = 0): { aceptados: File[]; errores: string[] } {
  const aceptados: File[] = []
  const errores: string[] = []
  for (const archivo of archivos) {
    if (!(TIPOS_IMAGEN as readonly string[]).includes(archivo.type)) errores.push(`${archivo.name}: usa una imagen JPG, PNG o WEBP`)
    else if (archivo.size > MAX_BYTES) errores.push(`${archivo.name}: supera los ${MAX_MB_FOTOGRAFIA} MB`)
    else if (yaElegidas + aceptados.length >= MAX_FOTOGRAFIAS) errores.push(`${archivo.name}: solo se admiten ${MAX_FOTOGRAFIAS} fotografías`)
    else aceptados.push(archivo)
  }
  return { aceptados, errores }
}

/** Cuerpo multipart: la parte `datos` en JSON (sin campos vacíos) y una parte `fotografias` por archivo. */
export function formularioEvidencia(datos: DatosSolicitudEvidencia, archivos: File[]): FormData {
  const limpio: DatosSolicitudEvidencia = {
    ...(datos.ejemplar_id ? { ejemplar_id: datos.ejemplar_id } : {}),
    ...(datos.atencion_id ? { atencion_id: datos.atencion_id } : {}),
    ...(datos.sintomas?.trim() ? { sintomas: datos.sintomas.trim() } : {}),
    ...(datos.archivo_ids?.length ? { archivo_ids: datos.archivo_ids } : {}),
  }
  const formulario = new FormData()
  formulario.set('datos', JSON.stringify(limpio))
  for (const archivo of archivos) formulario.append('fotografias', archivo, archivo.name)
  return formulario
}

export const ETIQUETA_CATEGORIA: Record<CategoriaAfectacion, string> = {
  Plaga: 'Plaga',
  Enfermedad: 'Enfermedad',
  DanoMecanico: 'Daño mecánico',
  EstresHidrico: 'Estrés hídrico',
  DeficienciaNutricional: 'Deficiencia nutricional',
  Otra: 'Otra',
}
export const CATEGORIAS = Object.keys(ETIQUETA_CATEGORIA) as CategoriaAfectacion[]

const ORDEN_NIVEL: Record<NivelConfianzaIA, number> = { Alta: 0, Media: 1, Baja: 2, Incierta: 3 }

/** Por confianza (de mayor a menor), con las inciertas (`null`) al final. No modifica la lista recibida. */
export function ordenarHipotesis(hipotesis: readonly HipotesisFitosanitaria[]): HipotesisFitosanitaria[] {
  return [...hipotesis].sort((a, b) => {
    if (a.confianza === null || b.confianza === null) {
      if (a.confianza !== b.confianza) return a.confianza === null ? 1 : -1
      return ORDEN_NIVEL[a.nivel_confianza] - ORDEN_NIVEL[b.nivel_confianza]
    }
    return b.confianza - a.confianza
  })
}

/** «Media · 62 %», o «Incierta» si la IA no da un valor. */
export function textoConfianza(h: Pick<HipotesisFitosanitaria, 'confianza' | 'nivel_confianza'>): string {
  if (h.confianza === null) return 'Incierta'
  return `${h.nivel_confianza} · ${Math.round(h.confianza * 100)} %`
}

/** «Queresa · Media» para la lista, «Calidad insuficiente» o «Sin hipótesis». */
export function hipotesisPrincipal(contenido: Pick<ContenidoEvidencia, 'origen' | 'calidad_suficiente' | 'hipotesis'>): string {
  if (contenido.origen === 'manual') return 'Evaluación manual'
  if (!contenido.calidad_suficiente) return 'Calidad insuficiente'
  const primera = ordenarHipotesis(contenido.hipotesis)[0]
  return primera ? `${primera.nombre} · ${primera.nivel_confianza}` : 'Sin hipótesis'
}

/** Opción elegida en «Tu validación técnica». */
export type OpcionValidacion = `hipotesis:${string}` | 'otra' | 'no-concluyente'

export interface FormularioValidacion {
  opcion: OpcionValidacion | null
  categoria: CategoriaAfectacion | null
  plaga_id: number | null
  /** Plaga o afectación concreta (del catálogo o escrita). */
  nombre: string
  comentario: string
}

export const FORMULARIO_VACIO: FormularioValidacion = { opcion: null, categoria: null, plaga_id: null, nombre: '', comentario: '' }

export const opcionHipotesis = (clave: string): OpcionValidacion => `hipotesis:${clave}`

export interface ErroresValidacion {
  opcion?: string
  categoria?: string
}

/**
 * Cuerpo de `validar/` según la opción (limpia los campos que no aplican), o los errores si falta algo. «Registrar
 * otra categoría» exige la categoría; la plaga o afectación concreta es opcional.
 */
export function cuerpoValidacion(
  formulario: FormularioValidacion,
  hipotesis: readonly HipotesisFitosanitaria[],
): { cuerpo: CuerpoValidacionEvidencia | null; errores: ErroresValidacion } {
  const comentario = formulario.comentario.trim() || null
  const vacio = { cuerpo: null }
  if (!formulario.opcion) return { ...vacio, errores: { opcion: 'Elige una hipótesis, otra categoría o «No es posible concluir»' } }
  if (formulario.opcion === 'no-concluyente') {
    return { cuerpo: { resultado: 'NoConcluyente', hipotesis_clave: null, categoria: null, plaga_id: null, nombre: null, comentario }, errores: {} }
  }
  if (formulario.opcion === 'otra') {
    if (!formulario.categoria) return { ...vacio, errores: { categoria: 'Elige la categoría de afectación' } }
    const nombre = formulario.nombre.trim() || null
    return {
      cuerpo: { resultado: 'OtraCategoria', hipotesis_clave: null, categoria: formulario.categoria, plaga_id: formulario.plaga_id, nombre, comentario },
      errores: {},
    }
  }
  const clave = formulario.opcion.slice('hipotesis:'.length)
  const elegida = hipotesis.find((h) => h.clave === clave)
  if (!elegida) return { ...vacio, errores: { opcion: 'La hipótesis elegida ya no está disponible' } }
  return {
    cuerpo: { resultado: 'Confirmada', hipotesis_clave: elegida.clave, categoria: elegida.categoria, plaga_id: elegida.plaga_id, nombre: elegida.nombre, comentario },
    errores: {},
  }
}

/** «Confirmada: Queresa», «Otra categoría: Plaga · Pulgón» o «Pendiente de diagnóstico». */
export function textoResultado(validacion: Pick<ValidacionEvidencia, 'resultado' | 'categoria' | 'nombre'>): string {
  if (validacion.resultado === 'NoConcluyente') return 'Pendiente de diagnóstico'
  const detalle = [validacion.categoria && ETIQUETA_CATEGORIA[validacion.categoria], validacion.nombre].filter(Boolean)
  if (validacion.resultado === 'Confirmada') return `Confirmada: ${validacion.nombre ?? detalle.join(' · ')}`
  return `Otra categoría: ${detalle.join(' · ')}`
}

/** Estado del análisis con el componente `Estado`. «No es posible concluir» queda como pendiente de diagnóstico. */
export function estadoEvidencia(
  estado: EstadoSugerencia,
  validacion: Pick<ValidacionEvidencia, 'resultado'> | null,
): { tono: 'aviso' | 'exito' | 'neutro' | 'info'; texto: string } {
  if (estado === 'Rechazada') return { tono: 'neutro', texto: 'Descartado' }
  if (estado === 'Validada') return validacion?.resultado === 'NoConcluyente' ? { tono: 'info', texto: 'Pendiente de diagnóstico' } : { tono: 'exito', texto: 'Validado' }
  return { tono: 'aviso', texto: 'Pendiente de validación' }
}

/** «EJ-00412 · Ficus» o «Atención AE-0041». */
export function tituloEvidencia(c: Pick<ContenidoEvidencia, 'ejemplar' | 'atencion'>): string {
  if (c.ejemplar) return `${c.ejemplar.codigo} · ${c.ejemplar.especie ?? 'especie no identificada'}`
  return c.atencion ? `Atención ${c.atencion.codigo}` : 'Análisis de evidencia'
}
