import { describe, expect, it } from 'vitest'
import { incidenciasSimuladas } from '@/services/simulados/incidencias'
import { alertasPlazo, contadoresBandeja, horasAbierta, incidenciasDePestana, nivelPlazo, superaObjetivo, textoAlertaPlazo, textoTiempoAbierta } from './bandeja'

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

  it('da el nivel de plazo: objetivo a las 24 h, cerca del máximo desde las 40 y vencida pasadas las 48 (AV-280)', () => {
    const alertas = alertasPlazo(incidencias, ahora)
    expect(alertas.map((a) => [a.incidencia.codigo, a.nivel])).toEqual([
      ['INC-2026-038', 'SuperaObjetivo'],
      ['INC-2026-036', 'CercaMaximo'],
    ])
    expect(textoAlertaPlazo(alertas[0])).toBe('Hojarasca en exceso · Patio de Letras · 31 h · Luis P.')
    const sencilla = incidencias.find((i) => i.id === 38)
    expect(sencilla && nivelPlazo(sencilla, 49)).toBe('Vencida')
  })
})
