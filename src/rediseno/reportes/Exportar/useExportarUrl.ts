/**
 * Apertura del panel «Exportar» en la URL. Se abre con `?exportar=1` o al llegar con `?tipo=&mes=` (otras pantallas
 * enlazan así con el formulario precargado). Abrir añade una entrada al historial; con enlace directo, cerrar solo
 * quita los parámetros.
 */
import { useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

export const PARAMETRO_EXPORTAR = 'exportar'
export const PARAMETROS_PRECARGA = ['tipo', 'mes', 'formato'] as const

export interface ExportarUrl {
  abierto: boolean
  /** Valores de precarga de la URL (`''` si no vienen). */
  tipo: string
  mes: string
  formato: string
  abrir: () => void
  cerrar: () => void
}

interface EstadoExportar {
  panelAbiertoPor?: string
}

export function useExportarUrl(): ExportarUrl {
  const [parametros, setParametros] = useSearchParams()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const tipo = parametros.get('tipo') ?? ''
  const mes = parametros.get('mes') ?? ''
  const formato = parametros.get('formato') ?? ''
  const abierto = parametros.has(PARAMETRO_EXPORTAR) || tipo !== '' || mes !== ''

  const abrir = useCallback(() => {
    const nuevos = new URLSearchParams(parametros)
    nuevos.set(PARAMETRO_EXPORTAR, '1')
    setParametros(nuevos, {
      state: { panelAbiertoPor: PARAMETRO_EXPORTAR } satisfies EstadoExportar,
    })
  }, [parametros, setParametros])

  const cerrar = useCallback(() => {
    const estado = ubicacion.state as EstadoExportar | null
    if (estado?.panelAbiertoPor === PARAMETRO_EXPORTAR) {
      navegar(-1)
      return
    }
    const nuevos = new URLSearchParams(parametros)
    for (const clave of [PARAMETRO_EXPORTAR, ...PARAMETROS_PRECARGA]) nuevos.delete(clave)
    setParametros(nuevos, { replace: true })
  }, [navegar, parametros, setParametros, ubicacion.state])

  return { abierto, tipo, mes, formato, abrir, cerrar }
}
