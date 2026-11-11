import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { cerrarParaPruebas, vaciar } from './almacenLocal'
import {
  alResolverConflicto,
  descartar,
  encolar,
  esperaReintento,
  leerEstadoCola,
  porSincronizar,
  recargarCola,
  reanudarCola,
  registrarEjecutor,
  reiniciarColaParaPruebas,
  reintentar,
  vaciarCola,
  type Pendiente,
} from './cola'

const USUARIO = 7

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-11T09:00:00-05:00'))
  reiniciarColaParaPruebas()
  await vaciar('pendientes')
})

afterEach(() => {
  vi.useRealTimers()
})

function nueva(tipo: string, extra: Partial<Parameters<typeof encolar>[0]> = {}) {
  return encolar({ tipo, carga: { n: 1 }, descripcion: tipo, usuario_id: USUARIO, ...extra })
}

function avanzar(ms: number) {
  vi.setSystemTime(new Date(Date.now() + ms))
}

describe('cola sin conexión', () => {
  it('envía en orden de creación con el UUID de la operación como clave', async () => {
    const enviadas: string[] = []
    registrarEjecutor('prueba', async (p) => {
      enviadas.push(p.id)
    })
    const a = await nueva('prueba')
    avanzar(1000)
    const b = await nueva('prueba')
    await vaciarCola(USUARIO)
    expect(enviadas).toEqual([a, b])
    expect(porSincronizar(leerEstadoCola())).toHaveLength(0)
  })

  it('sobrevive a cerrar y reabrir la aplicación, con usuario y hora originales', async () => {
    const id = await nueva('prueba', { archivo: new Blob(['foto'], { type: 'image/jpeg' }), nombre_archivo: 'foto.jpg' })
    await cerrarParaPruebas()
    reiniciarColaParaPruebas()
    await recargarCola()
    const [p] = leerEstadoCola().pendientes
    expect(p.id).toBe(id)
    expect(p.usuario_id).toBe(USUARIO)
    expect(p.creado_en).toBe('2026-11-11T14:00:00.000Z')
    expect(p.archivo).toBeTruthy()
  })

  it('sin red conserva la operación, reintenta con espera creciente y no la duplica', async () => {
    const claves: string[] = []
    let conRed = false
    registrarEjecutor('prueba', async (p) => {
      claves.push(p.id)
      if (!conRed) throw new ErrorApi(0, null, 'sin red')
    })
    const id = await nueva('prueba')
    await vaciarCola(USUARIO)
    let p = leerEstadoCola().pendientes[0]
    expect(p.estado).toBe('pendiente')
    expect(p.error).toMatch(/Sin conexión/)
    // Antes de la espera no se reintenta.
    await vaciarCola(USUARIO)
    expect(claves).toHaveLength(1)
    avanzar(esperaReintento(1, 1))
    conRed = true
    await vaciarCola(USUARIO)
    expect(claves).toEqual([id, id])
    p = leerEstadoCola().pendientes[0]
    expect(p).toBeUndefined()
  })

  it('espera 5 s, 15 s, 1 min, 5 min y después cada 15 min, con ±20 %', () => {
    expect([1, 2, 3, 4, 5, 9].map((n) => esperaReintento(n, 0.5))).toEqual([5_000, 15_000, 60_000, 300_000, 900_000, 900_000])
    expect(esperaReintento(1, 0)).toBe(4_000)
    expect(esperaReintento(1, 1)).toBe(6_000)
  })

  it('la actividad espera a su parte y toma el id de su respuesta; la foto, el de la actividad', async () => {
    const recibidas: Array<[string, Record<string, unknown>]> = []
    registrarEjecutor('parte', async () => ({ id: 41 }))
    registrarEjecutor('actividad', async (p) => {
      recibidas.push(['actividad', p.carga])
      return { id: 900 }
    })
    registrarEjecutor('foto', async (p) => {
      recibidas.push(['foto', p.carga])
      return { id: 1 }
    })
    const parte = await nueva('parte')
    avanzar(1)
    const actividad = await encolar({
      tipo: 'actividad',
      carga: { parte_id: null, tipo_actividad_id: 3 },
      descripcion: 'actividad',
      usuario_id: USUARIO,
      depende_de: parte,
      referencias: ['parte_id'],
    })
    avanzar(1)
    await encolar({
      tipo: 'foto',
      carga: { registro_id: null },
      descripcion: 'foto',
      usuario_id: USUARIO,
      depende_de: actividad,
      referencias: ['registro_id'],
    })
    await vaciarCola(USUARIO)
    expect(recibidas).toEqual([
      ['actividad', { parte_id: 41, tipo_actividad_id: 3 }],
      ['foto', { registro_id: 900 }],
    ])
    expect(leerEstadoCola().pendientes).toHaveLength(0)
  })

  it('una dependiente no sale antes que su operación padre', async () => {
    const enviadas: string[] = []
    registrarEjecutor('padre', async () => {
      throw new ErrorApi(503, null, 'caído')
    })
    registrarEjecutor('hija', async () => {
      enviadas.push('hija')
    })
    const padre = await nueva('padre')
    avanzar(1)
    await encolar({ tipo: 'hija', carga: {}, descripcion: 'hija', usuario_id: USUARIO, depende_de: padre })
    await vaciarCola(USUARIO)
    expect(enviadas).toEqual([])
  })

  it('401: se detiene sin perder nada y se reanuda al volver a iniciar sesión', async () => {
    let sesion = false
    const enviadas: string[] = []
    registrarEjecutor('prueba', async (p) => {
      if (!sesion) throw new ErrorApi(401, 'no-autenticado', 'Inicia sesión')
      enviadas.push(p.id)
    })
    await nueva('prueba')
    avanzar(1)
    await nueva('prueba')
    await vaciarCola(USUARIO)
    expect(leerEstadoCola().pausada).toBe('sesion')
    expect(porSincronizar(leerEstadoCola()).every((p) => p.estado === 'pendiente')).toBe(true)
    await vaciarCola(USUARIO)
    expect(enviadas).toHaveLength(0)
    sesion = true
    reanudarCola()
    await vaciarCola(USUARIO)
    expect(enviadas).toHaveLength(2)
  })

  it('403 (permiso revocado): queda rechazada con el motivo y solo se borra al descartarla', async () => {
    registrarEjecutor('prueba', async () => {
      throw new ErrorApi(403, 'SinPermiso', 'No tiene permiso para esta acción')
    })
    const id = await nueva('prueba')
    await vaciarCola(USUARIO)
    const [p] = leerEstadoCola().pendientes
    expect(p.estado).toBe('rechazada')
    expect(p.error).toBe('No tiene permiso para esta acción')
    await vaciarCola(USUARIO)
    expect(leerEstadoCola().pendientes).toHaveLength(1)
    await descartar(id)
    expect(leerEstadoCola().pendientes).toHaveLength(0)
  })

  it('una rechazada se puede reintentar', async () => {
    let permitido = false
    registrarEjecutor('prueba', async () => {
      if (!permitido) throw new ErrorApi(400, null, 'Dato inválido')
    })
    const id = await nueva('prueba')
    await vaciarCola(USUARIO)
    permitido = true
    await reintentar(id)
    await vaciarCola(USUARIO)
    expect(leerEstadoCola().pendientes).toHaveLength(0)
  })

  it('409 ya-marcado: no sobrescribe, la quita y avisa de quién lo hizo', async () => {
    registrarEjecutor('prueba', async () => {
      throw new ErrorApi(409, 'ya-marcado', 'Ya lo marcó Ana a las 08:55')
    })
    const avisos: string[] = []
    alResolverConflicto(({ error }) => avisos.push(error.detalle))
    await nueva('prueba')
    await vaciarCola(USUARIO)
    expect(avisos).toEqual(['Ya lo marcó Ana a las 08:55'])
    expect(leerEstadoCola().pendientes).toHaveLength(0)
  })

  it('no envía lo que registró otro usuario en el mismo dispositivo', async () => {
    const enviadas: Pendiente[] = []
    registrarEjecutor('prueba', async (p) => {
      enviadas.push(p)
    })
    await nueva('prueba', { usuario_id: 99 })
    await vaciarCola(USUARIO)
    expect(enviadas).toHaveLength(0)
    expect(leerEstadoCola().pendientes).toHaveLength(1)
  })

  it('un envío cortado a medias (app cerrada) vuelve a pendiente al reabrir', async () => {
    registrarEjecutor('prueba', () => new Promise(() => undefined))
    await nueva('prueba')
    void vaciarCola(USUARIO)
    await vi.waitFor(() => expect(leerEstadoCola().pendientes[0].estado).toBe('enviando'))
    await cerrarParaPruebas()
    reiniciarColaParaPruebas()
    await recargarCola()
    expect(leerEstadoCola().pendientes[0].estado).toBe('pendiente')
  })
})
