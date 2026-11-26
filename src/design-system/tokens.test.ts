/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

/** Variables de un bloque cuyo selector es exactamente `selector`. */
function variables(selector: string): Record<string, string> {
  const inicio = css.indexOf(`${selector} {`)
  if (inicio < 0) throw new Error(`Falta el bloque ${selector}`)
  const cuerpo = css.slice(css.indexOf('{', inicio) + 1, css.indexOf('}', inicio))
  const resultado: Record<string, string> = {}
  for (const m of cuerpo.matchAll(/(--[\w-]+):\s*([^;]+);/g)) resultado[m[1]] = m[2].trim()
  return resultado
}

function luminancia(hex: string): number {
  const canales = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2]
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (oscuro + 0.05)
}

describe('tema amarillento', () => {
  const t = variables(":root[data-tema='amarillento']")
  const fondos = ['--color-bg-page', '--color-bg-surface']

  it.each(fondos)('texto principal y secundario cumplen 4,5:1 sobre %s', (fondo) => {
    for (const texto of ['--color-text-primary', '--color-text-muted']) {
      expect(contraste(t[texto], t[fondo])).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(fondos)('error, ok y aviso cumplen 4,5:1 sobre %s', (fondo) => {
    for (const texto of ['--color-error', '--color-success', '--color-warning']) {
      expect(contraste(t[texto], t[fondo])).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each([
    ['--color-error', '--color-error-bg'],
    ['--color-success', '--color-success-bg'],
    ['--color-warning', '--color-warning-bg'],
  ])('%s cumple 4,5:1 sobre %s', (texto, fondo) => {
    expect(contraste(t[texto], t[fondo])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(fondos)('borde de control y neutro cumplen 3:1 sobre %s', (fondo) => {
    expect(contraste(t['--color-border-strong'], t[fondo])).toBeGreaterThanOrEqual(3)
    expect(contraste(t['--color-neutral'], t[fondo])).toBeGreaterThanOrEqual(3)
  })

  it('el campo admite borde de control a 3:1', () => {
    expect(contraste(t['--color-border-strong'], t['--color-bg-field'])).toBeGreaterThanOrEqual(3)
  })

  it('define las variables del mapa', () => {
    for (const n of ['fondo', 'isla', 'cesped', 'tinta', 'verde', 'pared', 'arbol', 'sel']) {
      expect(t[`--mapa-${n}`]).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('mapa y vidrio en todos los temas', () => {
  it.each([':root', ":root[data-tema='calido']", ":root[data-tema='oscuro']"])(
    '%s define --mapa-* y tokens nuevos',
    (selector) => {
      // el primer bloque :root es el de color claro; el de mapa está en otro bloque :root
      const bloque = selector === ':root' ? css : variables(selector)
      const texto = typeof bloque === 'string' ? bloque : JSON.stringify(bloque)
      for (const n of ['fondo', 'isla', 'cesped', 'tinta', 'verde', 'pared', 'arbol', 'sel']) {
        expect(texto).toContain(`--mapa-${n}`)
      }
    },
  )

  it('define las tres variantes de vidrio en claro y oscuro', () => {
    const claro = css.slice(css.indexOf('--vidrio-relleno:'))
    expect(claro).toContain('--vidrio-relleno-denso')
    expect(claro).toContain('--vidrio-relleno-lente')
    const oscuro = variables(":root[data-tema='oscuro']")
    expect(oscuro['--vidrio-relleno']).toBeDefined()
    expect(oscuro['--vidrio-relleno-denso']).toBeDefined()
    expect(oscuro['--vidrio-relleno-lente']).toBeDefined()
  })

  it('tiene alternativa opaca sin backdrop-filter y con transparencia reducida', () => {
    expect(css).toContain('@supports not (backdrop-filter: blur(1px))')
    expect(css).toContain('@media (prefers-reduced-transparency: reduce)')
    const opaco = css.slice(css.indexOf('@supports not'))
    expect(opaco).toContain('--vidrio-relleno: var(--color-bg-surface)')
    expect(opaco).toContain('--vidrio-desenfoque: none')
  })
})
