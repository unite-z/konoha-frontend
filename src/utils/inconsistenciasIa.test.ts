import { describe, expect, it } from 'vitest'
import type { RegistroImplicado, SugerenciaInconsistencia, TipoHallazgo } from '../types/inconsistenciasIa'
import { contarPorEstado, contarPorTipo, filasComparacion, filtrosDesdeUrl, rutaRegistro, textoDatoObservado } from './inconsistenciasIa'

function registro(codigo: string, campos: Record<string, string | null>): RegistroImplicado {
  return { entidad: 'ejemplar', registro_id: 1, codigo, etiqueta: codigo, campos }
}

describe('filasComparacion', () => {
  it('une los campos en orden y marca los distintos', () => {
    const filas = filasComparacion([
      registro('EJ-1', { Especie: 'Ficus', Coordenadas: '-12.069, -77.079' }),
      registro('EJ-2', { Especie: 'Ficus', Coordenadas: '-12.0691, -77.079', Estado: 'Estable' }),
    ])
    expect(filas).toEqual([
      { campo: 'Especie', valores: ['Ficus', 'Ficus'], distinto: false },
      { campo: 'Coordenadas', valores: ['-12.069, -77.079', '-12.0691, -77.079'], distinto: true },
      { campo: 'Estado', valores: [null, 'Estable'], distinto: true },
    ])
  })
})

describe('textoDatoObservado', () => {
  it('campo y valor, solo uno o sin valor', () => {
    expect(textoDatoObservado({ campo_observado: 'Metrado', valor_observado: '48 000 m²' })).toBe('Metrado: 48 000 m²')
    expect(textoDatoObservado({ campo_observado: null, valor_observado: 'Jardin central' })).toBe('Jardin central')
    expect(textoDatoObservado({ campo_observado: null, valor_observado: null })).toBe('—')
  })
})

describe('recuentos', () => {
  const s = (estado: SugerenciaInconsistencia['estado'], tipo: TipoHallazgo) =>
    ({ estado, contenido: { tipo_hallazgo: tipo } }) as SugerenciaInconsistencia
  const lista = [s('Propuesta', 'Duplicado'), s('Propuesta', 'ValorAtipico'), s('Validada', 'Duplicado')]

  it('por estado y por tipo', () => {
    expect(contarPorEstado(lista)).toEqual({ Propuesta: 2, Validada: 1, Rechazada: 0 })
    expect(contarPorTipo(lista)).toEqual({ Duplicado: 2, ValorAtipico: 1, CamposIncompatibles: 0, NombreNoNormalizado: 0 })
  })
})

describe('rutaRegistro', () => {
  it('la atención abre su ficha; los demás, su listado; lo desconocido, nada', () => {
    expect(rutaRegistro({ entidad: 'atencion', registro_id: 7 })).toEqual({ ruta: '/servicios-tercerizados/atenciones/7', texto: 'Abrir la atención' })
    expect(rutaRegistro({ entidad: 'ejemplar', registro_id: 7 })?.texto).toBe('Buscar en Ejemplares')
    expect(rutaRegistro({ entidad: 'proveedor', registro_id: 7 })?.ruta).toBe('/servicios-tercerizados/proveedores-contratos')
    expect(rutaRegistro({ entidad: 'incidencia', registro_id: 7 })).toBeNull()
  })
})

describe('filtrosDesdeUrl', () => {
  it('ignora los valores desconocidos', () => {
    expect(filtrosDesdeUrl({ estado: 'Validada', tipo: 'Duplicado', conjunto: 'Otro', page: 'x' })).toEqual({
      estado: 'Validada',
      tipo_hallazgo: 'Duplicado',
      conjunto: undefined,
      page: 1,
    })
  })
})
