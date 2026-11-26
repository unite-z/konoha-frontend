// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RedirigirAlDisenoNuevo from './RedirigirAlDisenoNuevo'
import { RUTA_INGRESO } from './enlaces'

const diseno = vi.hoisted(() => ({ encendido: false }))
vi.mock('../useDisenoNuevo', () => ({
  useDisenoNuevo: () => ({ encendido: diseno.encendido }),
}))

afterEach(() => {
  cleanup()
  diseno.encendido = false
})

function Destino() {
  const { pathname, search, state } = useLocation()
  return (
    <p data-testid="destino" data-perdida={String(Boolean((state as { perdida?: boolean } | null)?.perdida))}>
      {`${pathname}${search}`}
    </p>
  )
}

function pintar(estado?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/ingreso', search: '?volver=%2Fpendientes', state: estado }]}>
      <Routes>
        <Route
          path="/ingreso"
          element={
            <RedirigirAlDisenoNuevo destino={RUTA_INGRESO}>
              <p>Ingreso actual</p>
            </RedirigirAlDisenoNuevo>
          }
        />
        <Route path="*" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RedirigirAlDisenoNuevo (AV-439)', () => {
  it('sin la preferencia del navegador se ve el inicio de sesión actual', () => {
    pintar()
    expect(screen.getByText('Ingreso actual')).toBeTruthy()
  })

  it('con el interruptor encendido redirige a /n/ingreso y conserva ?volver=', () => {
    diseno.encendido = true
    pintar()
    expect(screen.getByTestId('destino').textContent).toBe('/n/ingreso?volver=%2Fpendientes')
  })

  it('conserva el estado de la navegación: el aviso de sesión terminada llega a /n/ingreso', () => {
    diseno.encendido = true
    pintar({ perdida: true })
    expect(screen.getByTestId('destino').getAttribute('data-perdida')).toBe('true')
  })
})
