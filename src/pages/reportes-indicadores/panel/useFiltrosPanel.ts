/**
 * Filtros del panel de indicadores y de su detalle, en la URL (HU-MOD06-001, criterio 3: el detalle mantiene
 * los filtros). Panel y detalle comparten las mismas claves, así que pasar de uno a otro conserva el filtro.
 *
 * `page` solo la usa el detalle; cualquier cambio de filtros la quita (vuelve a la página 1).
 */
import { useMemo } from 'react'
import { useFiltrosUrl } from '../../../hooks/useFiltrosUrl'
import type { Periodo } from '../../../types/comun'
import { semanaActual } from '../../../utils/formato'
import { aConsultaGestion } from '../../../utils/reportesGestion'

/** Filtros opcionales, además del periodo. */
export const CAMPOS_OPCIONALES = ['area_verde_id', 'tipo_servicio_id', 'estado', 'modalidad'] as const

export type CampoOpcionalPanel = (typeof CAMPOS_OPCIONALES)[number]

export type BorradorPanel = Record<CampoOpcionalPanel, string>

/** Todos los filtros opcionales a null (para `establecer`), junto con la página. */
function sinOpcionales(): Record<CampoOpcionalPanel | 'page', null> {
  return { area_verde_id: null, tipo_servicio_id: null, estado: null, modalidad: null, page: null }
}

export function useFiltrosPanel() {
  // SUPUESTO (pendiente de confirmar): periodo predeterminado = semana actual (pantalla 2: «resume la semana»),
  // el mismo que RF-REP-006.
  const predeterminado = useMemo(() => semanaActual(), [])
  const { filtros, establecer } = useFiltrosUrl({
    ...predeterminado,
    area_verde_id: '',
    tipo_servicio_id: '',
    estado: '',
    modalidad: '',
    page: '',
  })

  const aplicados: BorradorPanel = {
    area_verde_id: filtros.area_verde_id,
    tipo_servicio_id: filtros.tipo_servicio_id,
    estado: filtros.estado,
    modalidad: filtros.modalidad,
  }
  const claveAplicados = JSON.stringify(aplicados)
  const hayFiltros = CAMPOS_OPCIONALES.some((campo) => aplicados[campo] !== '')

  // Consulta tipada de la API. Las páginas consultan con una clave de `useConsulta` (periodo + claveAplicados),
  // así que no hace falta memorizarla.
  const consulta = aConsultaGestion({ desde: filtros.desde, hasta: filtros.hasta, ...aplicados })

  /** Fija el periodo y los filtros opcionales y vuelve a la página 1. */
  function aplicar(periodo: Periodo, borrador: BorradorPanel) {
    establecer({ ...periodo, ...borrador, page: null })
  }

  /** Quita un filtro opcional (chip) y vuelve a la página 1. */
  function quitar(clave: string) {
    const campo = CAMPOS_OPCIONALES.find((c) => c === clave)
    if (campo) establecer({ [campo]: null, page: null })
  }

  /** Quita todos los filtros opcionales (conserva el periodo). */
  function limpiar() {
    establecer(sinOpcionales())
  }

  return { filtros, aplicados, claveAplicados, hayFiltros, consulta, aplicar, quitar, limpiar, establecer }
}

export type FiltrosPanel = ReturnType<typeof useFiltrosPanel>
