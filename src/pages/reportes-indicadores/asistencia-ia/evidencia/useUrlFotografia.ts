/**
 * URL local (`blob:`) de una fotografía analizada (RF-IA-006): la pide con la sesión y la libera al desmontar o al
 * cambiar de foto. Si no hay imagen (ejemplo precargado o error), `fallo` es `true` y se muestra un marcador.
 */
import { useEffect, useState } from 'react'
import { esCancelacion } from '@/services/api/cliente'
import { obtenerFotografia } from '@/services/api/evidenciaFitosanitariaIa'

export function useUrlFotografia(sugerenciaId: number, archivoId: number): { url: string | null; fallo: boolean } {
  const [estado, setEstado] = useState<{ clave: string; url: string | null; fallo: boolean }>({ clave: '', url: null, fallo: false })
  const clave = `${sugerenciaId}:${archivoId}`

  useEffect(() => {
    const control = new AbortController()
    let creada: string | null = null
    obtenerFotografia(sugerenciaId, archivoId, control.signal)
      .then((blob) => {
        creada = URL.createObjectURL(blob)
        setEstado({ clave, url: creada, fallo: false })
      })
      .catch((error: unknown) => {
        if (!esCancelacion(error)) setEstado({ clave, url: null, fallo: true })
      })
    return () => {
      control.abort()
      if (creada) URL.revokeObjectURL(creada)
    }
  }, [sugerenciaId, archivoId, clave])

  return estado.clave === clave ? { url: estado.url, fallo: estado.fallo } : { url: null, fallo: false }
}
