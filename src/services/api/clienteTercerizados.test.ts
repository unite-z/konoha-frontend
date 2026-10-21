import { describe, expect, it } from 'vitest'
import { cabeceraBasic, construirUrlTercerizados, nombreDeDisposicion } from './clienteTercerizados'
import { formularioReporte } from './tercerizados'

describe('cabeceraBasic', () => {
  it('codifica usuario y contraseña en Base64', () => {
    expect(cabeceraBasic('mod05_jefe', 'clave')).toBe(`Basic ${btoa('mod05_jefe:clave')}`)
  })

  it('codifica en UTF-8 los caracteres no ASCII', () => {
    const cabecera = cabeceraBasic('peña', 'contraseña')
    const binario = atob(cabecera.slice('Basic '.length))
    const texto = new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)))
    expect(texto).toBe('peña:contraseña')
  })
})

describe('construirUrlTercerizados', () => {
  it('omite parámetros vacíos y codifica valores', () => {
    expect(construirUrlTercerizados('atenciones/', { estado: 'En ejecución', origen: '', page: undefined, contrato_id: 3 }))
      .toBe('/api/tercerizados/atenciones/?estado=En+ejecuci%C3%B3n&contrato_id=3')
  })

  it('no duplica barras', () => {
    expect(construirUrlTercerizados('/me/')).toBe('/api/tercerizados/me/')
  })
})

describe('nombreDeDisposicion', () => {
  it('prefiere el nombre UTF-8 extendido', () => {
    expect(nombreDeDisposicion("attachment; filename=\"informe.pdf\"; filename*=utf-8''informe%20jard%C3%ADn.pdf"))
      .toBe('informe jardín.pdf')
  })

  it('usa el nombre simple con o sin comillas', () => {
    expect(nombreDeDisposicion('attachment; filename="informe final.pdf"')).toBe('informe final.pdf')
    expect(nombreDeDisposicion('attachment; filename=metrado.xlsx')).toBe('metrado.xlsx')
  })

  it('devuelve null sin cabecera o sin nombre', () => {
    expect(nombreDeDisposicion(null)).toBeNull()
    expect(nombreDeDisposicion('attachment')).toBeNull()
  })
})

describe('formularioReporte', () => {
  it('envía documentos en JSON y un archivo por documento en el mismo orden', () => {
    const informe = new File(['%PDF-1.7'], 'informe.pdf', { type: 'application/pdf' })
    const foto = new File(['jpg'], 'jardin.jpg', { type: 'image/jpeg' })
    const formulario = formularioReporte({
      fecha_recepcion: '2026-10-21',
      resumen: '  Sin novedades  ',
      documentos: [
        { categoria: 'InformeFinal', descripcion: '  ', archivo: informe },
        { categoria: 'EvidenciaEspacio', alcance_id: 4, descripcion: ' Antes ', archivo: foto },
      ],
    })
    expect(formulario.get('fecha_recepcion')).toBe('2026-10-21')
    expect(formulario.get('resumen')).toBe('Sin novedades')
    expect(JSON.parse(String(formulario.get('documentos')))).toEqual([
      { categoria: 'InformeFinal' },
      { categoria: 'EvidenciaEspacio', alcance_id: 4, descripcion: 'Antes' },
    ])
    expect(formulario.getAll('archivos').map((a) => (a as File).name)).toEqual(['informe.pdf', 'jardin.jpg'])
  })

  it('omite el resumen vacío', () => {
    const formulario = formularioReporte({ fecha_recepcion: '2026-10-21', resumen: ' ', documentos: [] })
    expect(formulario.has('resumen')).toBe(false)
  })
})
