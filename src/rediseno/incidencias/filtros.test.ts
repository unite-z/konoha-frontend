import { describe, expect, it } from 'vitest'
import type { IncidenciaResumen } from '@/types/incidencias'
import {
  filtrosDeUrl,
  idMarcador,
  incidenciaDeMarcador,
  marcadoresDeIncidencias,
  paginaDeIncidencias,
  POR_PAGINA,
  tonoMarcador,
} from './filtros'

const AHORA = Date.parse('2026-11-26T12:00:00Z')
const hace = (horas: number) => new Date(AHORA - horas * 3_600_000).toISOString()

function incidencia(id: number, extra: Partial<IncidenciaResumen> = {}): IncidenciaResumen {
  return {
    id,
    codigo: `INC-${id}`,
    tipo: 'Hojarasca',
    tipo_sencilla: true,
    espacio: 'Patio',
    severidad: null,
    via: 'PersonalPropio',
    estado: 'Registrada',
    canal: 'App',
    fecha_registro: hace(1),
    fecha_cierre: null,
    responsable: null,
    area_verde_id: 5,
    ...extra,
  }
}

describe('filtros de la bandeja de incidencias', () => {
  it('lee grupo, búsqueda y página de la URL e ignora lo inválido', () => {
    expect(filtrosDeUrl(new URLSearchParams('grupo=cerradas&q=%20hoja%20&pagina=3'))).toEqual({
      grupo: 'cerradas',
      q: 'hoja',
      pagina: 3,
    })
    expect(filtrosDeUrl(new URLSearchParams('grupo=raro&pagina=-1'))).toEqual({ grupo: 'todas', q: '', pagina: 1 })
    expect(filtrosDeUrl(new URLSearchParams('pagina=0')).pagina).toBe(1)
  })

  it('pagina la lista del grupo de 25 en 25', () => {
    const todas = Array.from({ length: 30 }, (_, i) => incidencia(i + 1))
    expect(paginaDeIncidencias(todas, { grupo: 'todas', q: '', pagina: 1 }).filas).toHaveLength(POR_PAGINA)
    expect(paginaDeIncidencias(todas, { grupo: 'todas', q: '', pagina: 2 }).filas).toHaveLength(5)
  })

  it('el tono del marcador sigue el plazo y, si no, el estado', () => {
    expect(tonoMarcador(incidencia(1, { fecha_registro: hace(30) }), AHORA)).toBe('aviso')
    expect(tonoMarcador(incidencia(1, { fecha_registro: hace(42) }), AHORA)).toBe('error')
    expect(tonoMarcador(incidencia(1, { fecha_registro: hace(60) }), AHORA)).toBe('error')
    expect(tonoMarcador(incidencia(1, { estado: 'Cerrada', fecha_cierre: hace(0) }), AHORA)).toBe('exito')
    expect(tonoMarcador(incidencia(1), AHORA)).toBe('neutro')
  })

  it('un marcador por incidencia con su área; sin área o sin polígono no hay marcador', () => {
    const areas = new Map([[5, 'm-5']])
    const marcadores = marcadoresDeIncidencias(
      [
        incidencia(1),
        incidencia(2, { area_verde_id: null }),
        incidencia(3, { area_verde_id: undefined }),
        incidencia(4, { area_verde_id: 9 }),
      ],
      areas,
      AHORA,
    )
    expect(marcadores).toEqual([
      { id: idMarcador(1), etiqueta: 'INC-1 · Hojarasca · Patio', areaId: 'm-5', tono: 'neutro' },
    ])
    expect(incidenciaDeMarcador(marcadores[0])).toBe(1)
    expect(incidenciaDeMarcador({ id: 'otro', etiqueta: '' })).toBeNull()
  })
})
