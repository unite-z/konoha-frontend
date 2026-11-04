import { afterEach, describe, expect, it, vi } from 'vitest'
import { descartarSimulado, manualSimulado, simularObtenerFotografia, solicitarSimulado, validarSimulado } from './evidenciaFitosanitariaIa'

afterEach(() => {
  vi.unstubAllGlobals()
})

const foto = (nombre = 'hoja.jpg') => new File(['x'], nombre, { type: 'image/jpeg' })

describe('datos simulados de RF-IA-006', () => {
  it('Ficus: hipótesis de queresa y fumagina, sin validar, y guarda la imagen de la sesión', async () => {
    const s = solicitarSimulado({ ejemplar_id: 412, sintomas: 'Puntos blancos' }, [foto()])
    expect(s.estado).toBe('Propuesta')
    expect(s.contenido.hipotesis.map((h) => h.nombre)).toEqual(['Queresa', 'Fumagina'])
    expect(s.contenido).toMatchObject({ calidad_suficiente: true, contexto_reducido: false, suficiencia: 'suficiente', validacion: null })
    const blob = await simularObtenerFotografia(s.id, s.contenido.fotografias[0].archivo_id)
    expect(blob.size).toBe(1)
  })

  it('especie no identificada: menos contexto; calidad insuficiente: sin hipótesis', () => {
    const sinEspecie = solicitarSimulado({ ejemplar_id: 630, sintomas: 'Hojas amarillas' }, [foto()])
    expect(sinEspecie.contenido.contexto_reducido).toBe(true)
    expect(sinEspecie.contenido.limitaciones).toContain('La especie no está identificada: hay menos contexto')

    vi.stubGlobal('location', { search: '?simular=calidad-insuficiente' })
    const mala = solicitarSimulado({ ejemplar_id: 412 }, [foto('a.jpg'), foto('b.jpg')])
    expect(mala.contenido).toMatchObject({ calidad_suficiente: false, hipotesis: [] })
    expect(mala.contenido.fotografias.map((f) => f.motivo_calidad)).toEqual(['Imagen desenfocada', 'La planta ocupa menos del 20 % de la imagen'])
  })

  it('valida una hipótesis del análisis, y no dos veces', () => {
    const s = solicitarSimulado({ atencion_id: 52, sintomas: 'Hojas caídas' }, [foto()])
    expect(() => validarSimulado(s.id, { resultado: 'Confirmada', hipotesis_clave: 'queresa', categoria: 'Plaga', plaga_id: 1, nombre: 'Queresa', comentario: null })).toThrow(
      'no pertenece',
    )
    const v = validarSimulado(s.id, { resultado: 'NoConcluyente', hipotesis_clave: null, categoria: null, plaga_id: null, nombre: null, comentario: null })
    expect(v.estado).toBe('Validada')
    expect(v.contenido.hipotesis.length).toBe(2)
    expect(() => descartarSimulado(s.id)).toThrow('ya fue revisado')
  })

  it('la evaluación manual queda validada, sin hipótesis', () => {
    const m = manualSimulado({ resultado: 'OtraCategoria', categoria: 'Plaga', plaga_id: 4, nombre: 'Pulgón', comentario: null, ejemplar_id: 519, atencion_id: null })
    expect(m).toMatchObject({ estado: 'Validada', contenido: { origen: 'manual', hipotesis: [], validacion: { resultado: 'OtraCategoria', nombre: 'Pulgón' } } })
  })
})
