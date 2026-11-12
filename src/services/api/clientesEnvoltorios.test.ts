import { afterEach, describe, expect, it, vi } from 'vitest'
import { alPerderSesion } from './cliente'
import { descargarReportesGestion, solicitarReportesGestion } from './clienteReportesGestion'
import { solicitarPlanificacion } from './clientePlanificacion'
import { descargarArchivoTercerizados, solicitarTercerizados } from './clienteTercerizados'

afterEach(() => {
  vi.unstubAllGlobals()
  alPerderSesion(null)
})

function simular(respuesta: () => Response) {
  const peticiones = vi.fn(async () => respuesta())
  vi.stubGlobal('fetch', peticiones)
  return peticiones
}

function llamada(peticiones: ReturnType<typeof simular>): [string, RequestInit] {
  return peticiones.mock.calls[0] as unknown as [string, RequestInit]
}

describe('envoltorios sobre el cliente único', () => {
  it('cada módulo usa su base y no reutiliza respuestas privadas', async () => {
    const peticiones = simular(() => new Response('{}'))
    await solicitarTercerizados('atenciones/', { parametros: { page: 2 } })
    await solicitarPlanificacion('ciclos/')
    await solicitarReportesGestion('panel/')
    expect(peticiones.mock.calls.map((c) => (c as unknown as [string])[0])).toEqual([
      '/api/tercerizados/atenciones/?page=2',
      '/api/v1/planificacion/ciclos/',
      '/api/v1/reportes/panel/',
    ])
    expect(llamada(peticiones)[1]).toMatchObject({ credentials: 'same-origin', cache: 'no-store' })
  })

  it('MOD-05 exige JSON en las respuestas 2xx pero admite el cuerpo vacío', async () => {
    simular(() => new Response(null, { status: 204 }))
    expect(await solicitarTercerizados('x/', { metodo: 'DELETE' })).toBeNull()
    simular(() => new Response('<html>'))
    await expect(solicitarTercerizados('x/')).rejects.toMatchObject({ estado: 200 })
  })

  it('un 401 avisa a la sesión en MOD-05 y un 403 no', async () => {
    const perdida = vi.fn()
    alPerderSesion(perdida)
    simular(() => new Response(JSON.stringify({ detail: 'Sin permiso' }), { status: 403 }))
    await expect(solicitarTercerizados('x/')).rejects.toMatchObject({ estado: 403, detalle: 'Sin permiso' })
    expect(perdida).not.toHaveBeenCalled()
    simular(() => new Response('{}', { status: 401 }))
    await expect(solicitarTercerizados('x/')).rejects.toMatchObject({ estado: 401 })
    expect(perdida).toHaveBeenCalledOnce()
  })

  it('descarga el archivo con el nombre de Content-Disposition o, si falta, el indicado', async () => {
    const guardados: string[] = []
    const enlace = { href: '', download: '', rel: '', click: () => guardados.push(enlace.download), remove: vi.fn() }
    vi.stubGlobal('document', { createElement: () => enlace, body: { append: vi.fn() } })
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:1', revokeObjectURL: vi.fn() })
    vi.stubGlobal('window', { setTimeout: vi.fn() })
    simular(() => new Response('a', { headers: { 'Content-Disposition': 'attachment; filename="real.pdf"' } }))
    await descargarArchivoTercerizados('archivo/', 'defecto.pdf')
    simular(() => new Response('a'))
    await descargarReportesGestion('exportar/', 'defecto.xlsx')
    expect(guardados).toEqual(['real.pdf', 'defecto.xlsx'])
  })

  it('la descarga de reportes no avisa del 401 (comportamiento previo) y conserva el error del cuerpo', async () => {
    const perdida = vi.fn()
    alPerderSesion(perdida)
    simular(() => new Response(JSON.stringify({ codigo: 'no-autenticado', detalle: 'Inicia sesión' }), { status: 401 }))
    await expect(descargarReportesGestion('exportar/', 'a.xlsx')).rejects.toMatchObject({ estado: 401, detalle: 'Inicia sesión' })
    expect(perdida).not.toHaveBeenCalled()
  })
})
