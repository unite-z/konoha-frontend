// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MapaCampusProps } from '../MapaCampus/MapaCampus'
import { ProveedorEscenario, useMapaVisible, useVistaDeMapa } from '.'

const propiedades = vi.fn()
let montajes = 0
vi.mock('../MapaCampus/MapaCampus', async () => {
  const { useEffect } = await import('react')
  return {
    default: function MapaFalso(props: MapaCampusProps) {
      useEffect(() => {
        montajes++
      }, [])
      propiedades(props)
      return <div data-testid="mapa" />
    },
  }
})

function VistaMapa({ area, alSeleccionar = () => {} }: { area?: string; alSeleccionar?: () => void }) {
  useVistaDeMapa({ areaSeleccionada: area, vista: 'planta', onSeleccionarArea: alSeleccionar })
  return <p>Vista de mapa</p>
}
const VistaLisa = () => <p>Vista lisa</p>
function Estado() {
  return <output>{useMapaVisible() ? 'con mapa' : 'sin mapa'}</output>
}

function Pantalla() {
  const [vista, setVista] = useState<'ninguna' | 'a' | 'b' | 'lisa'>('ninguna')
  return (
    <ProveedorEscenario>
      <Estado />
      <button onClick={() => setVista('a')}>ir a</button>
      <button onClick={() => setVista('b')}>ir a b</button>
      <button onClick={() => setVista('lisa')}>ir a lisa</button>
      {vista === 'a' && <VistaMapa area="x" />}
      {vista === 'b' && <VistaMapa area="y" />}
      {vista === 'lisa' && <VistaLisa />}
    </ProveedorEscenario>
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  montajes = 0
})

const pulsar = (nombre: string) => act(() => screen.getByRole('button', { name: nombre }).click())
const contenedor = () => document.querySelector('[data-visible]') as HTMLElement

describe('ProveedorEscenario (AV-426)', () => {
  it('no monta el mapa (ni Three.js) hasta la primera vista de mapa', () => {
    render(<Pantalla />)
    expect(screen.queryByTestId('mapa')).toBeNull()
    expect(screen.getByText('sin mapa')).toBeTruthy()
    expect(contenedor().getAttribute('data-visible')).toBe('false')
  })

  it('una vista de mapa lo muestra y le pasa área, vista y estado activo', async () => {
    render(<Pantalla />)
    pulsar('ir a')
    await screen.findByTestId('mapa')
    expect(screen.getByText('con mapa')).toBeTruthy()
    expect(contenedor().getAttribute('data-visible')).toBe('true')
    expect(propiedades).toHaveBeenLastCalledWith(
      expect.objectContaining({ areaSeleccionada: 'x', vista: 'planta', activo: true }),
    )
  })

  it('sin vista de mapa se oculta y se pausa, pero sigue montado con su cámara', async () => {
    render(<Pantalla />)
    pulsar('ir a')
    await screen.findByTestId('mapa')
    pulsar('ir a lisa')
    expect(screen.getByText('sin mapa')).toBeTruthy()
    expect(screen.getByTestId('mapa')).toBeTruthy()
    expect(contenedor().getAttribute('data-visible')).toBe('false')
    expect(contenedor().hasAttribute('inert')).toBe(true)
    expect(propiedades).toHaveBeenLastCalledWith(
      expect.objectContaining({ activo: false, areaSeleccionada: 'x', vista: 'planta' }),
    )
  })

  it('al pasar de una vista de mapa a otra no se desmonta ni se oculta', async () => {
    render(<Pantalla />)
    pulsar('ir a')
    await screen.findByTestId('mapa')
    pulsar('ir a b')
    await waitFor(() =>
      expect(propiedades).toHaveBeenLastCalledWith(expect.objectContaining({ areaSeleccionada: 'y', activo: true })),
    )
    expect(montajes).toBe(1)
    expect(contenedor().getAttribute('data-visible')).toBe('true')
  })

  it('el clic en el mapa llega a la vista activa', async () => {
    const alSeleccionar = vi.fn()
    render(
      <ProveedorEscenario>
        <VistaMapa alSeleccionar={alSeleccionar} />
      </ProveedorEscenario>,
    )
    await screen.findByTestId('mapa')
    const props = propiedades.mock.lastCall?.[0] as MapaCampusProps
    props.onSeleccionarArea(null)
    expect(alSeleccionar).toHaveBeenCalledWith(null)
  })

  it('fuera del layout useVistaDeMapa no hace nada', () => {
    expect(() => render(<VistaMapa />)).not.toThrow()
  })
})
