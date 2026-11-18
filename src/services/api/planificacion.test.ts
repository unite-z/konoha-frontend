import { afterEach, describe, expect, it, vi } from 'vitest'
import { actualizarDuracion, actualizarFrecuencia, listarServiciosPeriodicos } from './planificacion'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('contrato de configuración RF-PLA-001 y RF-PLA-002', () => {
  it('envía la frecuencia en snake_case, codifica Otoño y conserva sesión y CSRF', async () => {
    const servicio = { id: 7, frecuencias: [{ estacion: 'Otoño', frecuencia_teorica_dias: 21 }] }
    const transporte = vi.fn().mockResolvedValue(Response.json(servicio))
    vi.stubGlobal('fetch', transporte)
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=token-prueba-local' })
    const cuerpo = { frecuencia_teorica_dias: 21, frecuencia_practica_dias: 30, frecuencia_maxima_dias: 45 }
    expect(await actualizarFrecuencia(7, 'Otoño', cuerpo)).toEqual(servicio)
    const [ruta, opciones] = transporte.mock.calls[0] as [string, RequestInit]
    expect(ruta).toBe('/api/v1/planificacion/servicios/7/frecuencias/Oto%C3%B1o/')
    expect(opciones.method).toBe('PUT')
    expect(opciones.body).toBe(JSON.stringify(cuerpo))
    expect(opciones.credentials).toBe('same-origin')
    expect(new Headers(opciones.headers).get('X-XSRF-TOKEN')).toBe('token-prueba-local')
    expect(new Headers(opciones.headers).get('Content-Type')).toBe('application/json')
  })

  it('envía la duración y permite recuperar la configuración con una consulta nueva', async () => {
    const servicio = { id: 7, duracion: { duracion_maxima_dias: 10 } }
    const transporte = vi.fn()
      .mockResolvedValueOnce(Response.json(servicio))
      .mockResolvedValueOnce(Response.json([servicio]))
    vi.stubGlobal('fetch', transporte)
    expect(await actualizarDuracion(7, { duracion_maxima_dias: 10 })).toEqual(servicio)
    expect(await listarServiciosPeriodicos()).toEqual([servicio])
    expect(transporte.mock.calls[0]?.[0]).toBe('/api/v1/planificacion/servicios/7/duracion/')
    expect(transporte.mock.calls[0]?.[1]).toMatchObject({ method: 'PUT', body: '{"duracion_maxima_dias":10}', cache: 'no-store' })
    expect(transporte.mock.calls[1]?.[1]).toMatchObject({ method: 'GET', cache: 'no-store' })
  })

  it.each([401, 403])('propaga HTTP %i para que el diálogo muestre el error sin guardar', async (estado) => {
    const transporte = vi.fn().mockResolvedValue(Response.json({ codigo: 'sin-permiso', detalle: 'Sin permiso' }, { status: estado }))
    vi.stubGlobal('fetch', transporte)
    await expect(actualizarDuracion(7, { duracion_maxima_dias: 10 })).rejects.toMatchObject({ estado })
    expect(transporte).toHaveBeenCalledTimes(1)
  })

  it('conserva el error de máxima inferior a la habitual', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ codigo: 'frecuencia-maxima-menor', detalle: 'La máxima no puede ser menor' }, { status: 400 })))
    await expect(actualizarFrecuencia(7, 'Verano', { frecuencia_teorica_dias: 30, frecuencia_maxima_dias: 20 }))
      .rejects.toMatchObject({ estado: 400, codigo: 'frecuencia-maxima-menor' })
  })

  it('conserva la validación por campo de duración', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ codigo: 'validacion', detalle: 'Revisa los datos', errores: { duracion_maxima_dias: ['Debe ser mayor que cero'] } }, { status: 400 })))
    await expect(actualizarDuracion(7, { duracion_maxima_dias: 0 })).rejects.toMatchObject({
      estado: 400, errores_campo: { duracion_maxima_dias: ['Debe ser mayor que cero'] },
    })
  })
})
