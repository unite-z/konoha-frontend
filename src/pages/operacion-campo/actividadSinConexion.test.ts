import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { vaciar } from '@/sincronizacion/almacenLocal'
import { leerEstadoCola, reiniciarColaParaPruebas, vaciarCola } from '@/sincronizacion/cola'
import { conCache, fijarUsuarioDatos, olvidarDatos } from '@/sincronizacion/datosDescargados'
import { registrarEjecutores } from '@/sincronizacion/ejecutores'
import type { ParteCampo } from '@/types/operacionCampo'
import { encolarActividad } from './actividadSinConexion'

const todosCampo = vi.fn<(ruta: string, parametros?: unknown) => Promise<unknown[]>>()
const campoApi = vi.fn<(ruta: string, opciones?: { metodo?: string; cuerpo?: unknown; claveIdempotencia?: string }) => Promise<unknown>>()
vi.mock('@/services/api/operacionCampo', () => ({
  todosCampo: (ruta: string, parametros?: unknown) => todosCampo(ruta, parametros),
  campoApi: (ruta: string, opciones?: { metodo?: string; cuerpo?: unknown; claveIdempotencia?: string }) => campoApi(ruta, opciones),
}))

const sinRed = new ErrorApi(0, null, 'sin red')
const parte = (estado: 'Abierto' | 'Cerrado'): ParteCampo => ({ id: 41, cuadrilla_id: 5, fecha: '2026-11-11', estado }) as ParteCampo
const actividad = { cuadrillaId: 5, fecha: '2026-11-11', cuerpo: { tipo_actividad_id: 3, area_verde_id: 9 }, descripcion: 'Riego', usuarioId: 7 }

beforeEach(async () => {
  todosCampo.mockReset()
  campoApi.mockReset()
  reiniciarColaParaPruebas()
  await vaciar('pendientes')
  fijarUsuarioDatos(7)
  await olvidarDatos()
})

describe('actividad sin conexión (HU-MOD04-012-OFF)', () => {
  it('con el parte ya descargado, encola solo la actividad con su parte_id', async () => {
    await conCache('partes-5-2026-11-11', async () => [parte('Abierto')])
    todosCampo.mockRejectedValue(sinRed)
    await encolarActividad(actividad)
    const [p] = leerEstadoCola().pendientes
    expect(p).toMatchObject({ tipo: 'campo.actividad', carga: { parte_id: 41, tipo_actividad_id: 3 }, depende_de: null })
  })

  it('sin parte conocido, encola la apertura del parte y las actividades del día cuelgan del mismo', async () => {
    todosCampo.mockRejectedValue(sinRed)
    await encolarActividad(actividad)
    await encolarActividad({ ...actividad, descripcion: 'Poda' })
    const [parteCola, primera, segunda] = leerEstadoCola().pendientes
    expect(parteCola).toMatchObject({ tipo: 'campo.parte', carga: { cuadrilla_id: 5, fecha: '2026-11-11' } })
    expect(primera).toMatchObject({ tipo: 'campo.actividad', depende_de: parteCola.id, referencias: ['parte_id'] })
    expect(segunda.depende_de).toBe(parteCola.id)
  })

  it('con el parte cerrado no deja registrar', async () => {
    await conCache('partes-5-2026-11-11', async () => [parte('Cerrado')])
    todosCampo.mockRejectedValue(sinRed)
    await expect(encolarActividad(actividad)).rejects.toMatchObject({ codigo: 'ParteCerrado' })
  })

  it('al volver la red, abre el parte (o usa el que ya abrió otro) y envía la actividad con su id y su clave', async () => {
    todosCampo.mockRejectedValue(sinRed)
    await encolarActividad(actividad)
    registrarEjecutores()
    campoApi.mockImplementation(async (ruta) => {
      if (ruta === 'partes/') throw new ErrorApi(409, 'ParteExistente', 'Ya existe')
      return { id: 900 }
    })
    todosCampo.mockResolvedValue([parte('Abierto')])
    await vaciarCola(7)
    const llamadaActividad = campoApi.mock.calls.find(([ruta]) => ruta === 'actividades/')
    const claveActividad = llamadaActividad?.[1]?.claveIdempotencia
    expect(llamadaActividad?.[1]?.cuerpo).toMatchObject({ parte_id: 41, tipo_actividad_id: 3 })
    expect(typeof claveActividad).toBe('string')
    expect(leerEstadoCola().pendientes).toHaveLength(0)
  })
})
