import { describe, expect, it } from 'vitest'
import type { FormatoReporte } from '../types/tercerizados'
import {
  avanceObligatorios,
  borradorInicial,
  datosParaEnviar,
  etiquetaSubcampo,
  filaVacia,
  idCampo,
  idSubcampo,
  validarDatos,
  type FilaBorrador,
} from './datosInformeFinal'

/** El formato de Control fitosanitario (V73), más un campo de cada tipo restante. */
const formato: FormatoReporte = {
  id: 1,
  version: 1,
  tipo_servicio_id: 2,
  tipo_servicio_nombre: 'Control fitosanitario',
  campos: [
    { nombre_campo: 'Metrado', tipo_dato: 'Decimal', obligatorio: true, orden: 1, subcampos: null },
    {
      nombre_campo: 'Productos aplicados',
      tipo_dato: 'JSON',
      obligatorio: true,
      orden: 2,
      subcampos: [
        { nombre: 'producto', tipo_dato: 'Texto', descripcion: 'Nombre del producto' },
        { nombre: 'cantidad', tipo_dato: 'Decimal', descripcion: 'Cantidad total' },
      ],
    },
    { nombre_campo: 'Ruta recorrida', tipo_dato: 'Texto largo', obligatorio: true, orden: 3, subcampos: null },
    { nombre_campo: 'Operarios', tipo_dato: 'Entero', obligatorio: false, orden: 4, subcampos: null },
    { nombre_campo: 'Con charla técnica', tipo_dato: 'Booleano', obligatorio: false, orden: 5, subcampos: null },
    { nombre_campo: 'Fecha de cierre', tipo_dato: 'Fecha', obligatorio: false, orden: 6, subcampos: null },
  ],
}

function fila(valores: Record<string, string>): FilaBorrador {
  return { ...filaVacia(), valores }
}

describe('borradorInicial', () => {
  it('empieza vacío, con una fila en cada lista', () => {
    const borrador = borradorInicial(formato)
    expect(borrador.Metrado).toBe('')
    expect(borrador['Con charla técnica']).toBe('')
    expect(borrador['Productos aplicados']).toHaveLength(1)
  })

  it('propone los datos de la revisión anterior', () => {
    const borrador = borradorInicial(formato, {
      Metrado: '120.5',
      Operarios: 4,
      'Con charla técnica': false,
      'Productos aplicados': [{ producto: 'Abamectina', cantidad: '2' }, { producto: 'Azufre' }],
    })
    expect(borrador.Metrado).toBe('120.5')
    expect(borrador.Operarios).toBe('4')
    expect(borrador['Con charla técnica']).toBe('no')
    const filas = borrador['Productos aplicados'] as FilaBorrador[]
    expect(filas.map((f) => f.valores)).toEqual([
      { producto: 'Abamectina', cantidad: '2' },
      { producto: 'Azufre', cantidad: '' },
    ])
    expect(new Set(filas.map((f) => f.clave)).size).toBe(2)
  })
})

describe('validarDatos', () => {
  it('pide los obligatorios y lleva el error de una lista a su primera fila', () => {
    const borrador = borradorInicial(formato)
    const primera = (borrador['Productos aplicados'] as FilaBorrador[])[0]
    const errores = validarDatos(formato, borrador)
    expect(errores[idCampo(0)]).toBe('Completa «Metrado»')
    expect(errores[idSubcampo(1, primera?.clave ?? '', 0)]).toBe('Registra al menos una fila de «Productos aplicados»')
    expect(errores[idCampo(2)]).toBe('Completa «Ruta recorrida»')
    expect(Object.keys(errores)).toHaveLength(3)
  })

  it('sin filas, el error de la lista va al botón «Agregar fila»', () => {
    const errores = validarDatos(formato, { ...borradorInicial(formato), 'Productos aplicados': [] })
    expect(errores[idCampo(1)]).toMatch(/al menos una fila/)
  })

  it('comprueba el formato de cada valor', () => {
    const malo = fila({ producto: 'X', cantidad: '1,23456' })
    const errores = validarDatos(formato, {
      ...borradorInicial(formato),
      Metrado: '12.5.1',
      'Productos aplicados': [malo],
      'Ruta recorrida': 'R',
      Operarios: '2,5',
    })
    expect(errores[idCampo(0)]).toMatch(/número/)
    expect(errores[idSubcampo(1, malo.clave, 1)]).toBe('Usa como máximo 4 decimales')
    expect(errores[idCampo(3)]).toBe('Escribe un número entero')
  })

  it('acepta un borrador completo', () => {
    expect(
      validarDatos(formato, {
        ...borradorInicial(formato),
        Metrado: '1 250,5',
        'Productos aplicados': [fila({ producto: 'X' })],
        'Ruta recorrida': 'Jardín A',
      }),
    ).toEqual({})
  })
})

describe('datosParaEnviar', () => {
  it('normaliza los números y omite los campos y las filas vacías', () => {
    expect(
      datosParaEnviar(formato, {
        ...borradorInicial(formato),
        Metrado: ' 1 250,5 ',
        'Productos aplicados': [fila({ producto: ' Abamectina ', cantidad: '2,5' }), fila({ producto: ' ' }), filaVacia()],
        'Ruta recorrida': 'Jardín A',
        'Con charla técnica': 'si',
        'Fecha de cierre': '2026-11-10',
      }),
    ).toEqual({
      Metrado: '1250.5',
      'Productos aplicados': [{ producto: 'Abamectina', cantidad: '2.5' }],
      'Ruta recorrida': 'Jardín A',
      'Con charla técnica': true,
      'Fecha de cierre': '2026-11-10',
    })
  })
})

describe('avanceObligatorios', () => {
  it('cuenta los obligatorios con dato', () => {
    const borrador = { ...borradorInicial(formato), Metrado: '3', 'Productos aplicados': [fila({ cantidad: '1' })] }
    expect(avanceObligatorios(formato, borrador)).toEqual({ completos: 2, total: 3 })
  })
})

describe('etiquetaSubcampo', () => {
  it('da una etiqueta legible', () => {
    expect(etiquetaSubcampo({ nombre: 'nombre_cientifico', tipo_dato: 'Texto', descripcion: '' })).toBe('Nombre científico')
    expect(etiquetaSubcampo({ nombre: 'unidad', tipo_dato: 'Texto', descripcion: '' })).toBe('Unidad')
  })
})
