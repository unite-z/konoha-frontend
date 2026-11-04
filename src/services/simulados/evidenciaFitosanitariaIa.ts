/**
 * Datos simulados de RF-IA-006 (análisis de evidencia fitosanitaria con IA), solo con `VITE_DATOS_SIMULADOS=true`.
 *
 * - Las fotografías no se envían a ningún sitio: se guardan en memoria (Blob) para mostrar las miniaturas en la
 *   sesión. Las de los análisis precargados no tienen imagen: la pantalla muestra un marcador.
 * - Un almacén en memoria con 3 análisis (1 pendiente, 1 confirmado y 1 no concluyente). Se pierde al recargar.
 * - Validar guarda la validación (estado Validada). Nunca se registra un diagnóstico sin ella ni un tratamiento.
 *
 * Escenarios con `?simular=`:
 * - `calidad-insuficiente`: fotografías insuficientes y sin hipótesis;
 * - `datos-insuficientes`: suficiencia parcial («Sin síntomas descritos ni historial sanitario»);
 * - `ia-no-disponible`: al solicitar, 503;
 * - `vacio`, `error`, `sin-permiso` y `sin-sesion`: los genéricos de `simulacion.ts`.
 */
import { ErrorApi } from '../api/cliente'
import type { Paginado } from '@/types/comun'
import type {
  AtencionBuscable,
  CuerpoEvaluacionManual,
  CuerpoValidacionEvidencia,
  DatosSolicitudEvidencia,
  EjemplarEvidencia,
  FotografiaAnalizada,
  PlagaCatalogo,
  SugerenciaEvidencia,
} from '@/types/evidenciaFitosanitariaIa'
import type { EstadoSugerencia } from '@/types/ia'
import { ATENCIONES, EJEMPLARES, haceDias, hipotesisPara, metadatos, PLAGAS } from './evidenciaFitosanitariaIaDatos'
import { crearAlmacenSimulado, errorConflicto, errorNoEncontrado, escenarioSimulado, responderSimulado } from './simulacion'

const POR_PAGINA = 25
const MOTIVOS_CALIDAD = ['Imagen desenfocada', 'La planta ocupa menos del 20 % de la imagen']

/** Imágenes subidas en la sesión, por `id:archivo_id`. */
const imagenes = new Map<string, Blob>()
let siguienteArchivo = 9000

const ejemplo = (n: number, base: number): FotografiaAnalizada[] =>
  Array.from({ length: n }, (_, i) => ({ archivo_id: base + i, nombre: 'Fotografía de ejemplo', calidad: 'Suficiente', motivo_calidad: null }))

function crear(
  id: number,
  ejemplar: EjemplarEvidencia | null,
  atencionId: number | null,
  sintomas: string | null,
  fotografias: FotografiaAnalizada[],
  ahora: string,
  forzarParcial = false,
): SugerenciaEvidencia {
  const calidad = fotografias.every((f) => f.calidad === 'Suficiente')
  return {
    id,
    tipo: 'EvidenciaFitosanitaria',
    entidad: atencionId ? 'AtencionEspecial' : 'Ejemplar',
    registro_id: atencionId ?? ejemplar?.id ?? 0,
    archivo_id: null,
    contenido: {
      version_contenido: 1,
      origen: 'ia',
      ...metadatos(ejemplar, sintomas, fotografias.length, { calidad, forzarParcial }, ahora),
      ejemplar,
      atencion: atencionId ? { id: atencionId, codigo: `AE-${String(atencionId).padStart(4, '0')}` } : null,
      sintomas,
      fotografias,
      hipotesis: calidad ? hipotesisPara(ejemplar?.especie ?? null) : [],
      validacion: null,
      validada_por: null,
    },
    estado: 'Propuesta',
    etiqueta_estado: 'Pendiente de revisión',
    validador_id: null,
    fecha_validacion: null,
    fecha_creacion: ahora,
    usuario_creacion_id: 1,
    fecha_modificacion: ahora,
    usuario_modificacion_id: 1,
  }
}

function validado(s: SugerenciaEvidencia, validacion: CuerpoValidacionEvidencia, ahora: string): SugerenciaEvidencia {
  return {
    ...s,
    estado: 'Validada',
    etiqueta_estado: 'Validada',
    validador_id: 1,
    fecha_validacion: ahora,
    fecha_modificacion: ahora,
    contenido: { ...s.contenido, validacion, validada_por: 'Jefatura de sección (demo)' },
  }
}

function iniciales(): SugerenciaEvidencia[] {
  const fecha = (d: number) => `${haceDias(d)}T09:30:00-05:00`
  const pendiente = crear(1, EJEMPLARES[3], null, 'Hojas pegajosas y manchas negras', ejemplo(2, 100), fecha(1))
  const confirmada = validado(crear(2, EJEMPLARES[0], 41, 'Puntos blancos en el envés', ejemplo(3, 200), fecha(6)), {
    resultado: 'Confirmada',
    hipotesis_clave: 'queresa',
    categoria: 'Plaga',
    plaga_id: 1,
    nombre: 'Queresa',
    comentario: 'Confirmado en campo: colonias en el envés de las hojas bajas.',
  }, fecha(5))
  const sinConcluir = validado(crear(3, EJEMPLARES[2], null, null, ejemplo(1, 300), fecha(4)), {
    resultado: 'NoConcluyente',
    hipotesis_clave: null,
    categoria: null,
    plaga_id: null,
    nombre: null,
    comentario: 'Se pide una inspección presencial.',
  }, fecha(3))
  return [pendiente, confirmada, sinConcluir]
}

const almacen = crearAlmacenSimulado(iniciales())

const paginar = <T,>(todos: T[], page = 1): Paginado<T> => {
  const pagina = Math.max(1, page)
  return {
    count: todos.length,
    next: pagina * POR_PAGINA < todos.length ? `?page=${pagina + 1}` : null,
    previous: pagina > 1 ? `?page=${pagina - 1}` : null,
    results: todos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
  }
}

const vacio = () => escenarioSimulado() === 'vacio'
const contiene = (texto: string, q: string) => texto.toLowerCase().includes(q.trim().toLowerCase())

export function simularListarEvidencias(filtros: { estado?: EstadoSugerencia; page?: number }, signal?: AbortSignal) {
  return responderSimulado(() => {
    const lista = vacio() ? [] : almacen.listar().filter((s) => !filtros.estado || s.estado === filtros.estado)
    return paginar(lista.sort((a, b) => b.id - a.id), filtros.page)
  }, { signal })
}

function buscar(id: number): SugerenciaEvidencia {
  const s = almacen.obtener(id)
  if (!s) throw errorNoEncontrado()
  return s
}

export function simularObtenerEvidencia(id: number, signal?: AbortSignal) {
  return responderSimulado(() => buscar(id), { signal })
}

/** Crea el análisis (exportado para las pruebas). */
export function solicitarSimulado(datos: DatosSolicitudEvidencia, archivos: File[], ahora: Date = new Date()): SugerenciaEvidencia {
  const atencion = ATENCIONES.find((a) => a.id === datos.atencion_id) ?? null
  const ejemplar = atencion?.ejemplar ?? EJEMPLARES.find((e) => e.id === datos.ejemplar_id) ?? null
  if (!ejemplar) throw new ErrorApi(400, 'datos-invalidos', 'Elige el ejemplar o la atención fitosanitaria')
  if (archivos.length === 0) throw new ErrorApi(400, 'datos-invalidos', 'Adjunta al menos una fotografía')
  const escenario = escenarioSimulado()
  const id = almacen.siguienteId()
  const fotos = archivos.map((archivo, i): FotografiaAnalizada => {
    const archivoId = siguienteArchivo++
    imagenes.set(`${id}:${archivoId}`, archivo)
    const mala = escenario === 'calidad-insuficiente'
    return { archivo_id: archivoId, nombre: archivo.name, calidad: mala ? 'Insuficiente' : 'Suficiente', motivo_calidad: mala ? MOTIVOS_CALIDAD[i % 2] : null }
  })
  const sintomas = datos.sintomas?.trim() || null
  return almacen.guardar(crear(id, ejemplar, atencion?.id ?? null, sintomas, fotos, ahora.toISOString(), escenario === 'datos-insuficientes'))
}

export function simularSolicitarEvidencia(datos: DatosSolicitudEvidencia, archivos: File[]) {
  return responderSimulado(() => solicitarSimulado(datos, archivos), { esIa: true, demoraMs: 1200 })
}

/** La imagen subida en la sesión; las precargadas no tienen (404: la pantalla muestra un marcador). */
export function simularObtenerFotografia(id: number, archivoId: number, signal?: AbortSignal) {
  return responderSimulado(() => {
    const blob = imagenes.get(`${id}:${archivoId}`)
    if (!blob) throw errorNoEncontrado()
    return blob
  }, { signal, demoraMs: 150 })
}

const YA_REVISADO = 'Este análisis ya fue revisado. Recarga la página para ver su estado.'

/** Guarda la validación técnica (exportado para las pruebas). */
export function validarSimulado(id: number, cuerpo: CuerpoValidacionEvidencia, ahora: Date = new Date()): SugerenciaEvidencia {
  const s = buscar(id)
  if (s.estado !== 'Propuesta') throw errorConflicto(YA_REVISADO)
  if (cuerpo.resultado === 'Confirmada' && !s.contenido.hipotesis.some((h) => h.clave === cuerpo.hipotesis_clave)) {
    throw new ErrorApi(400, 'datos-invalidos', 'La hipótesis elegida no pertenece a este análisis')
  }
  if (cuerpo.resultado === 'OtraCategoria' && !cuerpo.categoria) throw new ErrorApi(400, 'datos-invalidos', 'Indica la categoría')
  return almacen.guardar(validado(s, cuerpo, ahora.toISOString()))
}

export function simularValidarEvidencia(id: number, cuerpo: CuerpoValidacionEvidencia) {
  return responderSimulado(() => validarSimulado(id, cuerpo))
}

export function descartarSimulado(id: number, ahora: Date = new Date()): SugerenciaEvidencia {
  const s = buscar(id)
  if (s.estado !== 'Propuesta') throw errorConflicto(YA_REVISADO)
  const instante = ahora.toISOString()
  return almacen.guardar({ ...s, estado: 'Rechazada', etiqueta_estado: 'Rechazada', validador_id: 1, fecha_validacion: instante, fecha_modificacion: instante })
}

export function simularDescartarEvidencia(id: number, _motivo: string | null) {
  return responderSimulado(() => descartarSimulado(id))
}

/** Evaluación manual sin IA (exportado para las pruebas): sin fotos analizadas ni hipótesis. */
export function manualSimulado(cuerpo: CuerpoEvaluacionManual, ahora: Date = new Date()): SugerenciaEvidencia {
  const atencion = ATENCIONES.find((a) => a.id === cuerpo.atencion_id) ?? null
  const ejemplar = atencion?.ejemplar ?? EJEMPLARES.find((e) => e.id === cuerpo.ejemplar_id) ?? null
  if (!ejemplar) throw new ErrorApi(400, 'datos-invalidos', 'Elige el ejemplar o la atención fitosanitaria')
  if (cuerpo.resultado === 'OtraCategoria' && !cuerpo.categoria) throw new ErrorApi(400, 'datos-invalidos', 'Indica la categoría')
  const instante = ahora.toISOString()
  const base = crear(almacen.siguienteId(), ejemplar, atencion?.id ?? null, null, [], instante)
  const { ejemplar_id: _e, atencion_id: _a, ...resto } = cuerpo
  const s = validado(base, { ...resto, hipotesis_clave: null }, instante)
  return almacen.guardar({
    ...s,
    contenido: { ...s.contenido, origen: 'manual', hipotesis: [], datos_utilizados: [], faltantes: [], limitaciones: [], explicacion: 'Evaluación registrada sin IA.' },
  })
}

export function simularRegistrarEvaluacionManual(cuerpo: CuerpoEvaluacionManual) {
  return responderSimulado(() => manualSimulado(cuerpo))
}

export function simularBuscarEjemplares(q: string, signal?: AbortSignal) {
  return responderSimulado(() => paginar(EJEMPLARES.filter((e) => contiene(`${e.codigo} ${e.especie ?? ''} ${e.espacio ?? ''} ${e.id}`, q))), { signal, demoraMs: 200 })
}

export function simularBuscarAtenciones(q: string, signal?: AbortSignal) {
  return responderSimulado((): Paginado<AtencionBuscable> => paginar(ATENCIONES.filter((a) => contiene(`${a.id} ${a.ejemplar.codigo} ${a.plaga}`, q))), { signal, demoraMs: 200 })
}

export function simularBuscarPlagas(q: string, signal?: AbortSignal) {
  return responderSimulado((): Paginado<PlagaCatalogo> => paginar(PLAGAS.filter((p) => contiene(p.nombre, q))), { signal, demoraMs: 200 })
}
