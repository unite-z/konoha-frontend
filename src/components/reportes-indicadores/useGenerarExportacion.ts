/**
 * Generar y descargar una exportación (RF-REP-009), compartido por la página de Exportaciones y `BotonExportar`.
 * Genera el archivo (`POST exportaciones/`), lo descarga y deja el error del intento (A1, A2, 400 o E1).
 * Nada cambia en los datos originales: solo se crea el registro del archivo.
 */
import { useCallback, useState } from 'react'
import { aErrorApi, esCancelacion, type ErrorApi } from '../../services/api/cliente'
import { descargarExportacion, generarExportacion } from '../../services/api/exportaciones'
import type { ReporteGenerado, SolicitudExportacion } from '../../types/exportaciones'

export interface GeneracionExportacion {
  enviando: boolean
  error: ErrorApi | null
  /** Genera y descarga; devuelve el reporte, o `null` si falló (el error queda en `error`). */
  generar: (solicitud: SolicitudExportacion) => Promise<ReporteGenerado | null>
  limpiarError: () => void
}

export function useGenerarExportacion(): GeneracionExportacion {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<ErrorApi | null>(null)

  const generar = useCallback(async (solicitud: SolicitudExportacion) => {
    setEnviando(true)
    setError(null)
    try {
      const reporte = await generarExportacion(solicitud)
      await descargarExportacion(reporte)
      return reporte
    } catch (fallo) {
      if (!esCancelacion(fallo)) setError(aErrorApi(fallo))
      return null
    } finally {
      setEnviando(false)
    }
  }, [])

  const limpiarError = useCallback(() => setError(null), [])

  return { enviando, error, generar, limpiarError }
}
