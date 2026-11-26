/** Filtros de la bandeja en la URL y marcadores del mapa (RD-42). Lógica pura, con pruebas en `filtros.test.ts`. */
import {
  horasAbierta,
  incidenciasDePestana,
  nivelPlazo,
  PESTANAS_BANDEJA,
  type NivelPlazo,
  type PestanaBandeja,
} from '@/pages/incidencias/bandeja'
import type { IncidenciaResumen } from '@/types/incidencias'
import { fila } from '../base/movimiento'
import type { MarcadorMapa, TonoMarcador } from '../base/MapaCampus/marcadores'

export const POR_PAGINA = 25
export const LARGO_MAXIMO_BUSQUEDA = 100

export interface FiltrosIncidencias {
  grupo: PestanaBandeja
  q: string
  pagina: number
}

/** Lee de la URL el grupo, la búsqueda y la página; lo inválido se ignora. */
export function filtrosDeUrl(parametros: URLSearchParams): FiltrosIncidencias {
  const pedido = parametros.get('grupo')
  const grupo = PESTANAS_BANDEJA.find((p) => p.valor === pedido)?.valor ?? 'todas'
  const q = (parametros.get('q') ?? '').trim().slice(0, LARGO_MAXIMO_BUSQUEDA)
  const pagina = /^\d{1,6}$/.test(parametros.get('pagina') ?? '') ? Math.max(1, Number(parametros.get('pagina'))) : 1
  return { grupo, q, pagina }
}

/** Copia de la URL con los cambios aplicados (`null` quita el parámetro). */
export function conCambios(parametros: URLSearchParams, cambios: Record<string, string | null>): URLSearchParams {
  const nuevos = new URLSearchParams(parametros)
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === null || valor === '') nuevos.delete(clave)
    else nuevos.set(clave, valor)
  }
  return nuevos
}

/** Incidencias del grupo y, de ellas, las de la página (el servidor devuelve la lista entera). */
export function paginaDeIncidencias(incidencias: IncidenciaResumen[], filtros: FiltrosIncidencias) {
  const delGrupo = incidenciasDePestana(incidencias, filtros.grupo)
  const inicio = (filtros.pagina - 1) * POR_PAGINA
  return { delGrupo, filas: delGrupo.slice(inicio, inicio + POR_PAGINA) }
}

/**
 * Cambios de la URL para que la fila de `id` quede a la vista: su página dentro del grupo actual o, si el grupo no la
 * incluye (p. ej. un aviso de plazo con la pestaña «Cerradas»), en «Todas». `null` si ya se ve o no está en la bandeja.
 */
export function ubicarIncidencia(
  incidencias: IncidenciaResumen[],
  filtros: FiltrosIncidencias,
  id: number,
): Record<string, string | null> | null {
  let grupo = filtros.grupo
  let indice = incidenciasDePestana(incidencias, grupo).findIndex((i) => i.id === id)
  if (indice < 0) {
    grupo = 'todas'
    indice = incidencias.findIndex((i) => i.id === id)
  }
  if (indice < 0) return null
  const pagina = Math.floor(indice / POR_PAGINA) + 1
  if (grupo === filtros.grupo && pagina === filtros.pagina) return null
  return { grupo: grupo === 'todas' ? null : grupo, pagina: pagina > 1 ? String(pagina) : null }
}

const TONO_POR_ESTADO: Record<IncidenciaResumen['estado'], TonoMarcador> = {
  Registrada: 'neutro',
  Clasificada: 'info',
  DerivadaInterna: 'info',
  DerivadaTercerizada: 'info',
  EnAtencion: 'info',
  Atendida: 'aviso',
  Cerrada: 'exito',
  Descartada: 'neutro',
}

/** Rojo si está vencida o cerca del máximo, ámbar si supera el objetivo de 24 h; si no, el del estado. */
export function tonoMarcador(incidencia: IncidenciaResumen, ahora: number): TonoMarcador {
  const nivel = nivelPlazo(incidencia, horasAbierta(incidencia, ahora))
  if (nivel === 'SuperaObjetivo') return 'aviso'
  if (nivel) return 'error'
  return TONO_POR_ESTADO[incidencia.estado]
}

export const prefijoMarcador = 'incidencia-'

export const idMarcador = (id: number): string => `${prefijoMarcador}${id}`

/** Id de la incidencia de un marcador, o `null` si no es de este módulo. */
export function incidenciaDeMarcador(marcador: MarcadorMapa): number | null {
  if (!marcador.id.startsWith(prefijoMarcador)) return null
  const id = Number(marcador.id.slice(prefijoMarcador.length))
  return Number.isInteger(id) ? id : null
}

/**
 * Un marcador por incidencia en el centro de su área. El área se resuelve por `area_verde_id` (RD-84) y su `mapa_id`
 * (`areaMapa`); sin id de área o sin polígono, la incidencia no lleva marcador (nunca se busca por el nombre del espacio).
 */
export function marcadoresDeIncidencias(
  incidencias: readonly IncidenciaResumen[],
  areaMapa: ReadonlyMap<number, string>,
  ahora: number,
  seleccionada: number | null = null,
): MarcadorMapa[] {
  return incidencias.flatMap((i) => {
    const areaId = i.area_verde_id == null ? undefined : areaMapa.get(i.area_verde_id)
    if (areaId === undefined) return []
    return [
      {
        id: idMarcador(i.id),
        etiqueta: `${i.codigo} · ${i.tipo} · ${i.espacio}${i.id === seleccionada ? ' · seleccionada' : ''}`,
        areaId,
        tono: tonoMarcador(i, ahora),
      },
    ]
  })
}

/** Los tres avisos, del más leve al más grave, con el umbral que enseña la cabecera. */
export const AVISOS_PLAZO: { nivel: NivelPlazo; umbral: string }[] = [
  { nivel: 'SuperaObjetivo', umbral: '24 h' },
  { nivel: 'CercaMaximo', umbral: '40 h' },
  { nivel: 'Vencida', umbral: '48 h' },
]

/** Nombre de la transición de la fila de una incidencia: el detalle (RD-43) usa el mismo con `panel()`. */
export function nombreFilaIncidencia(id: number): string {
  return fila(`incidencia-${id}`)
}
