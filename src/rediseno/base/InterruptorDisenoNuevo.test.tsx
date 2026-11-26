// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_DISENO_NUEVO } from '../usarDisenoNuevo'
import InterruptorDisenoNuevo from './InterruptorDisenoNuevo'

const datos = new Map<string, string>()

beforeEach(() => {
  datos.clear()
  vi.stubGlobal('localStorage', {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => void datos.set(clave, valor),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Interruptor «Diseño nuevo» (AV-420)', () => {
  it('parte sin elegir, guarda lo que se elige y enlaza a /n', async () => {
    const usuario = userEvent.setup()
    render(
      <MemoryRouter>
        <InterruptorDisenoNuevo />
      </MemoryRouter>,
    )
    expect((screen.getByRole('radio', { name: 'Encendido' }) as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('radio', { name: 'Apagado' }) as HTMLInputElement).checked).toBe(false)
    await usuario.click(screen.getByRole('radio', { name: 'Encendido' }))
    expect(datos.get(CLAVE_DISENO_NUEVO)).toBe('1')
    expect((screen.getByRole('radio', { name: 'Encendido' }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByRole('link', { name: 'Abrir el diseño nuevo' }).getAttribute('href')).toBe('/n')
  })
})
