import { describe, expect, it } from 'vitest'
import { incidenciasSimuladas } from '@/services/simulados/incidencias'
import { contadoresBandeja, horasAbierta, incidenciasDePestana, superaObjetivo, textoTiempoAbierta } from './bandeja'

const ahora = Date.parse('2026-11-04T12:00:00-05:00')
const incidencias = incidenciasSimuladas(ahora)

describe('bandeja de incidencias', () => {
  it('agrupa los 8 estados en tres pestañas', () => {
    expect(contadoresBandeja(incidencias)).toEqual({ todas: 9, abiertas: 3, enProceso: 4, cerradas: 2 })
    expect(incidenciasDePestana(incidencias, 'cerradas').map((i) => i.estado)).toEqual(['Cerrada', 'Descartada'])
  })

  it('cuenta las horas abierta hasta el cierre o hasta ahora', () => {
    const hojarasca = incidencias.find((i) => i.id === 38)
    const cerrada = incidencias.find((i) => i.id === 34)
    expect(hojarasca && horasAbierta(hojarasca, ahora)).toBe(31)
    expect(cerrada && horasAbierta(cerrada, ahora)).toBe(20)
    expect(textoTiempoAbierta(31)).toBe('31 h')
    expect(textoTiempoAbierta(170)).toBe('7 días')
  })

  it('solo las sencillas del personal propio sin atender pasan el plazo objetivo de 24 h (RN-019)', () => {
    const porId = (id: number) => incidencias.find((i) => i.id === id)
    const casos = [38, 37, 35, 39].map((id) => {
      const incidencia = porId(id)
      return incidencia ? superaObjetivo(incidencia, horasAbierta(incidencia, ahora)) : null
    })
    expect(casos).toEqual([true, false, false, false])
  })
})
