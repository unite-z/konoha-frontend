import { describe, expect, it, vi } from 'vitest'
import {
  debeRecargar,
  instalarRecargaTrasDespliegue,
  MARCA_RECARGA,
  VENTANA_SIN_RECARGA_MS,
} from './recargaTrasDespliegue'

function almacenEnMemoria(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial))
  return { getItem: (c: string) => datos.get(c) ?? null, setItem: (c: string, v: string) => void datos.set(c, v) }
}

describe('debeRecargar', () => {
  it('recarga la primera vez y deja la marca', () => {
    const almacen = almacenEnMemoria()
    expect(debeRecargar(almacen, 1_000)).toBe(true)
    expect(almacen.getItem(MARCA_RECARGA)).toBe('1000')
  })

  it('no recarga otra vez dentro de la ventana', () => {
    const almacen = almacenEnMemoria({ [MARCA_RECARGA]: '1000' })
    expect(debeRecargar(almacen, 1_000 + VENTANA_SIN_RECARGA_MS - 1)).toBe(false)
  })

  it('vuelve a recargar pasada la ventana (otro despliegue en la misma sesión)', () => {
    const almacen = almacenEnMemoria({ [MARCA_RECARGA]: '1000' })
    expect(debeRecargar(almacen, 1_000 + VENTANA_SIN_RECARGA_MS)).toBe(true)
  })

  it('sin almacenamiento no recarga', () => {
    const roto = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => undefined,
    }
    expect(debeRecargar(roto)).toBe(false)
  })
})

describe('instalarRecargaTrasDespliegue', () => {
  it('recarga una sola vez ante dos fallos seguidos', () => {
    sessionStorage.clear()
    const reload = vi.fn()
    const ventana = Object.assign(new EventTarget(), {
      sessionStorage,
      location: { reload },
    }) as unknown as Window
    instalarRecargaTrasDespliegue(ventana)
    const primero = new Event('vite:preloadError', { cancelable: true })
    ventana.dispatchEvent(primero)
    ventana.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))
    expect(reload).toHaveBeenCalledTimes(1)
    expect(primero.defaultPrevented).toBe(true)
  })
})
