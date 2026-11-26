/** Escena de mentira para las pruebas de las capas: registra las llamadas sin tocar WebGL. */
import { vi } from 'vitest'
import type { DatosCampus } from '@/types/campus3d'
import type { Escena } from './escena'
import type { MapaListo } from './contexto'

export function escenaFalsa() {
  const quitarCapa = vi.fn()
  const oyentes = new Set<() => void>()
  const quitarGeometrias = vi.fn()
  const quitarTrazo = vi.fn()
  const oyentesSuelo = new Set<(punto: { x: number; y: number }) => void>()
  const restituir = vi.fn()
  const anclajes: Array<{ elemento: HTMLElement; x: number; y: number }> = []
  const escena = {
    repintar: vi.fn(),
    pintarAreas: vi.fn(() => quitarCapa),
    ocultarAreas: vi.fn(() => restituir),
    dibujarGeometrias: vi.fn(() => quitarGeometrias),
    anclar: vi.fn((elemento: HTMLElement, x: number, y: number) => {
      anclajes.push({ elemento, x, y })
      document.body.appendChild(elemento)
      return Object.assign(() => elemento.remove(), {
        mover: (nx: number, ny: number) => {
          const ancla = anclajes.find((a) => a.elemento === elemento)
          if (ancla) Object.assign(ancla, { x: nx, y: ny })
        },
      })
    }),
    suelo: vi.fn((x: number, y: number) => ({ x, y: -y }) as { x: number; y: number } | null),
    centro: vi.fn(() => ({ x: 0, y: 0 })),
    alPulsarSuelo: vi.fn((oyente: (punto: { x: number; y: number }) => void) => {
      oyentesSuelo.add(oyente)
      return () => oyentesSuelo.delete(oyente)
    }),
    dibujarTrazo: vi.fn(() => quitarTrazo),
    metrosPorPixel: vi.fn(() => 1),
    alCambiarCamara: vi.fn((oyente: () => void) => {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    }),
    enfocar: vi.fn(),
    irAVista: vi.fn(),
    irAArea: vi.fn(),
    resaltar: vi.fn(),
    desplazar: vi.fn(),
    acercar: vi.fn(),
    saltarConstruccion: vi.fn(),
    pausar: vi.fn(),
    destruir: vi.fn(),
  } satisfies Escena
  return { escena, quitarTrazo, oyentesSuelo, quitarCapa, quitarGeometrias, restituir, anclajes, oyentes }
}

export function mapaFalso(datos: DatosCampus): MapaListo & ReturnType<typeof escenaFalsa> {
  const falsa = escenaFalsa()
  return { ...falsa, datos }
}
