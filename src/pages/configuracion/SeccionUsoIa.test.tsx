// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UsoIa } from '@/types/ia'
import SeccionUsoIa, { usd } from './SeccionUsoIa'

const api = vi.hoisted(() => ({ obtenerUsoIa: vi.fn() }))
vi.mock('@/services/api/usoIa', () => api)

const metricas = {
  llamadas: 0,
  fallidas: 0,
  duracion_media_ms: null,
  tokens_entrada: 0,
  tokens_salida: 0,
  tokens_cache: 0,
  coste_usd: null,
  sin_coste: 0,
}

const USO: UsoIa = {
  desde: '2026-11-01',
  hasta: '2026-11-30',
  totales: {
    ...metricas,
    llamadas: 3,
    fallidas: 1,
    duracion_media_ms: 8000,
    duracion_p95_ms: 20000,
    tokens_entrada: 2000000,
    coste_usd: 0.546,
  },
  por_asistente: [
    { ...metricas, asistente: 'cronograma', llamadas: 2, fallidas: 1, coste_usd: 0.273 },
    { ...metricas, asistente: 'priorizacion', llamadas: 1, coste_usd: 0.273 },
  ],
  por_modelo: [
    {
      ...metricas,
      proveedor: 'DeepSeek',
      modelo: 'deepseek-flash',
      llamadas: 2,
      coste_usd: 0.546,
      duracion_media_ms: 2000,
    },
  ],
  por_dia: [{ ...metricas, fecha: '2026-11-10', llamadas: 3, fallidas: 1, coste_usd: 0.546 }],
  historial: [
    {
      id: 3,
      solicitado_en: '2026-11-10T17:00:00Z',
      asistente: 'cronograma',
      proveedor: 'Gemini (Google AI Studio)',
      modelo: 'gemini-3.8-flash',
      duracion_ms: 20000,
      correcto: false,
      error: 'No se pudo',
      tokens_entrada: null,
      tokens_salida: null,
      coste_usd: null,
    },
  ],
}

beforeEach(() => {
  api.obtenerUsoIa.mockReset().mockResolvedValue(USO)
})

afterEach(cleanup)

describe('Configuración · Uso y costes de la IA (AV-396)', () => {
  it('pide el mes elegido y muestra coste, llamadas, errores y tiempos', async () => {
    render(<SeccionUsoIa mesInicial="2026-11" />)
    expect((await screen.findAllByText('0,55 US$')).length).toBeGreaterThan(0)
    expect(api.obtenerUsoIa).toHaveBeenCalledWith('2026-11-01', '2026-11-30', expect.anything())
    expect(screen.getByText('1 fallidas')).toBeTruthy()
    expect(screen.getByText('33')).toBeTruthy()
    expect(screen.getByText('El 95 % tarda menos de 20 s')).toBeTruthy()
    expect(screen.getAllByText('Planificación asistida').length).toBeGreaterThan(0)
    expect(screen.getByText('DeepSeek · deepseek-flash')).toBeTruthy()
    expect(screen.getByText('2026-11-10 12:00')).toBeTruthy()
    expect(screen.getByText('Fallida')).toBeTruthy()
  })

  it('formatea los importes pequeños con más decimales', () => {
    expect(usd(0.0042)).toBe('0,0042 US$')
    expect(usd(1.5)).toBe('1,50 US$')
    expect(usd(null)).toBe('—')
  })
})
