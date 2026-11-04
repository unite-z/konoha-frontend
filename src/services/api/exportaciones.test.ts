import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReporteGenerado } from '@/types/exportaciones'
import { descargarExportacion, generarExportacion, listarExportaciones, listarTiposExportables } from './exportaciones'

vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: false }))

afterEach(() => {
  vi.unstubAllGlobals()
})

const respuesta = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status })

describe('exportaciones con el backend (RF-REP-009)', () => {
  it('lista los tipos exportables con un GET', async () => {
    const peticion = vi.fn().mockResolvedValue(respuesta([]))
    vi.stubGlobal('fetch', peticion)
    await listarTiposExportables()
    expect(peticion.mock.calls[0][0]).toBe('/api/v1/reportes/exportaciones/tipos/')
    expect(peticion.mock.calls[0][1].method).toBe('GET')
  })

  it('genera con un POST y el cuerpo de la solicitud', async () => {
    const peticion = vi.fn().mockResolvedValue(respuesta({ id: 1 }, 201))
    vi.stubGlobal('fetch', peticion)
    vi.stubGlobal('document', { cookie: '' })
    const solicitud = { tipo: 'GestionOSG', formato: 'PDF', parametros: { mes: '2026-10' } } as const
    await generarExportacion(solicitud)
    const [url, opciones] = peticion.mock.calls[0]
    expect(url).toBe('/api/v1/reportes/exportaciones/')
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body)).toEqual(solicitud)
  })

  it('conserva el 422 de volumen excedido como ErrorApi', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta({ codigo: 'volumen-excedido', detalle: 'Acota el periodo' }, 422)))
    vi.stubGlobal('document', { cookie: '' })
    await expect(generarExportacion({ tipo: 'GestionOSG', formato: 'PDF', parametros: {} })).rejects.toMatchObject({
      estado: 422,
      codigo: 'volumen-excedido',
    })
  })

  it('pide el historial con la página y el tipo', async () => {
    const peticion = vi.fn().mockResolvedValue(respuesta({ count: 0, next: null, previous: null, results: [] }))
    vi.stubGlobal('fetch', peticion)
    await listarExportaciones({ page: 2, tipo: 'MaterialVegetal' })
    expect(peticion.mock.calls[0][0]).toBe('/api/v1/reportes/exportaciones/?page=2&tipo=MaterialVegetal')
  })

  it('descarga el archivo del reporte con el nombre de Content-Disposition', async () => {
    const peticion = vi.fn().mockResolvedValue(
      new Response('contenido', { status: 200, headers: { 'Content-Disposition': 'attachment; filename="osg.pdf"' } }),
    )
    const enlace = { href: '', download: '', rel: '', click: vi.fn(), remove: vi.fn() }
    vi.stubGlobal('fetch', peticion)
    vi.stubGlobal('document', { createElement: () => enlace, body: { append: vi.fn() } })
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:1', revokeObjectURL: vi.fn() })
    vi.stubGlobal('window', { setTimeout: vi.fn() })
    await descargarExportacion({ id: 7, archivo: { id: 1, nombre: 'x.pdf', tamano_bytes: 1 } } as ReporteGenerado)
    expect(peticion.mock.calls[0][0]).toBe('/api/v1/reportes/exportaciones/7/archivo/')
    expect(peticion.mock.calls[0][1].credentials).toBe('same-origin')
    expect(enlace.download).toBe('osg.pdf')
    expect(enlace.click).toHaveBeenCalledOnce()
  })

  it('un 403 en la descarga llega como ErrorApi', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta({ codigo: 'sin-permiso', detalle: 'Sin permiso' }, 403)))
    await expect(descargarExportacion({ id: 7, archivo: null } as ReporteGenerado)).rejects.toMatchObject({ estado: 403 })
  })
})
