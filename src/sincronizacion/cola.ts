/**
 * Cola común de operaciones sin conexión (RF-T-012, AV-226). Reglas en `docs/estandares/pwa-offline.md`.
 *
 * - Cada operación se guarda primero en IndexedDB (`pendientes`) con un UUID del cliente, que es su
 *   `Idempotency-Key`: los reintentos repiten el mismo, así que el servidor nunca la duplica.
 * - Conserva el usuario y la hora originales, y se envía en orden de creación. Una operación que depende de otra
 *   (la actividad de un parte, la foto de una actividad) espera a la suya y toma de su respuesta el identificador que
 *   le falta (`referencias`).
 * - Sin red o con 5xx se reintenta con espera creciente (5 s, 15 s, 1 min, 5 min y después cada 15 min).
 * - 401 (sesión caducada o cuenta desactivada): la cola se detiene sin perder nada hasta volver a iniciar sesión.
 * - Otro 4xx (validación o permiso): la operación queda «Rechazada» con el motivo, visible hasta que el usuario la
 *   reintente o la descarte. Nunca se borra sola.
 * - Solo se envía lo que registró el usuario de la sesión actual.
 *
 * Quién envía cada tipo de operación lo registra `registrarEjecutor` (ver `ejecutores.ts`).
 */
import { useSyncExternalStore } from 'react'
import { ErrorApi } from '@/services/api/cliente'
import { borrar, guardar, leerTodos } from './almacenLocal'

export type EstadoPendiente = 'pendiente' | 'enviando' | 'rechazada' | 'hecha'

export interface Pendiente {
  /** UUID del cliente: identifica la operación y viaja como `Idempotency-Key`. */
  id: string
  /** Tipo de operación (`corte.marca`, `campo.actividad`…): decide quién la envía. */
  tipo: string
  /** Datos de la operación, tal como los espera su ejecutor. */
  carga: Record<string, unknown>
  /** Foto o documento, ya comprimido. Se borra al confirmar el envío. */
  archivo?: Blob | null
  nombre_archivo?: string | null
  /** Texto para la lista de pendientes («Marca de corte · Jardín A»). */
  descripcion: string
  /** Quién la registró y cuándo (hora real, aunque se envíe después). */
  usuario_id: number
  creado_en: string
  /** Orden de llegada a la cola (ms, estrictamente creciente): decide el orden de envío. */
  orden: number
  /** Operación de la que depende (por ejemplo, el parte de una actividad). */
  depende_de?: string | null
  /** Campos de `carga` que se rellenan con el `id` de la respuesta de `depende_de`. */
  referencias?: string[]
  estado: EstadoPendiente
  intentos: number
  /** Momento (ms) a partir del cual se puede volver a intentar. */
  proximo_intento: number
  /** Motivo del último fallo, escrito para el usuario. */
  error?: string | null
  /** Respuesta del servidor, guardada mientras haya operaciones que dependan de esta. */
  resultado?: unknown
}

export type NuevoPendiente = Pick<Pendiente, 'tipo' | 'carga' | 'descripcion' | 'usuario_id'> &
  Partial<Pick<Pendiente, 'id' | 'archivo' | 'nombre_archivo' | 'depende_de' | 'referencias' | 'creado_en'>>

export type Ejecutor = (pendiente: Pendiente) => Promise<unknown>

/** Códigos de conflicto que no son un fallo: otro ya hizo lo mismo (por ejemplo, el jardín ya estaba marcado). */
const CONFLICTOS_RESUELTOS = new Set(['ya-marcado'])

/** Espera antes de cada reintento (`pwa-offline.md`): 5 s, 15 s, 1 min, 5 min y después cada 15 min. */
const ESPERAS_MS = [5_000, 15_000, 60_000, 300_000, 900_000]

export function esperaReintento(intentos: number, azar: number = Math.random()): number {
  const base = ESPERAS_MS[Math.min(Math.max(intentos - 1, 0), ESPERAS_MS.length - 1)]
  // ±20 % para que muchos móviles no reintenten a la vez al volver la red.
  return Math.round(base * (0.8 + azar * 0.4))
}

export interface Conflicto {
  pendiente: Pendiente
  error: ErrorApi
}

export interface EstadoCola {
  pendientes: Pendiente[]
  /** `sesion`: un 401 detuvo la cola hasta volver a iniciar sesión. */
  pausada: 'sesion' | null
  enviando: boolean
}

const ejecutores = new Map<string, Ejecutor>()
const avisos = new Set<() => void>()
const avisosConflicto = new Set<(conflicto: Conflicto) => void>()
let estado: EstadoCola = { pendientes: [], pausada: null, enviando: false }
let enCurso: Promise<void> | null = null

function publicar(cambio: Partial<EstadoCola>) {
  estado = { ...estado, ...cambio }
  for (const aviso of avisos) aviso()
}

function ordenar(lista: Pendiente[]): Pendiente[] {
  return [...lista].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.creado_en.localeCompare(b.creado_en))
}

let ultimoOrden = 0

/** Marca de orden estrictamente creciente, aunque se encolen varias operaciones en el mismo milisegundo. */
function siguienteOrden(): number {
  ultimoOrden = Math.max(Date.now(), ultimoOrden + 1, ...estado.pendientes.map((p) => (p.orden ?? 0) + 1))
  return ultimoOrden
}

/** Vuelve a leer la cola del dispositivo (al arrancar o al volver a la pestaña: otra pestaña pudo cambiarla). */
export async function recargarCola(): Promise<void> {
  const lista = await leerTodos<Pendiente>('pendientes')
  // Un envío que quedó a medias (se cerró la app) vuelve a estar pendiente: la clave evita duplicarlo.
  publicar({ pendientes: ordenar(lista.map((p) => (p.estado === 'enviando' ? { ...p, estado: 'pendiente' } : p))) })
}

export function registrarEjecutor(tipo: string, ejecutor: Ejecutor): void {
  ejecutores.set(tipo, ejecutor)
}

export function nuevaClave(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Navegadores sin `randomUUID` (contexto no seguro): UUID v4 con `getRandomValues`.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Guarda la operación en el dispositivo. Devuelve su UUID (para encadenar otras con `depende_de`). */
export async function encolar(nueva: NuevoPendiente): Promise<string> {
  const pendiente: Pendiente = {
    id: nueva.id ?? nuevaClave(),
    tipo: nueva.tipo,
    carga: nueva.carga,
    archivo: nueva.archivo ?? null,
    nombre_archivo: nueva.nombre_archivo ?? null,
    descripcion: nueva.descripcion,
    usuario_id: nueva.usuario_id,
    creado_en: nueva.creado_en ?? new Date().toISOString(),
    orden: siguienteOrden(),
    depende_de: nueva.depende_de ?? null,
    referencias: nueva.referencias ?? [],
    estado: 'pendiente',
    intentos: 0,
    proximo_intento: 0,
    error: null,
  }
  await guardar('pendientes', pendiente)
  publicar({ pendientes: ordenar([...estado.pendientes.filter((p) => p.id !== pendiente.id), pendiente]) })
  return pendiente.id
}

async function actualizar(pendiente: Pendiente): Promise<void> {
  await guardar('pendientes', pendiente)
  publicar({ pendientes: estado.pendientes.map((p) => (p.id === pendiente.id ? pendiente : p)) })
}

async function quitar(id: string): Promise<void> {
  await borrar('pendientes', id)
  publicar({ pendientes: estado.pendientes.filter((p) => p.id !== id) })
}

/** Quita las operaciones ya enviadas que nadie necesita (su respuesta solo servía a sus dependientes). */
async function limpiarHechas(): Promise<void> {
  const necesarias = new Set(estado.pendientes.filter((p) => p.estado !== 'hecha').map((p) => p.depende_de))
  for (const p of estado.pendientes) {
    if (p.estado === 'hecha' && !necesarias.has(p.id)) await quitar(p.id)
  }
}

function idDeRespuesta(resultado: unknown): unknown {
  return resultado && typeof resultado === 'object' && 'id' in resultado ? (resultado as { id: unknown }).id : undefined
}

/** Por qué no se puede enviar ahora (`null` si se puede). */
function bloqueo(p: Pendiente, usuarioId: number, ahora: number): 'esperar' | 'dependencia' | 'ajena' | null {
  if (p.usuario_id !== usuarioId) return 'ajena'
  if (p.proximo_intento > ahora) return 'esperar'
  if (p.depende_de) {
    const padre = estado.pendientes.find((q) => q.id === p.depende_de)
    if (padre && padre.estado !== 'hecha') return 'dependencia'
  }
  return null
}

async function enviarUna(p: Pendiente): Promise<'seguir' | 'sin-red' | 'pausar'> {
  const ejecutor = ejecutores.get(p.tipo)
  if (!ejecutor) {
    await actualizar({ ...p, estado: 'rechazada', error: 'Esta versión de la aplicación no sabe enviar esta operación' })
    return 'seguir'
  }
  const padre = p.depende_de ? estado.pendientes.find((q) => q.id === p.depende_de) : undefined
  const carga = { ...p.carga }
  for (const campo of p.referencias ?? []) {
    const id = idDeRespuesta(padre?.resultado)
    if (id === undefined) {
      await actualizar({ ...p, estado: 'rechazada', error: 'No se pudo enviar la operación de la que depende' })
      return 'seguir'
    }
    carga[campo] = id
  }
  const enviando: Pendiente = { ...p, carga, estado: 'enviando', intentos: p.intentos + 1 }
  await actualizar(enviando)
  try {
    const resultado = await ejecutor(enviando)
    const dependientes = estado.pendientes.some((q) => q.depende_de === p.id && q.estado !== 'hecha')
    if (dependientes) await actualizar({ ...enviando, estado: 'hecha', archivo: null, resultado, error: null })
    else await quitar(p.id)
    return 'seguir'
  } catch (causa) {
    // Un fallo que no viene de la API (datos de la operación dañados): rechazada, no se reintenta sin fin.
    if (!(causa instanceof ErrorApi)) {
      await actualizar({ ...enviando, estado: 'rechazada', error: causa instanceof Error ? causa.message : 'No se pudo preparar el envío' })
      return 'seguir'
    }
    const error = causa
    if (error.estado === 0 || error.estado >= 500) {
      await actualizar({
        ...enviando,
        estado: 'pendiente',
        proximo_intento: Date.now() + esperaReintento(enviando.intentos),
        error: error.estado === 0 ? 'Sin conexión: se enviará al volver la red' : error.detalle,
      })
      return error.estado === 0 ? 'sin-red' : 'seguir'
    }
    if (error.estado === 401) {
      // La cookie caducó o la cuenta se desactivó: nada se pierde, se reanuda al volver a iniciar sesión.
      await actualizar({ ...enviando, estado: 'pendiente', intentos: p.intentos, error: 'Inicia sesión para enviarla' })
      return 'pausar'
    }
    if (error.estado === 409 && error.codigo && CONFLICTOS_RESUELTOS.has(error.codigo)) {
      await quitar(p.id)
      for (const aviso of avisosConflicto) aviso({ pendiente: enviando, error })
      return 'seguir'
    }
    await actualizar({ ...enviando, estado: 'rechazada', error: error.detalle })
    return 'seguir'
  }
}

/**
 * Envía lo que se pueda de la cola, en orden. Una sola ejecución a la vez: si ya hay una en curso, devuelve esa.
 * `usuarioId`: el de la sesión actual; las operaciones de otro usuario no se envían.
 */
export function vaciarCola(usuarioId: number): Promise<void> {
  if (estado.pausada || enCurso) return enCurso ?? Promise.resolve()
  enCurso = (async () => {
    publicar({ enviando: true })
    try {
      for (;;) {
        const ahora = Date.now()
        const siguiente = estado.pendientes.find((p) => p.estado === 'pendiente' && bloqueo(p, usuarioId, ahora) === null)
        if (!siguiente) break
        const resultado = await enviarUna(siguiente)
        if (resultado === 'sin-red') break
        if (resultado === 'pausar') {
          publicar({ pausada: 'sesion' })
          break
        }
      }
      await limpiarHechas()
    } finally {
      enCurso = null
      publicar({ enviando: false })
    }
  })()
  return enCurso
}

/** Tras volver a iniciar sesión. */
export function reanudarCola(): void {
  if (estado.pausada) publicar({ pausada: null })
}

/** «Reintentar» de una rechazada, o adelantar una que espera. */
export async function reintentar(id: string): Promise<void> {
  const p = estado.pendientes.find((q) => q.id === id)
  if (p && p.estado !== 'hecha') await actualizar({ ...p, estado: 'pendiente', proximo_intento: 0, error: null })
}

/** «Descartar»: solo a petición del usuario. También descarta lo que dependía de ella. */
export async function descartar(id: string): Promise<void> {
  const dependientes = estado.pendientes.filter((p) => p.depende_de === id)
  for (const d of dependientes) await descartar(d.id)
  await quitar(id)
}

export function leerEstadoCola(): EstadoCola {
  return estado
}

export function suscribirCola(aviso: () => void): () => void {
  avisos.add(aviso)
  return () => avisos.delete(aviso)
}

/** Avisa cuando una operación resultó estar ya hecha por otro (409 `ya-marcado`). */
export function alResolverConflicto(aviso: (conflicto: Conflicto) => void): () => void {
  avisosConflicto.add(aviso)
  return () => avisosConflicto.delete(aviso)
}

export function useCola(): EstadoCola {
  return useSyncExternalStore(suscribirCola, leerEstadoCola, leerEstadoCola)
}

/** Lo que queda por sincronizar (sin contar lo ya enviado), opcionalmente de un tipo. */
export function porSincronizar(cola: EstadoCola, tipo?: string): Pendiente[] {
  return cola.pendientes.filter((p) => p.estado !== 'hecha' && (!tipo || p.tipo === tipo))
}

/** Solo para las pruebas. */
export function reiniciarColaParaPruebas(): void {
  ejecutores.clear()
  avisos.clear()
  avisosConflicto.clear()
  enCurso = null
  ultimoOrden = 0
  estado = { pendientes: [], pausada: null, enviando: false }
}

