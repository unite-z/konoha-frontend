import { describe, expect, it } from 'vitest'
import type { CampoSolicitado, SugerenciaIA } from '../../../../types/ia'
import {
  coberturaSugerencia,
  convertirCorreccion,
  MENSAJES,
  partirEnLineas,
  pasaFiltro,
  textoObjeto,
  textoValorSimple,
  valorATexto,
} from './valoresCampo'

const campo = (cambios: Partial<CampoSolicitado> = {}): CampoSolicitado => ({
  campo_id: 1,
  nombre_campo: 'Metrado',
  tipo_dato: 'Decimal',
  obligatorio: true,
  ...cambios,
})

describe('convertirCorreccion', () => {
  it('convierte cada tipo', () => {
    expect(convertirCorreccion('Entero', ' 12 ')).toEqual({ valor: 12 })
    expect(convertirCorreccion('Decimal', '1250,5')).toEqual({ valor: 1250.5 })
    expect(convertirCorreccion('Booleano', 'no')).toEqual({ valor: false })
    expect(convertirCorreccion('Fecha', '2026-10-20')).toEqual({ valor: '2026-10-20' })
    expect(convertirCorreccion('JSON', '[{"a": 1}]')).toEqual({ valor: [{ a: 1 }] })
    expect(convertirCorreccion('Texto', 'hola')).toEqual({ valor: 'hola' })
  })

  it('explica qué falta o qué está mal', () => {
    expect(convertirCorreccion('Entero', '1,5')).toEqual({ error: MENSAJES.entero })
    expect(convertirCorreccion('Decimal', '')).toEqual({ error: MENSAJES.vacio })
    expect(convertirCorreccion('Booleano', '')).toEqual({ error: MENSAJES.booleano })
    expect(convertirCorreccion('JSON', '{"a": 1}')).toEqual({ error: MENSAJES.json })
    expect(convertirCorreccion(null, '   ')).toEqual({ error: MENSAJES.vacio })
  })
})

describe('presentación de valores', () => {
  it('prepara el texto de corrección', () => {
    expect(valorATexto('Decimal', 1.5)).toBe('1,5')
    expect(valorATexto('Booleano', true)).toBe('si')
    expect(valorATexto('Texto', null)).toBe('')
  })

  it('muestra valores simples y objetos', () => {
    expect(textoValorSimple(true)).toBe('Sí')
    expect(textoValorSimple(null)).toBe('—')
    expect(textoObjeto({ especie: 'Ficus', cantidad: true })).toBe('especie: Ficus · cantidad: Sí')
  })
})

describe('cobertura y filtros', () => {
  it('cuenta los datos con valor sugerido', () => {
    const sugerencia = {
      contenido: {
        entrada: { campos_solicitados: [campo(), campo({ campo_id: 2 })] },
        propuesta: { campo_1: { nombre_campo: 'Metrado', valor: 10 }, campo_2: { nombre_campo: 'X', valor: null } },
      },
    } as unknown as SugerenciaIA
    expect(coberturaSugerencia(sugerencia)).toEqual({ conValor: 1, total: 2 })
  })

  it('filtra pendientes, sin valor y obligatorios', () => {
    expect(pasaFiltro('pendientes', campo(), 1, undefined)).toBe(true)
    expect(pasaFiltro('pendientes', campo(), 1, 'aceptar')).toBe(false)
    expect(pasaFiltro('sin_valor', campo(), null, undefined)).toBe(true)
    expect(pasaFiltro('obligatorios', campo({ obligatorio: false }), 1, undefined)).toBe(false)
    expect(pasaFiltro('todos', campo(), null, 'descartar')).toBe(true)
  })
})

describe('partirEnLineas', () => {
  it('pone cada tramo horario en su línea', () => {
    expect(
      partirEnLineas('06:30 - 08:30: Tontódromo 08:30 - 09:30: Jardín Comedor Central 15:30 - 16:00: Lavado de equipos'),
    ).toEqual(['06:30 - 08:30: Tontódromo', '08:30 - 09:30: Jardín Comedor Central', '15:30 - 16:00: Lavado de equipos'])
  })

  it('respeta los saltos de línea y el texto previo', () => {
    expect(partirEnLineas('Uno\n\n Dos ')).toEqual(['Uno', 'Dos'])
    expect(partirEnLineas('Ruta: 06:30 - 08:30 Patio, 08:30 - 09:00 Huerto')).toEqual([
      'Ruta:',
      '06:30 - 08:30 Patio',
      '08:30 - 09:00 Huerto',
    ])
  })

  it('deja igual un texto corto o con un solo tramo', () => {
    expect(partirEnLineas('Poda de ficus')).toEqual(['Poda de ficus'])
    expect(partirEnLineas('De 06:30 - 08:30')).toEqual(['De 06:30 - 08:30'])
  })
})
