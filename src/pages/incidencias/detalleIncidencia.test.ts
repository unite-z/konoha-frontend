import { describe, expect, it } from 'vitest'
import { incidenciaSimulada } from '@/services/simulados/incidencias'
import { descripcionTercerizada, horasHistorial, informeDelProveedor, textoEjemplar, textoReporto, textoTiempoCierre, textoUbicacion, viaSugerida } from './detalleIncidencia'

const ahora = Date.parse('2026-11-04T14:20:00-05:00')

describe('detalleIncidencia', () => {
  it('da la fecha del informe del proveedor solo cuando ya está hecho (AV-278)', () => {
    const derivada = incidenciaSimulada(37, ahora)
    if (!derivada?.requerimiento) throw new Error('sin requerimiento simulado')
    expect(informeDelProveedor(derivada)).toBeNull()
    const pasos = derivada.requerimiento.pasos.map((p) => (p.nombre === 'Informe del proveedor' ? { ...p, estado: 'Hecho' as const, fecha: '2026-11-03' } : p))
    expect(informeDelProveedor({ ...derivada, requerimiento: { ...derivada.requerimiento, pasos } })).toBe('2026-11-03')
  })

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

  it('escribe el tiempo de cierre y las horas del historial (Figma 390-7811)', () => {
    expect(textoTiempoCierre(145)).toBe('2 h 25 min')
    expect(textoTiempoCierre(40)).toBe('40 min')
    expect(textoTiempoCierre(60 * 50)).toBe('2 días 2 h')
    const eventos = [
      { texto: 'Cerrada · Robert G.', fecha_hora: '2026-11-04T11:45:00-05:00' },
      { texto: 'Atendida · Sistema', fecha_hora: '2026-11-04T11:40:00-05:00' },
      { texto: 'Registrada · Ana Q.', fecha_hora: '2026-11-03T09:20:00-05:00' },
    ]
    expect(horasHistorial(eventos, '2026-11-04')).toEqual(['hoy 11:45', '11:40', '03/11 09:20'])
  })
})

