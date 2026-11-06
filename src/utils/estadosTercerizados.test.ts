import { describe, expect, it } from 'vitest'
import type { CambioEstado } from '../types/tercerizados'
import { ESTADOS_ATENCION, fechasPorEstado, haTerminado, indiceEstado, insigniaEstado, pasosCiclo } from './estadosTercerizados'

describe('ciclo de la atención', () => {
  it('la línea de estados termina en «Conforme / cerrado» y solo incluye «Observado» mientras dura', () => {
    expect(pasosCiclo('Reporte adjunto').at(-1)).toBe('Conforme / cerrado')
    expect(pasosCiclo('Reporte adjunto')).not.toContain('Observado')
    expect(pasosCiclo('Observado').slice(-2)).toEqual(['Observado', 'Conforme / cerrado'])
  })

  it('la posición del estado actual se mide sobre los pasos que se muestran', () => {
    expect(indiceEstado('Reporte adjunto')).toBe(4)
    expect(indiceEstado('Conforme / cerrado')).toBe(5)
    expect(indiceEstado('Observado')).toBe(5)
  })

  it('todos los estados tienen insignia y «Observado» advierte', () => {
    for (const estado of ESTADOS_ATENCION) expect(insigniaEstado(estado).texto).toBe(estado)
    expect(insigniaEstado('Observado').tono).toBe('advertencia')
    expect(insigniaEstado('Conforme / cerrado').tono).toBe('exito')
  })

  it('ha terminado desde el fin del servicio, también observada y cerrada', () => {
    expect(ESTADOS_ATENCION.filter(haTerminado)).toEqual([
      'Ejecutado pendiente de reporte',
      'Reporte adjunto',
      'Observado',
      'Conforme / cerrado',
    ])
  })

  it('la fecha de cada paso es la de la última vez que se alcanzó', () => {
    const cambio = (estado_nuevo: CambioEstado['estado_nuevo'], fecha_hora: string): CambioEstado => ({
      estado_anterior: '',
      estado_nuevo,
      usuario_id: 1,
      usuario_nombre: null,
      fecha_hora,
    })
    const fechas = fechasPorEstado([
      cambio('Reporte adjunto', '2026-11-01T10:00:00-05:00'),
      cambio('Observado', '2026-11-02T10:00:00-05:00'),
      cambio('Reporte adjunto', '2026-11-03T10:00:00-05:00'),
    ])
    expect(fechas['Reporte adjunto']).toBe('2026-11-03T10:00:00-05:00')
  })
})
