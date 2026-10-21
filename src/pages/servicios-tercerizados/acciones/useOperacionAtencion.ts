/**
 * Envío de una operación sobre una atención (OC, inicio, fin, origen, acuerdo), con:
 *
 * - Cerrojo contra el doble envío (síncrono, no depende del render).
 * - Error 409 (la atención cambió): se recarga la atención para que la ficha muestre su estado real.
 * - Sin respuesta (estado 0): el resultado es desconocido. Se recarga la atención y, si la operación ya quedó
 *   aplicada (`aplicada`), se trata como éxito; si no, se informa y se permite reintentar. Nunca se supone
 *   el éxito sin una respuesta del servidor.
 * - Errores de validación por campo (400): se devuelven los nombres de campo para que el formulario muestre
 *   sus propios mensajes en español (el back-end puede responderlos en inglés).
 */
import { useCallback, useRef, useState } from 'react'
import { aErrorApi } from '../../../services/api/cliente'
import { obtenerAtencion } from '../../../services/api/tercerizados'
import type { Atencion } from '../../../types/tercerizados'

export interface ErrorOperacion {
  titulo: string
  detalle: string
  /** Campos que el servidor rechazó (400 de validación). */
  campos: string[]
}

export interface Operacion {
  ejecutar: () => Promise<Atencion>
  /** `true` si la atención recargada ya refleja la operación (para el caso sin respuesta). */
  aplicada: (atencion: Atencion) => boolean
}

const MENSAJE_SIN_PERMISO = 'Tu usuario no tiene permiso para esta operación. Si cambiaron tus roles, vuelve a ingresar.'

export function useOperacionAtencion(atencionId: number, onActualizada: (atencion: Atencion) => void) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<ErrorOperacion | null>(null)
  const enCurso = useRef(false)

  const recargar = useCallback(async (): Promise<Atencion | null> => {
    try {
      const actual = await obtenerAtencion(atencionId)
      onActualizada(actual)
      return actual
    } catch {
      return null
    }
  }, [atencionId, onActualizada])

  const enviar = useCallback(
    async (operacion: Operacion): Promise<boolean> => {
      if (enCurso.current) return false
      enCurso.current = true
      setEnviando(true)
      setError(null)
      try {
        onActualizada(await operacion.ejecutar())
        return true
      } catch (causa) {
        const fallo = aErrorApi(causa)
        if (fallo.estado === 0) {
          const actual = await recargar()
          if (actual && operacion.aplicada(actual)) return true
          setError({
            titulo: 'No pudimos confirmar el registro',
            detalle: actual
              ? 'Se perdió la conexión y la atención no muestra el cambio. Revisa los datos y vuelve a intentarlo.'
              : 'Se perdió la conexión con el servidor. No sabemos si el cambio se registró: revisa tu conexión y la ficha antes de reintentar.',
            campos: [],
          })
        } else if (fallo.estado === 409) {
          await recargar()
          setError({ titulo: 'La atención cambió', detalle: `${fallo.detalle}. La ficha ya muestra su estado actual.`, campos: [] })
        } else if (fallo.estado === 403) {
          setError({ titulo: 'Sin permiso', detalle: MENSAJE_SIN_PERMISO, campos: [] })
        } else if (fallo.estado === 404) {
          setError({ titulo: 'No encontramos la atención', detalle: fallo.detalle, campos: [] })
        } else {
          const campos = Object.keys(fallo.errores_campo)
          setError({
            titulo: campos.length > 0 ? 'Revisa los datos marcados' : 'No se pudo registrar',
            detalle: campos.length > 0 ? 'El servidor rechazó algunos campos.' : fallo.detalle,
            campos,
          })
        }
        return false
      } finally {
        enCurso.current = false
        setEnviando(false)
      }
    },
    [onActualizada, recargar],
  )

  const limpiarError = useCallback(() => setError(null), [])

  return { enviando, error, enviar, limpiarError }
}
