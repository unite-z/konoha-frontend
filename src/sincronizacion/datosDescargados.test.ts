import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { conCache, descargadoEn, fijarUsuarioDatos, olvidarDatos } from './datosDescargados'

beforeEach(async () => {
  fijarUsuarioDatos(7)
  await olvidarDatos()
})

const sinRed = () => Promise.reject(new ErrorApi(0, null, 'sin red'))

describe('datos descargados', () => {
  it('sin red devuelve la última lectura correcta y dice cuándo se descargó', async () => {
    await conCache('encargos', async () => [{ id: 1 }])
    expect(descargadoEn('encargos')).toBeNull()
    await expect(conCache('encargos', sinRed)).resolves.toEqual([{ id: 1 }])
    expect(descargadoEn('encargos')).not.toBeNull()
  })

  it('otros errores no se tapan con la copia: el servidor decide', async () => {
    await conCache('encargos', async () => [{ id: 1 }])
    await expect(conCache('encargos', () => Promise.reject(new ErrorApi(403, null, 'Sin permiso')))).rejects.toMatchObject({ estado: 403 })
  })

  it('nunca muestra lo descargado por otro usuario', async () => {
    await conCache('encargos', async () => [{ id: 1 }])
    fijarUsuarioDatos(8)
    await expect(conCache('encargos', sinRed)).rejects.toMatchObject({ estado: 0 })
  })

  it('al cerrar sesión se borra lo descargado', async () => {
    await conCache('encargos', async () => [{ id: 1 }])
    await olvidarDatos()
    await expect(conCache('encargos', sinRed)).rejects.toMatchObject({ estado: 0 })
  })
})
