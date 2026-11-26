import { useCallback, useState } from 'react'
import { obtenerResumenArea } from '@/services/api/resumenArea'
import type { EntradaHistorialArea, PaginaHistorialArea } from '@/types/resumenArea'

export interface HistorialArea {
  entradas: EntradaHistorialArea[]
  hayMas: boolean
  cargando: boolean
  falloAlCargar: boolean
  cargarMas: () => void
}

/**
 * Historial del área con «Cargar más»: parte de la primera página que ya trae el resumen y pide las siguientes con
 * `?page=`. Vive en el panel (no en la pestaña) para que cambiar de pestaña no lo reinicie.
 */
export function useHistorialArea(areaId: number, primera: PaginaHistorialArea): HistorialArea {
  const [extra, setExtra] = useState<{ entradas: EntradaHistorialArea[]; pagina: number; hayMas: boolean } | null>(null)
  const [cargando, setCargando] = useState(false)
  const [falloAlCargar, setFalloAlCargar] = useState(false)

  const pagina = extra?.pagina ?? 1
  const hayMas = extra ? extra.hayMas : primera.next !== null

  const cargarMas = useCallback(() => {
    setCargando(true)
    setFalloAlCargar(false)
    obtenerResumenArea(areaId, pagina + 1)
      .then((resumen) =>
        setExtra((previo) => ({
          entradas: [...(previo?.entradas ?? []), ...resumen.historial.results],
          pagina: pagina + 1,
          hayMas: resumen.historial.next !== null,
        })),
      )
      .catch(() => setFalloAlCargar(true))
      .finally(() => setCargando(false))
  }, [areaId, pagina])

  return {
    entradas: [...primera.results, ...(extra?.entradas ?? [])],
    hayMas,
    cargando,
    falloAlCargar,
    cargarMas,
  }
}
