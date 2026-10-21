import { describe, expect, it } from 'vitest'
import { validarEjecucion, validarOrdenCompra } from './validacionTercerizados'

describe('validarOrdenCompra', () => {
  it('exige el número', () => {
    expect(validarOrdenCompra({ numero: '  ', motivo: '' }, false).numero).toMatch(/número/)
  })

  it('acepta una OC nueva sin motivo', () => {
    expect(validarOrdenCompra({ numero: ' OC-2026-001 ', motivo: '' }, false)).toEqual({})
  })

  it('limita el largo a 30 caracteres', () => {
    expect(validarOrdenCompra({ numero: 'x'.repeat(30), motivo: '' }, false)).toEqual({})
    expect(validarOrdenCompra({ numero: 'x'.repeat(31), motivo: '' }, false).numero).toMatch(/30/)
  })

  it('la corrección exige motivo y un número distinto', () => {
    expect(validarOrdenCompra({ numero: 'OC-2', motivo: ' ' }, true, 'OC-1').motivo).toMatch(/por qué/)
    expect(validarOrdenCompra({ numero: 'OC-1', motivo: 'Error' }, true, 'OC-1').numero).toMatch(/igual/)
    expect(validarOrdenCompra({ numero: 'OC-2', motivo: 'Logística reemitió la orden' }, true, 'OC-1')).toEqual({})
  })
})

describe('validarEjecucion', () => {
  const ahora = new Date('2026-10-21T15:00:00Z') // 10:00 en Lima

  it('exige una fecha válida', () => {
    expect(validarEjecucion('inicio', '', null, ahora).error).toMatch(/inicio/)
    expect(validarEjecucion('fin', '', null, ahora).error).toMatch(/fin/)
    expect(validarEjecucion('inicio', '2026-02-30T08:00', null, ahora).error).toMatch(/válidas/)
  })

  it('acepta una hora pasada sin advertencias', () => {
    expect(validarEjecucion('inicio', '2026-10-21T08:00', null, ahora)).toEqual({})
  })

  it('advierte (sin bloquear) si la hora es futura en Lima', () => {
    const resultado = validarEjecucion('inicio', '2026-10-21T10:30', null, ahora)
    expect(resultado.error).toBeUndefined()
    expect(resultado.advertencia).toMatch(/posteriores/)
  })

  it('el fin no puede ser anterior al inicio', () => {
    const inicio = '2026-10-21T08:00:00-05:00'
    expect(validarEjecucion('fin', '2026-10-21T07:59', inicio, ahora).error).toMatch(/anterior/)
    expect(validarEjecucion('fin', '2026-10-21T08:00', inicio, ahora)).toEqual({})
    expect(validarEjecucion('fin', '2026-10-21T09:30', inicio, ahora)).toEqual({})
  })

  it('compara el inicio al minuto aunque tenga segundos o venga en UTC', () => {
    expect(validarEjecucion('fin', '2026-10-21T08:00', '2026-10-21T13:00:45Z', ahora)).toEqual({})
    expect(validarEjecucion('fin', '2026-10-21T07:59', '2026-10-21T13:00:45Z', ahora).error).toBeDefined()
  })
})

describe('validarReporte', async () => {
  const { validarReporte, hayErroresReporte, problemaArchivo, categoriaSugerida } = await import('./validacionTercerizados')
  const doc = (clave: string, cambios = {}) => ({
    clave,
    archivo: { name: 'informe.pdf', size: 1200 },
    categoria: 'InformeFinal',
    alcance_id: '',
    descripcion: '',
    ...cambios,
  })

  it('acepta una revisión con informe final', () => {
    expect(hayErroresReporte(validarReporte({ fecha: '2026-10-21', documentos: [doc('a')] }, '2026-10-20'))).toBe(false)
  })

  it('la recepción no precede al fin', () => {
    expect(validarReporte({ fecha: '2026-10-19', documentos: [doc('a')] }, '2026-10-20').fecha).toMatch(/anterior/)
    expect(validarReporte({ fecha: '2026-10-20', documentos: [doc('a')] }, '2026-10-20').fecha).toBeUndefined()
    expect(validarReporte({ fecha: '', documentos: [doc('a')] }, null).fecha).toBeDefined()
  })

  it('exige archivos y al menos un informe final', () => {
    expect(validarReporte({ fecha: '2026-10-21', documentos: [] }, null).general).toMatch(/al menos/)
    expect(validarReporte({ fecha: '2026-10-21', documentos: [doc('a', { categoria: 'Metrado' })] }, null).general).toMatch(/Informe final/)
  })

  it('valida cada documento', () => {
    const errores = validarReporte(
      {
        fecha: '2026-10-21',
        documentos: [
          doc('a'),
          doc('b', { categoria: '' }),
          doc('c', { categoria: 'EvidenciaEspacio' }),
          doc('d', { categoria: 'EvidenciaEspacio', alcance_id: '4', descripcion: 'x'.repeat(201) }),
          doc('e', { archivo: { name: 'virus.exe', size: 10 } }),
        ],
      },
      null,
    )
    expect(Object.keys(errores.porDocumento)).toEqual(['b', 'c', 'd', 'e'])
    expect(errores.porDocumento.b.categoria).toBeDefined()
    expect(errores.porDocumento.c.alcance).toBeDefined()
    expect(errores.porDocumento.d.descripcion).toMatch(/200/)
    expect(errores.porDocumento.e.archivo).toMatch(/no admitido/)
  })

  it('revisa tipo, tamaño y nombre del archivo', () => {
    expect(problemaArchivo({ name: 'FOTO.JPEG', size: 5 })).toBeUndefined()
    expect(problemaArchivo({ name: 'metrado.xlsx', size: 0 })).toMatch(/vacío/)
    expect(problemaArchivo({ name: 'sin-extension', size: 5 })).toMatch(/no admitido/)
    expect(problemaArchivo({ name: `${'a'.repeat(200)}.pdf`, size: 5 })).toMatch(/200/)
  })

  it('sugiere la categoría por el nombre', () => {
    expect(categoriaSugerida('Informe final octubre.pdf')).toBe('InformeFinal')
    expect(categoriaSugerida('metrado.xlsx')).toBe('Metrado')
    expect(categoriaSugerida('IMG_2031.jpg')).toBe('')
  })
})

describe('validarOrigen', async () => {
  const { validarOrigen } = await import('./validacionTercerizados')
  const base = { origen: 'Demanda', unidadModo: 'existente' as const, unidadId: null, unidadProvisional: '', motivo: 'Error al registrar' }
  const actual = { origen: 'ProgramacionEstacional', unidadId: null }

  it('acepta un cambio con motivo', () => {
    expect(validarOrigen(base, actual)).toEqual({})
  })

  it('exige motivo y algún cambio', () => {
    expect(validarOrigen({ ...base, motivo: ' ' }, actual).motivo).toBeDefined()
    expect(validarOrigen({ ...base, origen: 'ProgramacionEstacional' }, actual).origen).toMatch(/registrados/)
    expect(validarOrigen({ ...base, origen: 'SolicitudUnidad', unidadId: 4 }, { origen: 'SolicitudUnidad', unidadId: 4 }).origen).toMatch(/registrados/)
    expect(validarOrigen({ ...base, origen: 'SolicitudUnidad', unidadId: 5 }, { origen: 'SolicitudUnidad', unidadId: 4 })).toEqual({})
  })

  it('la solicitud de una unidad exige unidad', () => {
    expect(validarOrigen({ ...base, origen: 'SolicitudUnidad' }, actual).unidad).toBeDefined()
    expect(validarOrigen({ ...base, origen: 'SolicitudUnidad', unidadModo: 'provisional' }, actual).unidadProvisional).toBeDefined()
    expect(validarOrigen({ ...base, origen: 'SolicitudUnidad', unidadModo: 'provisional', unidadProvisional: 'Letras' }, actual)).toEqual({})
  })
})

describe('validarAcuerdo', async () => {
  const { validarAcuerdo, respuestaDeAcuerdo } = await import('./validacionTercerizados')
  const pendiente = { acuerdo: null, fecha: null, comentarios: '' }

  it('traduce el valor registrado', () => {
    expect([null, true, false].map((v) => respuestaDeAcuerdo(v))).toEqual(['pendiente', 'acuerdo', 'desacuerdo'])
  })

  it('el acuerdo comunicado exige fecha no anterior al fin', () => {
    expect(validarAcuerdo({ respuesta: 'acuerdo', fecha: '', comentarios: '' }, '2026-10-20', pendiente).fecha).toBeDefined()
    expect(validarAcuerdo({ respuesta: 'acuerdo', fecha: '2026-10-19', comentarios: '' }, '2026-10-20', pendiente).fecha).toMatch(/anterior/)
    expect(validarAcuerdo({ respuesta: 'acuerdo', fecha: '2026-10-20', comentarios: '' }, '2026-10-20', pendiente)).toEqual({})
  })

  it('el desacuerdo pide comentarios', () => {
    expect(validarAcuerdo({ respuesta: 'desacuerdo', fecha: '2026-10-21', comentarios: '' }, null, pendiente).comentarios).toBeDefined()
    expect(validarAcuerdo({ respuesta: 'desacuerdo', fecha: '2026-10-21', comentarios: 'Restos de césped' }, null, pendiente)).toEqual({})
  })

  it('avisa si no hay cambios', () => {
    expect(validarAcuerdo({ respuesta: 'pendiente', fecha: '', comentarios: '' }, null, pendiente).respuesta).toBeDefined()
    const registrado = { acuerdo: true, fecha: '2026-10-21', comentarios: 'Bien' }
    expect(validarAcuerdo({ respuesta: 'acuerdo', fecha: '2026-10-21', comentarios: 'Bien' }, null, registrado).respuesta).toBeDefined()
    expect(validarAcuerdo({ respuesta: 'pendiente', fecha: '', comentarios: 'Bien' }, null, registrado)).toEqual({})
  })
})
