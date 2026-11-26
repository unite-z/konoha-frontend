// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLAVES_PALETA, leerPaleta, observarTema } from './paleta'

afterEach(() => {
  document.documentElement.removeAttribute('style')
  document.documentElement.removeAttribute('data-tema')
})

function definirPaleta(prefijo: string) {
  for (const clave of CLAVES_PALETA)
    document.documentElement.style.setProperty(`--mapa-${clave}`, `${prefijo}-${clave}`)
}

describe('paleta del mapa (AV-424)', () => {
  it('lee cada --mapa-* de las variables CSS en el momento de la llamada', () => {
    definirPaleta('claro')
    expect(leerPaleta().tinta).toBe('claro-tinta')
    definirPaleta('oscuro')
    const paleta = leerPaleta()
    expect(paleta.fondo).toBe('oscuro-fondo')
    expect(Object.keys(paleta).sort()).toEqual([...CLAVES_PALETA].sort())
  })

  it('un cambio de data-tema avisa para repintar y los colores nuevos se leen', async () => {
    definirPaleta('claro')
    const repintar = vi.fn()
    const parar = observarTema(repintar)

    definirPaleta('oscuro')
    document.documentElement.setAttribute('data-tema', 'oscuro')
    await vi.waitFor(() => expect(repintar).toHaveBeenCalled())
    expect(leerPaleta().verde).toBe('oscuro-verde')

    parar()
    repintar.mockClear()
    document.documentElement.setAttribute('data-tema', 'amarillento')
    await Promise.resolve()
    expect(repintar).not.toHaveBeenCalled()
  })
})
