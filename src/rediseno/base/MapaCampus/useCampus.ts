import { useCallback, useEffect, useState } from 'react'
import { aErrorApi, esCancelacion, type ErrorApi } from '@/services/api/cliente'
import { obtenerCampus3d } from '@/services/api/campus3d'
import type { DatosCampus } from '@/types/campus3d'

export type EstadoCampus =
  | { estado: 'cargando' }
  | { estado: 'error'; error: ErrorApi }
  | { estado: 'listo'; datos: DatosCampus }

/** Carga `campus-3d.json` una vez por montaje; `reintentar` repite tras un error. */
export function useCampus(): EstadoCampus & { reintentar: () => void } {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState<{ intento: number; valor: EstadoCampus } | null>(null)

  useEffect(() => {
    const controlador = new AbortController()
    obtenerCampus3d(controlador.signal)
      .then((datos) => setResultado({ intento, valor: { estado: 'listo', datos } }))
      .catch((causa: unknown) => {
        if (esCancelacion(causa)) return
        setResultado({ intento, valor: { estado: 'error', error: aErrorApi(causa) } })
      })
    return () => controlador.abort()
  }, [intento])

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])
  const valor: EstadoCampus = resultado?.intento === intento ? resultado.valor : { estado: 'cargando' }
  return { ...valor, reintentar }
}
