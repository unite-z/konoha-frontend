import { describe, expect, it } from 'vitest'
import type { JardinRuta } from '@/types/corte'
import { detalleMarcado, detallePendiente, marcados, porCortar, textoSinConexion, textoYaEstabaMarcado, textoYaMarcado, tituloJardin } from './rutaDeHoy'

function jardin(id: number, codigo: string, marcadoEn: string | null, marcadoPor: string | null = null): JardinRuta {
  return {
    id,
    codigo,
    nombre: `Jardín ${codigo.slice(2)}`,
    zona: 'Ciencias',
    estado: marcadoEn ? 'Cortado' : 'Pendiente',
    marcado_en: marcadoEn,
    marcado_por: marcadoPor,
    detenido_por_interrupcion: false,
  }
}

const ruta = [
  jardin(1, 'J-014', '2026-11-04T10:42:00-05:00', 'J. Ramos'),
  jardin(2, 'J-015', '2026-11-04T10:18:00-05:00', 'J. Ramos'),
  jardin(3, 'J-016', null),
  jardin(4, 'J-017', null),
]

describe('rutaDeHoy', () => {
  it('separa por cortar, en el orden de la ruta, y marcados, del más reciente', () => {
    expect(porCortar(ruta).map((j) => j.codigo)).toEqual(['J-016', 'J-017'])
    expect(marcados(ruta).map((j) => j.codigo)).toEqual(['J-014', 'J-015'])
  })

  it('escribe el título, la hora de la marca y quién la hizo, como en Figma 375-6817', () => {
    expect(tituloJardin(ruta[2])).toBe('J-016 · Jardín 016')
    expect(detalleMarcado(ruta[1])).toBe('10:18 · J. Ramos')
    expect(textoYaMarcado(ruta[1])).toBe('Por J. Ramos a las 10:18.')
  })

  it('sin conexión cuenta las marcas por enviar y dice cuándo se envía cada una', () => {
    expect(textoSinConexion(2, false)).toBe('Sin conexión · 2 marcas pendientes de enviar')
    expect(textoSinConexion(1, false)).toBe('Sin conexión · 1 marca pendiente de enviar')
    expect(textoSinConexion(2, true)).toBe('Enviando 2 marcas')
    expect(detallePendiente({ marcado_en: '2026-11-04T11:05:00-05:00', clave: 'x' })).toBe('11:05 · se enviará al tener conexión')
    expect(textoYaEstabaMarcado(ruta[1])).toBe('J-015 ya estaba marcado · J. Ramos, 10:18')
  })
})
