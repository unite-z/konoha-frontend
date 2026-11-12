/**
 * Hook de consulta con estados (Guía Web 6.1: «todo patrón define sus estados vacío, de carga y de error»).
 *
 * - `estado`: inactivo | cargando | exito | vacio | error.
 * - `cargaVisible`: pasa a `true` solo si la carga dura más de 300 ms (Guía Web 5.12), para evitar parpadeos.
 *   Mientras tanto, la página puede seguir mostrando los datos anteriores.
 * - Cancela la petición obsoleta con `AbortController` cuando cambia la clave o se desmonta el componente.
 * - `vacio` se decide con la función `esVacio` (en los reportes, `sin_datos` del back-end).
 *
 * La consulta se repite cuando cambia `clave` o al llamar a `reintentar`. Con `clave` nula no consulta.
 *
 * Sin conexión (RF-T-012): cada respuesta correcta se guarda en el dispositivo con su `clave` y, si después no hay
 * red, se devuelve esa copia (`conCache`, por usuario y borrada al cerrar sesión). Así cualquier pantalla abre con lo
 * último que se vio, también tras recargar sin red. Los demás errores (401, 403, 404…) se muestran igual.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { aErrorApi, esCancelacion, type ErrorApi } from '../services/api/cliente'
import { conCache } from '../sincronizacion/datosDescargados'

export type EstadoConsulta = 'inactivo' | 'cargando' | 'exito' | 'vacio' | 'error'

export interface ResultadoConsulta<T> {
  estado: EstadoConsulta
  /** Últimos datos recibidos (se conservan mientras se repite la consulta o si falla). */
  datos: T | null
  error: ErrorApi | null
  /** `true` si la carga ya dura más de 300 ms. */
  cargaVisible: boolean
  /** Repite la consulta sin recargar la página. */
  reintentar: () => void
}

/** Umbral para mostrar el estado de carga (Guía Web 5.12). */
const UMBRAL_CARGA_MS = 300

interface Respuesta<T> {
  /** Solicitud (clave e intento) a la que corresponde la respuesta. */
  solicitud: string
  estado: 'exito' | 'vacio' | 'error'
  datos: T | null
  error: ErrorApi | null
}

export function useConsulta<T>(
  clave: string | null,
  consultar: (signal: AbortSignal) => Promise<T>,
  esVacio?: (datos: T) => boolean,
): ResultadoConsulta<T> {
  const consultarRef = useRef(consultar)
  const esVacioRef = useRef(esVacio)
  useEffect(() => {
    consultarRef.current = consultar
    esVacioRef.current = esVacio
  })

  const [intento, setIntento] = useState(0)
  const solicitud = clave === null ? null : `${clave}#${intento}`
  const [respuesta, setRespuesta] = useState<Respuesta<T> | null>(null)
  const [cargaVisiblePara, setCargaVisiblePara] = useState<string | null>(null)

  useEffect(() => {
    if (solicitud === null) return
    const controlador = new AbortController()
    const temporizador = window.setTimeout(() => setCargaVisiblePara(solicitud), UMBRAL_CARGA_MS)

    conCache(`consulta:${clave}`, () => consultarRef.current(controlador.signal))
      .then((datos) => {
        if (controlador.signal.aborted) return
        const vacio = esVacioRef.current?.(datos) ?? false
        setRespuesta({ solicitud, estado: vacio ? 'vacio' : 'exito', datos, error: null })
      })
      .catch((causa: unknown) => {
        if (controlador.signal.aborted || esCancelacion(causa)) return
        setRespuesta((anterior) => ({
          solicitud,
          estado: 'error',
          datos: anterior?.datos ?? null,
          error: aErrorApi(causa),
        }))
      })
      .finally(() => window.clearTimeout(temporizador))

    return () => {
      controlador.abort()
      window.clearTimeout(temporizador)
    }
  }, [solicitud, clave])

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])

  let estado: EstadoConsulta = 'inactivo'
  if (solicitud !== null) estado = respuesta?.solicitud === solicitud ? respuesta.estado : 'cargando'

  return {
    estado,
    datos: respuesta?.datos ?? null,
    error: estado === 'error' ? (respuesta?.error ?? null) : null,
    cargaVisible: estado === 'cargando' && cargaVisiblePara === solicitud,
    reintentar,
  }
}
