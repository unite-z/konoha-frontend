/**
 * Apertura del panel «Exportar» en la URL. Se abre con `?exportar=1` o al llegar con `?tipo=` (otras pantallas
 * enlazan así, con `&mes=` y los demás filtros, para precargar el formulario). `mes` solo no lo abre: puede ser el
 * filtro de un informe. Abrir añade una entrada al historial y cierra el panel del indicador o del informe; con
 * enlace directo, cerrar solo quita los parámetros.
 */
import { useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import type { FiltrosExportacion } from '@/utils/exportaciones'
import { PARAMETRO_EXPORTAR, PARAMETRO_INDICADOR, PARAMETRO_INFORME, PARAMETROS_EXPORTAR } from '../enlaces'

/** Filtros del formulario que se pueden precargar desde la URL (los mismos nombres que el panel de Reportes). */
const FILTROS_PRECARGA = [
  'desde',
  'hasta',
  'mes',
  'tipo_servicio_id',
  'proveedor_id',
  'area_verde_id',
  'modalidad',
] as const satisfies readonly (keyof FiltrosExportacion)[]

export interface ExportarUrl {
  /** El panel está pedido en la URL y no hay otro panel de Reportes abierto. */
  abierto: boolean
  /** Valores de precarga de la URL (`''` si no vienen). */
  tipo: string
  formato: string
  filtros: Partial<FiltrosExportacion>
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
  const formato = parametros.get('formato') ?? ''
  const otroPanel = parametros.has(PARAMETRO_INDICADOR) || parametros.has(PARAMETRO_INFORME)
  const abierto = !otroPanel && (parametros.has(PARAMETRO_EXPORTAR) || tipo !== '')
  const filtros: Partial<FiltrosExportacion> = {}
  for (const clave of FILTROS_PRECARGA) {
    const valor = parametros.get(clave)
    if (valor) filtros[clave] = valor
  }

  const abrir = useCallback(() => {
    const nuevos = new URLSearchParams(parametros)
    nuevos.delete(PARAMETRO_INDICADOR)
    nuevos.delete(PARAMETRO_INFORME)
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
    for (const clave of [...PARAMETROS_EXPORTAR, 'mes']) nuevos.delete(clave)
    setParametros(nuevos, { replace: true })
  }, [navegar, parametros, setParametros, ubicacion.state])

  return { abierto, tipo, formato, filtros, abrir, cerrar }
}
