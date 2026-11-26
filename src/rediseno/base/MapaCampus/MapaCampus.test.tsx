// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatosCampus } from '@/types/campus3d'
import { CLAVE_CONSTRUCCION, indiceDeArea } from './areas'
import MapaCampus, { type MapaCampusRef } from './MapaCampus'

const area = (id: string, n: string) => ({
  id,
  n,
  c: '',
  s: 100,
  r: '',
  p: [0, 0, 10, 0, 10, 10],
  h: id,
  ct: [5, 5] as [number, number],
})
const datos = {
  atribucion: '© OpenStreetMap contributors · OpenFreeMap',
  areas: [area('b', 'Bosque'), area('a', 'Arboleda'), area('c', 'Cantera')],
} as unknown as DatosCampus

const escena = {
  repintar: vi.fn(),
  irAVista: vi.fn(),
  irAArea: vi.fn(),
  resaltar: vi.fn(),
  desplazar: vi.fn(),
  acercar: vi.fn(),
  saltarConstruccion: vi.fn(),
  pausar: vi.fn(),
  destruir: vi.fn(),
}
const crearEscena = vi.fn(() => escena)
const obtenerCampus3d = vi.fn()
const hayWebGL = vi.fn()

vi.mock('./escena', () => ({ crearEscena: (...args: unknown[]) => crearEscena(...(args as [])) }))
vi.mock('./webgl', () => ({ hayWebGL: () => hayWebGL() }))
vi.mock('@/services/api/campus3d', () => ({ obtenerCampus3d: () => obtenerCampus3d() }))

beforeEach(() => {
  sessionStorage.clear()
  hayWebGL.mockReturnValue(true)
  obtenerCampus3d.mockResolvedValue(datos)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('MapaCampus (AV-424)', () => {
  it('con WebGL: crea la escena con los datos, la construcción animada y marca la sesión', async () => {
    render(<MapaCampus onSeleccionarArea={() => {}} />)
    await waitFor(() => expect(crearEscena).toHaveBeenCalledTimes(1))
    expect(crearEscena).toHaveBeenCalledWith(expect.objectContaining({ datos, vista: 'iso', animar: true }))
    expect(sessionStorage.getItem(CLAVE_CONSTRUCCION)).toBe('1')
    expect(screen.getByText(/OpenStreetMap contributors/)).toBeTruthy()
  })

  it('la construcción no se repite en la misma sesión ni con reducir movimiento', async () => {
    sessionStorage.setItem(CLAVE_CONSTRUCCION, '1')
    render(<MapaCampus onSeleccionarArea={() => {}} />)
    await waitFor(() => expect(crearEscena).toHaveBeenCalled())
    expect(crearEscena).toHaveBeenLastCalledWith(expect.objectContaining({ animar: false }))
    cleanup()

    sessionStorage.clear()
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('reduce'), media: consulta }))
    render(<MapaCampus onSeleccionarArea={() => {}} />)
    await waitFor(() => expect(crearEscena).toHaveBeenCalledTimes(2))
    expect(crearEscena).toHaveBeenLastCalledWith(expect.objectContaining({ animar: false, reducirMovimiento: true }))
  })

  it('sin WebGL: avisa y muestra la lista de áreas, que llama a onSeleccionarArea', async () => {
    hayWebGL.mockReturnValue(false)
    const alSeleccionar = vi.fn()
    render(<MapaCampus onSeleccionarArea={alSeleccionar} />)

    expect(await screen.findByRole('status')).toBeTruthy()
    expect(screen.getByText(/no puede mostrar el mapa 3D/)).toBeTruthy()
    await userEvent.click(await screen.findByRole('button', { name: 'Bosque' }))
    expect(alSeleccionar).toHaveBeenCalledWith(datos.areas[0])
    expect(crearEscena).not.toHaveBeenCalled()
  })

  it('lista alternativa ordenada por nombre y fuera del orden de tabulación', async () => {
    render(<MapaCampus onSeleccionarArea={() => {}} />)
    const lista = await screen.findByRole('list', { name: 'Áreas del campus', hidden: true })
    const botones = within(lista).getAllByRole('button', { hidden: true })
    expect(botones.map((b) => b.textContent)).toEqual(['Arboleda', 'Bosque', 'Cantera'])
    expect(botones.every((b) => b.tabIndex === -1)).toBe(true)
  })

  it('una sola parada de tabulación; foco itinerante con flechas e Intro abre el área', async () => {
    const alSeleccionar = vi.fn()
    render(<MapaCampus onSeleccionarArea={alSeleccionar} />)
    const lienzo = await screen.findByRole('application', { name: 'Mapa 3D del campus PUCP' })
    await waitFor(() => expect(crearEscena).toHaveBeenCalled())
    expect(document.querySelectorAll('[tabindex="0"]')).toHaveLength(1)

    lienzo.focus()
    fireEvent.keyDown(lienzo, { key: 'ArrowRight' })
    expect(await screen.findByText('Área activa: Arboleda')).toBeTruthy()
    fireEvent.keyDown(lienzo, { key: 'ArrowRight' })
    fireEvent.keyDown(lienzo, { key: 'ArrowRight' })
    expect(await screen.findByText('Área activa: Cantera')).toBeTruthy()
    fireEvent.keyDown(lienzo, { key: 'ArrowRight' }) // da la vuelta
    expect(await screen.findByText('Área activa: Arboleda')).toBeTruthy()
    expect(escena.resaltar).toHaveBeenLastCalledWith(1)

    fireEvent.keyDown(lienzo, { key: 'Enter' })
    expect(alSeleccionar).toHaveBeenCalledWith(datos.areas[1])
    fireEvent.keyDown(lienzo, { key: 'Escape' })
    expect(alSeleccionar).toHaveBeenLastCalledWith(null)
  })

  it('Mayús+flechas desplazan y +/- acercan', async () => {
    render(<MapaCampus onSeleccionarArea={() => {}} />)
    const lienzo = await screen.findByRole('application')
    await waitFor(() => expect(crearEscena).toHaveBeenCalled())
    await waitFor(() => expect(escena.resaltar).toHaveBeenCalled())
    fireEvent.keyDown(lienzo, { key: 'ArrowLeft', shiftKey: true })
    expect(escena.desplazar).toHaveBeenCalledWith(-1, 0)
    fireEvent.keyDown(lienzo, { key: '+' })
    expect(escena.acercar).toHaveBeenCalledWith(1.25)
  })

  it('áreaSeleccionada, vista y el ref mueven la cámara', async () => {
    const ref = { current: null as MapaCampusRef | null }
    const { rerender } = render(<MapaCampus ref={ref} onSeleccionarArea={() => {}} areaSeleccionada="c" />)
    await waitFor(() => expect(escena.irAArea).toHaveBeenCalledWith(2))

    rerender(<MapaCampus ref={ref} onSeleccionarArea={() => {}} areaSeleccionada="c" vista="planta" />)
    expect(escena.irAVista).toHaveBeenCalledWith('planta')

    act(() => ref.current?.volarA('baja'))
    expect(escena.irAVista).toHaveBeenLastCalledWith('baja')
    act(() => ref.current?.volarA(datos.areas[0]))
    expect(escena.irAArea).toHaveBeenLastCalledWith(0)
    act(() => ref.current?.volver())
    expect(escena.irAArea).toHaveBeenLastCalledWith(null)
  })

  it('pausa la escena con activo=false y la destruye al desmontar', async () => {
    const { rerender, unmount } = render(<MapaCampus onSeleccionarArea={() => {}} activo={false} />)
    await waitFor(() => expect(escena.pausar).toHaveBeenCalledWith(true))
    rerender(<MapaCampus onSeleccionarArea={() => {}} />)
    expect(escena.pausar).toHaveBeenLastCalledWith(false)
    unmount()
    expect(escena.destruir).toHaveBeenCalled()
  })

  it('muestra el error de carga con reintento', async () => {
    obtenerCampus3d.mockRejectedValueOnce(new Error('caído'))
    render(<MapaCampus onSeleccionarArea={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('application')).toBeTruthy()
  })
})

describe('indiceDeArea', () => {
  it('acepta id o posición y descarta lo que no existe', () => {
    expect(indiceDeArea(datos, 'a')).toBe(1)
    expect(indiceDeArea(datos, 2)).toBe(2)
    expect(indiceDeArea(datos, 9)).toBeNull()
    expect(indiceDeArea(datos, 'x')).toBeNull()
    expect(indiceDeArea(datos, undefined)).toBeNull()
  })
})
