// @vitest-environment jsdom
import { act, createElement, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { transicionar } from './transicionar'

function simularMatchMedia(reducir: boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: reducir && consulta.includes('reduce'),
  }))
}

/** startViewTransition falso: ejecuta el cambio y devuelve `ready` resuelto o rechazado. */
function simularStartViewTransition(alCambiar: () => void = () => undefined, ready: Promise<void> = Promise.resolve()) {
  const iniciar = vi.fn((fn: () => void) => {
    fn()
    alCambiar()
    return { ready, finished: Promise.resolve() }
  })
  Object.defineProperty(document, 'startViewTransition', {
    value: iniciar,
    configurable: true,
  })
  return iniciar
}

describe('transicionar', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(document, 'startViewTransition')
  })

  it('llama directamente al cambio si el navegador no tiene startViewTransition', () => {
    simularMatchMedia(false)
    const cambio = vi.fn()
    transicionar(cambio)
    expect(cambio).toHaveBeenCalledTimes(1)
  })

  it('envuelve el cambio en startViewTransition si existe', () => {
    simularMatchMedia(false)
    const iniciar = simularStartViewTransition()
    const cambio = vi.fn()
    transicionar(cambio)
    expect(iniciar).toHaveBeenCalledTimes(1)
    expect(cambio).toHaveBeenCalledTimes(1)
  })

  it('con prefers-reduced-motion no usa la transición y aplica el cambio', () => {
    simularMatchMedia(true)
    const iniciar = simularStartViewTransition()
    const cambio = vi.fn()
    transicionar(cambio)
    expect(iniciar).not.toHaveBeenCalled()
    expect(cambio).toHaveBeenCalledTimes(1)
  })

  it('React pinta el estado nuevo dentro de la transición, antes de la captura', () => {
    simularMatchMedia(false)
    let cambiar: (valor: string) => void = () => undefined
    function Vista() {
      const [texto, setTexto] = useState('lista')
      useEffect(() => {
        cambiar = setTexto
      }, [])
      return createElement('p', null, texto)
    }
    const contenedor = document.createElement('div')
    const raiz = createRoot(contenedor)
    act(() => raiz.render(createElement(Vista)))
    let pintadoAlCapturar = ''
    simularStartViewTransition(() => {
      pintadoAlCapturar = contenedor.textContent ?? ''
    })
    transicionar(() => cambiar('panel'))
    expect(pintadoAlCapturar).toBe('panel')
    act(() => raiz.unmount())
  })

  it('si el navegador salta la transición no deja un rechazo sin capturar', async () => {
    simularMatchMedia(false)
    const sinCapturar = vi.fn()
    process.on('unhandledRejection', sinCapturar)
    simularStartViewTransition(() => undefined, Promise.reject(new DOMException('saltada', 'InvalidStateError')))
    const cambio = vi.fn()
    transicionar(cambio)
    await new Promise((resolver) => setTimeout(resolver, 0))
    process.off('unhandledRejection', sinCapturar)
    expect(cambio).toHaveBeenCalledTimes(1)
    expect(sinCapturar).not.toHaveBeenCalled()
  })
})
