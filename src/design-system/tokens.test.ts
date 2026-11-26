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

  it('texto sobre la selección del menú cumple 4,5:1', () => {
    expect(contraste(t['--color-text-muted'], t['--color-sidebar-active-bg'])).toBeGreaterThanOrEqual(4.5)
  })

  it('el anillo de foco cumple 3:1 sobre el fondo', () => {
    expect(contraste(variables(':root')['--web-focus-ring-color'], t['--color-bg-page'])).toBeGreaterThanOrEqual(3)
  })

  it('define las variables del mapa', () => {
    for (const n of ['fondo', 'isla', 'cesped', 'tinta', 'verde', 'pared', 'arbol', 'sel']) {
      expect(t[`--mapa-${n}`]).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

const MAPA = ['fondo', 'isla', 'cesped', 'tinta', 'verde', 'pared', 'arbol', 'sel']
const TOKENS_NUEVOS = [
  '--color-bg-field',
  '--color-bg-done',
  '--color-neutral',
  '--color-chart',
  '--color-text-on-dark',
]

/** Cuerpos de todos los bloques cuyo selector es exactamente `selector` (inicio de línea). */
function cuerpos(selector: string): string[] {
  const salida: string[] = []
  const re = new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`, 'gm')
  for (const m of css.matchAll(re)) salida.push(m[1])
  return salida
}

describe('mapa y vidrio en todos los temas', () => {
  it('claro (:root) define --mapa-*', () => {
    const texto = cuerpos(':root').join('\n')
    for (const n of MAPA) expect(texto).toContain(`--mapa-${n}:`)
  })

  it.each(['calido', 'amarillento', 'oscuro'])('el tema %s define --mapa-*', (tema) => {
    const t = variables(`:root[data-tema='${tema}']`)
    for (const n of MAPA) expect(t[`--mapa-${n}`]).toMatch(/^#[0-9a-f]{6}$/)
  })

  it.each(['claro', 'calido', 'amarillento', 'oscuro'])('el tema %s define los tokens nuevos', (tema) => {
    const t =
      tema === 'claro'
        ? Object.fromEntries(
            cuerpos(':root').flatMap((c) => [...c.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])),
          )
        : variables(`:root[data-tema='${tema}']`)
    for (const n of TOKENS_NUEVOS) expect(t[n], `${tema} ${n}`).toBeDefined()
  })

  it('amarillento define todos los tokens que define cálido', () => {
    const amarillento = variables(":root[data-tema='amarillento']")
    for (const n of Object.keys(variables(":root[data-tema='calido']"))) {
      expect(amarillento[n], n).toBeDefined()
    }
  })

  it('define las tres variantes de vidrio en :root y en oscuro', () => {
    const claro = cuerpos(':root').find((c) => c.includes('--vidrio-relleno:')) ?? ''
    expect(claro).toContain('--vidrio-relleno-denso:')
    expect(claro).toContain('--vidrio-relleno-lente:')
    const oscuro = variables(":root[data-tema='oscuro']")
    expect(oscuro['--vidrio-relleno']).toBeDefined()
    expect(oscuro['--vidrio-relleno-denso']).toBeDefined()
    expect(oscuro['--vidrio-relleno-lente']).toBeDefined()
  })

  it('la alternativa opaca existe con @supports y con transparencia reducida, cada una con sus variables', () => {
    for (const regla of [
      '@supports not (backdrop-filter: blur(1px))',
      '@media (prefers-reduced-transparency: reduce)',
    ]) {
      const inicio = css.indexOf(regla)
      expect(inicio, regla).toBeGreaterThan(-1)
      const bloque = css.slice(inicio, css.indexOf('}\n}', inicio))
      expect(bloque).toContain(':root:root:root')
      expect(bloque).toContain('--vidrio-relleno: var(--color-bg-surface)')
      expect(bloque).toContain('--vidrio-relleno-denso: var(--color-bg-surface)')
      expect(bloque).toContain('--vidrio-relleno-lente: var(--color-bg-surface)')
      expect(bloque).toContain('--vidrio-desenfoque: none')
    }
  })
})
