/**
 * Estado de los filtros en la URL (Guía Web 5.5 y 6.1: «los filtros se conservan al volver desde una
 * ficha» y «después de crear o editar, el usuario vuelve a donde estaba con sus filtros conservados»).
 *
 * Cada filtro es un parámetro de búsqueda de la URL. Si la URL no trae un filtro, se usa su valor
 * predeterminado. Los valores vacíos se quitan de la URL.
 */
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

export interface FiltrosUrl<K extends string> {
  /** Valor actual de cada filtro (de la URL o el predeterminado). */
  filtros: Record<K, string>
  /** Cambia varios filtros a la vez. `null` o `''` quita el filtro de la URL. */
  establecer: (cambios: Partial<Record<K, string | null>>) => void
}

export function useFiltrosUrl<K extends string>(predeterminados: Record<K, string>): FiltrosUrl<K> {
  const [parametros, setParametros] = useSearchParams()

  // Los predeterminados se comparan por contenido para no recalcular en cada render.
  const clavePredeterminados = JSON.stringify(predeterminados)

  const filtros = useMemo(() => {
    const base = JSON.parse(clavePredeterminados) as Record<K, string>
    const resultado = { ...base }
    for (const clave of Object.keys(base) as K[]) {
      const valor = parametros.get(clave)
      if (valor !== null) resultado[clave] = valor
    }
    return resultado
  }, [parametros, clavePredeterminados])

  const establecer = useCallback(
    (cambios: Partial<Record<K, string | null>>) => {
      setParametros((anteriores) => {
        const nuevos = new URLSearchParams(anteriores)
        for (const [clave, valor] of Object.entries(cambios) as [K, string | null | undefined][]) {
          if (valor === null || valor === undefined || valor === '') nuevos.delete(clave)
          else nuevos.set(clave, valor)
        }
        return nuevos
      })
    },
    [setParametros],
  )

  return { filtros, establecer }
}
