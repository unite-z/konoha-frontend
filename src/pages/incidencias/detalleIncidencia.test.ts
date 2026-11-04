import { describe, expect, it } from 'vitest'
import { incidenciaSimulada } from '@/services/simulados/incidencias'
import { descripcionTercerizada, textoEjemplar, textoReporto, textoUbicacion, viaSugerida } from './detalleIncidencia'

const ahora = Date.parse('2026-11-04T14:20:00-05:00')

describe('detalleIncidencia', () => {
  it('sugiere el proveedor tercerizado con un árbol de 5 m o más (Figma 388-7305)', () => {
    const alta = incidenciaSimulada(41, ahora)
    const baja = incidenciaSimulada(39, ahora)
    expect(alta && viaSugerida(alta)).toBe('Tercerizada')
    expect(alta && descripcionTercerizada(alta)).toBe('Sugerido: árbol de 5 m o más (7 m)')
    expect(baja && viaSugerida(baja)).toBe('PersonalPropio')
    expect(baja && descripcionTercerizada(baja)).toBe('Requerimiento a un proveedor')
  })

  it('escribe la ubicación, el ejemplar y quién la reportó', () => {
    const incidencia = incidenciaSimulada(41, ahora)
    expect(incidencia && textoUbicacion(incidencia)).toBe('Jardín de la Biblioteca · Ciencias')
    expect(incidencia && textoEjemplar(incidencia)).toBe('T-0412 · Ficus · 7 m')
    expect(incidencia && textoReporto(incidencia, '2026-11-04')).toBe('Ana Q. · app móvil · hoy 11:50')
  })
})
