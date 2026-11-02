/**
 * Utilidades de los datos simulados (solo con `DATOS_SIMULADOS`). Imitan al backend (demora de red,
 * cancelación con `AbortSignal` y errores con `ErrorApi`) para que las pantallas recorran los mismos estados
 * que con la API real: carga, vacío, error, 401, 403 e IA no disponible.
 *
 * Escenarios forzados con `?simular=` en la URL de la pantalla:
 * - genéricos (aquí): `error`, `sin-permiso`, `sin-sesion` e `ia-no-disponible` (solo en llamadas de IA);
 * - de dominio (en cada fichero simulado): `vacio`, `datos-insuficientes`, `volumen-excedido` y `calidad-insuficiente`.
 */
import { ErrorApi } from '../api/cliente'

export type EscenarioSimulado =
  | 'vacio'
  | 'error'
  | 'sin-permiso'
  | 'sin-sesion'
  | 'ia-no-disponible'
  | 'datos-insuficientes'
  | 'volumen-excedido'
  | 'calidad-insuficiente'

const ESCENARIOS: readonly EscenarioSimulado[] = [
  'vacio',
  'error',
  'sin-permiso',
  'sin-sesion',
  'ia-no-disponible',
  'datos-insuficientes',
  'volumen-excedido',
  'calidad-insuficiente',
]

/** Demora simulada: supera los 300 ms de `useConsulta` para que se vea el estado de carga. */
export const DEMORA_SIMULADA_MS = 450

/** Escenario pedido con `?simular=` (o `null`). */
export function escenarioSimulado(busqueda: string = globalThis.location?.search ?? ''): EscenarioSimulado | null {
  const valor = new URLSearchParams(busqueda).get('simular')
  return ESCENARIOS.find((escenario) => escenario === valor) ?? null
}

/** Error genérico del escenario (o `null`). `ia-no-disponible` solo afecta a las llamadas de IA. */
export function errorDeEscenario(escenario: EscenarioSimulado | null, esIa = false): ErrorApi | null {
  switch (escenario) {
    case 'error':
      return new ErrorApi(500, 'error-simulado', 'El servidor no pudo atender la solicitud. Vuelve a intentarlo en unos minutos')
    case 'sin-permiso':
      return new ErrorApi(403, 'sin-permiso', 'No tienes permiso para realizar esta acción')
    case 'sin-sesion':
      return new ErrorApi(401, 'no-autenticado', 'Tu sesión ha caducado. Vuelve a ingresar')
    case 'ia-no-disponible':
      return esIa
        ? new ErrorApi(503, 'ia-no-disponible', 'El servicio de IA no está disponible. Puedes continuar de forma manual')
        : null
    default:
      return null
  }
}

export interface OpcionesSimulacion {
  signal?: AbortSignal
  demoraMs?: number
  /** `true` en las llamadas que invocan a la IA (solicitar un análisis). */
  esIa?: boolean
}

/** Responde como el backend: espera, respeta la cancelación y lanza el error del escenario si lo hay. */
export function responderSimulado<T>(crear: () => T, opciones: OpcionesSimulacion = {}): Promise<T> {
  const { signal, demoraMs = DEMORA_SIMULADA_MS, esIa = false } = opciones
  return new Promise<T>((resolver, rechazar) => {
    const cancelada = () => new DOMException('Petición cancelada', 'AbortError')
    if (signal?.aborted) {
      rechazar(cancelada())
      return
    }
    const alCancelar = () => {
      clearTimeout(temporizador)
      rechazar(cancelada())
    }
    const temporizador = setTimeout(() => {
      signal?.removeEventListener('abort', alCancelar)
      const error = errorDeEscenario(escenarioSimulado(), esIa)
      if (error) {
        rechazar(error)
        return
      }
      try {
        resolver(structuredClone(crear()))
      } catch (fallo) {
        rechazar(fallo instanceof Error ? fallo : new Error(String(fallo)))
      }
    }, demoraMs)
    signal?.addEventListener('abort', alCancelar, { once: true })
  })
}

/** 404 simulado. */
export function errorNoEncontrado(): ErrorApi {
  return new ErrorApi(404, 'no-encontrado', 'No se encontró el registro solicitado')
}

/** 409 simulado (por ejemplo, una propuesta ya validada). */
export function errorConflicto(detalle: string): ErrorApi {
  return new ErrorApi(409, 'conflicto', detalle)
}

/** Registro en memoria para los flujos con POST. Se pierde al recargar la página, como una demo. */
export function crearAlmacenSimulado<T extends { id: number }>(iniciales: readonly T[]) {
  const filas = new Map<number, T>(iniciales.map((fila) => [fila.id, structuredClone(fila)]))
  return {
    listar: (): T[] => [...filas.values()],
    obtener: (id: number): T | undefined => filas.get(id),
    guardar: (fila: T): T => {
      filas.set(fila.id, fila)
      return fila
    },
    siguienteId: (): number => Math.max(0, ...filas.keys()) + 1,
  }
}
