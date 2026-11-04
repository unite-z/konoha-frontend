import { describe, expect, it } from 'vitest'
import type { HipotesisFitosanitaria } from '@/types/evidenciaFitosanitariaIa'
import {
  cuerpoValidacion,
  estadoEvidencia,
  FORMULARIO_VACIO,
  formularioEvidencia,
  hipotesisPrincipal,
  opcionHipotesis,
  ordenarHipotesis,
  textoConfianza,
  textoResultado,
  validarArchivosImagen,
} from './evidenciaFitosanitariaIa'

const imagen = (nombre: string, tipo = 'image/jpeg', bytes = 10) => new File([new Uint8Array(bytes)], nombre, { type: tipo })

const hipotesis = (clave: string, confianza: number | null, nivel: HipotesisFitosanitaria['nivel_confianza']): HipotesisFitosanitaria => ({
  clave,
  categoria: 'Plaga',
  nombre: clave,
  plaga_id: null,
  confianza,
  nivel_confianza: nivel,
  evidencias: [],
})

describe('fotografías (RF-IA-006)', () => {
  it('admite JPG, PNG y WEBP de hasta 10 MB y como máximo 5', () => {
    const grande = imagen('grande.png', 'image/png', 10 * 1024 * 1024 + 1)
    const r = validarArchivosImagen([imagen('a.jpg'), imagen('b.gif', 'image/gif'), grande, imagen('c.webp', 'image/webp')], 4)
    expect(r.aceptados.map((a) => a.name)).toEqual(['a.jpg'])
    expect(r.errores).toEqual(['b.gif: usa una imagen JPG, PNG o WEBP', 'grande.png: supera los 10 MB', 'c.webp: solo se admiten 5 fotografías'])
  })

  it('arma el multipart con datos en JSON (sin vacíos) y una parte por foto', () => {
    const f = formularioEvidencia({ ejemplar_id: 412, sintomas: '  ', archivo_ids: [] }, [imagen('a.jpg'), imagen('b.png', 'image/png')])
    expect(JSON.parse(String(f.get('datos')))).toEqual({ ejemplar_id: 412 })
    expect(f.getAll('fotografias').map((a) => (a as File).name)).toEqual(['a.jpg', 'b.png'])
  })
})

describe('hipótesis', () => {
  it('ordena por confianza con las inciertas al final y da el texto', () => {
    const orden = ordenarHipotesis([hipotesis('incierta', null, 'Incierta'), hipotesis('baja', 0.31, 'Baja'), hipotesis('media', 0.62, 'Media')])
    expect(orden.map((h) => h.clave)).toEqual(['media', 'baja', 'incierta'])
    expect(textoConfianza(orden[0])).toBe('Media · 62 %')
    expect(textoConfianza(orden[2])).toBe('Incierta')
  })

  it('resume la hipótesis principal o la calidad insuficiente', () => {
    expect(hipotesisPrincipal({ origen: 'ia', calidad_suficiente: true, hipotesis: [hipotesis('Fumagina', 0.3, 'Baja'), hipotesis('Queresa', 0.6, 'Media')] })).toBe('Queresa · Media')
    expect(hipotesisPrincipal({ origen: 'ia', calidad_suficiente: false, hipotesis: [] })).toBe('Calidad insuficiente')
    expect(hipotesisPrincipal({ origen: 'manual', calidad_suficiente: true, hipotesis: [] })).toBe('Evaluación manual')
  })
})

describe('validación técnica', () => {
  const lista = [hipotesis('queresa', 0.62, 'Media')]

  it('exige elegir una opción y, en «otra categoría», la categoría', () => {
    expect(cuerpoValidacion(FORMULARIO_VACIO, lista).errores.opcion).toBeDefined()
    expect(cuerpoValidacion({ ...FORMULARIO_VACIO, opcion: 'otra' }, lista).errores.categoria).toBe('Elige la categoría de afectación')
  })

  it('limpia los campos según el resultado', () => {
    const confirmada = cuerpoValidacion({ ...FORMULARIO_VACIO, opcion: opcionHipotesis('queresa'), categoria: 'Otra', nombre: 'x', comentario: ' ok ' }, lista)
    expect(confirmada.cuerpo).toEqual({ resultado: 'Confirmada', hipotesis_clave: 'queresa', categoria: 'Plaga', plaga_id: null, nombre: 'queresa', comentario: 'ok' })
    const otra = cuerpoValidacion({ ...FORMULARIO_VACIO, opcion: 'otra', categoria: 'EstresHidrico', nombre: '' }, lista)
    expect(otra.cuerpo).toMatchObject({ resultado: 'OtraCategoria', categoria: 'EstresHidrico', nombre: null, hipotesis_clave: null })
    const nada = cuerpoValidacion({ ...FORMULARIO_VACIO, opcion: 'no-concluyente', categoria: 'Plaga', nombre: 'x' }, lista)
    expect(nada.cuerpo).toMatchObject({ resultado: 'NoConcluyente', categoria: null, nombre: null })
  })

  it('textos del resultado y del estado', () => {
    expect(textoResultado({ resultado: 'Confirmada', categoria: 'Plaga', nombre: 'Queresa' })).toBe('Confirmada: Queresa')
    expect(textoResultado({ resultado: 'OtraCategoria', categoria: 'Plaga', nombre: 'Pulgón' })).toBe('Otra categoría: Plaga · Pulgón')
    expect(textoResultado({ resultado: 'NoConcluyente', categoria: null, nombre: null })).toBe('Pendiente de diagnóstico')
    expect(estadoEvidencia('Validada', { resultado: 'NoConcluyente' }).texto).toBe('Pendiente de diagnóstico')
    expect(estadoEvidencia('Propuesta', null).texto).toBe('Pendiente de validación')
  })
})
