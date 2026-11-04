import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clasificarManual,
  descartarClasificacion,
  listarClasificaciones,
  listarIncidenciasPendientes,
  obtenerClasificacion,
  solicitarClasificacion,
  validarClasificacion,
} from './clasificacionIncidenciaIa'

vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: false }))

afterEach(() => {
  vi.unstubAllGlobals()
})

function capturar(cuerpo: unknown = { id: 1 }, status = 200) {
  const peticion = vi.fn((_url: string, _opciones: RequestInit) => Promise.resolve(new Response(JSON.stringify(cuerpo), { status })))
  vi.stubGlobal('fetch', peticion)
  return peticion
}

const VALORES = { tipo_evento: 'Incidencia' as const, categoria: null, severidad: 'Alta' as const, via_atencion: 'Tercerizado' as const, es_sencilla: null }

describe('clasificaciones de incidencias con el backend (RF-IA-005)', () => {
  it('lista pendientes y análisis con sus filtros', async () => {
    const peticion = capturar({ count: 0, next: null, previous: null, results: [] })
    await listarIncidenciasPendientes({ q: 'ficus', page: 2 })
    await listarClasificaciones({ estado: 'Validada' })
    expect(peticion.mock.calls[0][0]).toBe('/api/v1/ia/clasificaciones-incidencia/pendientes/?q=ficus&page=2')
    expect(peticion.mock.calls[1][0]).toBe('/api/v1/ia/clasificaciones-incidencia/?estado=Validada')
  })

  it('solicita, valida, descarta y clasifica en manual con sus rutas y cuerpos', async () => {
    const peticion = capturar()
    await solicitarClasificacion(231)
    await obtenerClasificacion(5)
    await validarClasificacion(5, { por_campo: { severidad: { accion: 'corregir', valor_final: 'Media' } } })
    await descartarClasificacion(5, '')
    await clasificarManual({ incidencia_id: 231, valores: VALORES })
    expect(peticion.mock.calls.map(([url, o]) => `${o.method} ${url}`)).toEqual([
      'POST /api/v1/ia/clasificaciones-incidencia/',
      'GET /api/v1/ia/clasificaciones-incidencia/5/',
      'POST /api/v1/ia/clasificaciones-incidencia/5/validar/',
      'POST /api/v1/ia/clasificaciones-incidencia/5/rechazar/',
      'POST /api/v1/ia/clasificaciones-incidencia/manual/',
    ])
    expect(JSON.parse(String(peticion.mock.calls[0][1].body))).toEqual({ incidencia_id: 231 })
    expect(JSON.parse(String(peticion.mock.calls[2][1].body))).toEqual({ por_campo: { severidad: { accion: 'corregir', valor_final: 'Media' } } })
    expect(JSON.parse(String(peticion.mock.calls[4][1].body))).toEqual({ incidencia_id: 231, valores: VALORES })
  })

  it('el 503 de la IA llega como ErrorApi', async () => {
    capturar({ codigo: 'ia-no-disponible', detalle: 'IA no disponible' }, 503)
    await expect(solicitarClasificacion(231)).rejects.toMatchObject({ estado: 503 })
  })
})
