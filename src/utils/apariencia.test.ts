import { describe, expect, it } from 'vitest'
import { APARIENCIA_INICIAL, aplicarApariencia, guardarApariencia, leerApariencia } from './apariencia'

function almacenEnMemoria() {
  const datos = new Map<string, string>()
  return {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => void datos.set(clave, valor),
  }
}

function raiz() {
  return { dataset: {} as Record<string, string | undefined> } as unknown as HTMLElement
}

describe('apariencia (AV-389)', () => {
  it('sin nada guardado, o con valores desconocidos, usa el tema claro y el azul institucional', () => {
    expect(leerApariencia(almacenEnMemoria())).toEqual(APARIENCIA_INICIAL)
    const almacen = almacenEnMemoria()
    almacen.setItem('av:apariencia', '{"tema":"rosa","acento":"neon"}')
    expect(leerApariencia(almacen)).toEqual(APARIENCIA_INICIAL)
    almacen.setItem('av:apariencia', 'no es json')
    expect(leerApariencia(almacen)).toEqual(APARIENCIA_INICIAL)
    expect(leerApariencia(null)).toEqual(APARIENCIA_INICIAL)
  })

  it('recuerda lo que se guarda', () => {
    const almacen = almacenEnMemoria()
    guardarApariencia({ tema: 'oscuro', acento: 'verde' }, almacen)
    expect(leerApariencia(almacen)).toEqual({ tema: 'oscuro', acento: 'verde' })
  })

  it('traduce la preferencia a atributos de <html>', () => {
    const html = raiz()
    aplicarApariencia({ tema: 'oscuro', acento: 'morado' }, html, false)
    expect(html.dataset).toEqual({ tema: 'oscuro', acento: 'morado' })

    aplicarApariencia({ tema: 'claro', acento: 'institucional' }, html, true)
    expect(html.dataset.tema).toBeUndefined()
    expect(html.dataset.acento).toBeUndefined()
  })

  it('«según el sistema» sigue lo que prefiere el sistema', () => {
    const html = raiz()
    aplicarApariencia({ tema: 'sistema', acento: 'institucional' }, html, true)
    expect(html.dataset.tema).toBe('oscuro')
    aplicarApariencia({ tema: 'sistema', acento: 'institucional' }, html, false)
    expect(html.dataset.tema).toBeUndefined()
  })
})
