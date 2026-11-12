/**
 * Opciones de los filtros de cuadrilla, sector y lugar del calendario (AV-266). Cada catálogo se pide a su módulo
 * dueño: cuadrillas a MOD-04 (`operacion-campo/cuadrillas/`), sectores y lugares (áreas verdes) a MOD-02
 * (`inventario/sectores` y `inventario/areas-verdes`). Si un catálogo falla, solo su selector queda bloqueado con el
 * motivo y el calendario sigue funcionando.
 */
import { useConsulta } from '@/hooks/useConsulta'
import { listarAreasVerdes } from '@/services/api/areasVerdes'
import { listarSectores } from '@/services/api/catalogosInventario'
import { listarCuadrillasCampo } from '@/services/api/operacionCampo'
import type { AreaVerde } from '@/types/areasVerdes'
import type { OpcionFiltro } from './calendarioCapas'

export const MOTIVO_CATALOGO_NO_DISPONIBLE = 'No se pudo cargar la lista. Vuelve a abrir los filtros más tarde'

/** Páginas de áreas verdes que se cargan como máximo (seguro frente a un `next` que no termina). */
const PAGINAS_MAXIMAS = 50

async function todasLasAreas(signal: AbortSignal): Promise<AreaVerde[]> {
  const areas: AreaVerde[] = []
  for (let page = 1; page <= PAGINAS_MAXIMAS; page++) {
    const pagina = await listarAreasVerdes('', signal, { page })
    areas.push(...pagina.results)
    if (!pagina.next) break
  }
  return areas
}

const aOpciones = (elementos: { id: number; nombre: string }[]): OpcionFiltro[] =>
  elementos.map((e) => ({ valor: String(e.id), texto: e.nombre })).sort((a, b) => a.texto.localeCompare(b.texto, 'es'))

export interface CatalogosCalendario {
  cuadrillas: OpcionFiltro[]
  sectores: OpcionFiltro[]
  lugares: OpcionFiltro[]
  /** Si el catálogo falló, el motivo para bloquear su selector. */
  motivoCuadrillas?: string
  motivoSectores?: string
  motivoLugares?: string
}

export function useCatalogosCalendario(): CatalogosCalendario {
  const cuadrillas = useConsulta('calendario-cuadrillas', listarCuadrillasCampo)
  const sectores = useConsulta('calendario-sectores', (signal) => listarSectores(false, signal))
  const lugares = useConsulta('calendario-lugares', todasLasAreas)
  return {
    cuadrillas: aOpciones(cuadrillas.datos ?? []),
    sectores: aOpciones(sectores.datos ?? []),
    lugares: aOpciones(lugares.datos ?? []),
    motivoCuadrillas: cuadrillas.estado === 'error' ? MOTIVO_CATALOGO_NO_DISPONIBLE : undefined,
    motivoSectores: sectores.estado === 'error' ? MOTIVO_CATALOGO_NO_DISPONIBLE : undefined,
    motivoLugares: lugares.estado === 'error' ? MOTIVO_CATALOGO_NO_DISPONIBLE : undefined,
  }
}
