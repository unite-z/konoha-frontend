// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AccesosPage from './AccesosPage'

const api = vi.hoisted(() => ({ listarAccesos: vi.fn() }))
vi.mock('@/services/api/core', () => api)
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))

function pintar(ruta = '/usuarios-roles/accesos') {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <AccesosPage />
    </MemoryRouter>,
  )
}

function ultimosFiltros() {
  return api.listarAccesos.mock.lastCall?.[0]
}

beforeEach(() => {
  api.listarAccesos.mockReset()
  api.listarAccesos.mockResolvedValue({
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 1,
        usuario_id: null,
        usuario_nombre: null,
        identificador: 'ajeno@pucp.edu.pe',
        fecha_hora: '2026-11-05T10:00:00-05:00',
        canal: 'api',
        resultado: 'Fallido',
        motivo: null,
        ruta: null,
      },
    ],
  })
})

afterEach(cleanup)

describe('AccesosPage', () => {
  it('muestra el canal con su nombre y el identificador si no hay cuenta', async () => {
    pintar()

    expect(await screen.findByText('Sistema')).toBeTruthy()
    expect(screen.getByText('ajeno@pucp.edu.pe')).toBeTruthy()
  })

  it('lee los filtros de la URL y los envía al servidor', async () => {
    pintar('/usuarios-roles/accesos?resultado=Fallido&canal=campo&usuario=ana&desde=2026-11-01&hasta=2026-11-05')

    await waitFor(() =>
      expect(ultimosFiltros()).toMatchObject({
        resultado: 'Fallido',
        canal: 'campo',
        usuario: 'ana',
        desde: '2026-11-01',
        hasta: '2026-11-05',
      }),
    )
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeTruthy()
  })

  it('filtra por canal y vuelve a la primera página', async () => {
    const usuario = userEvent.setup()
    pintar('/usuarios-roles/accesos?page=3')
    await waitFor(() => expect(ultimosFiltros()).toMatchObject({ page: 3 }))

    await usuario.selectOptions(screen.getByLabelText('Canal'), 'campo')

    await waitFor(() => expect(ultimosFiltros()).toMatchObject({ canal: 'campo', page: 1 }))
  })

  it('busca por usuario una sola vez, después de terminar de escribir', async () => {
    const usuario = userEvent.setup()
    pintar()
    await screen.findByText('Sistema')
    const llamadas = api.listarAccesos.mock.calls.length

    await usuario.type(screen.getByLabelText('Usuario'), 'ana')

    await waitFor(() => expect(ultimosFiltros()).toMatchObject({ usuario: 'ana' }))
    expect(api.listarAccesos.mock.calls.length).toBe(llamadas + 1)
  })

  it('«Limpiar filtros» los quita todos', async () => {
    const usuario = userEvent.setup()
    pintar('/usuarios-roles/accesos?canal=campo&usuario=ana')
    await screen.findByText('Sistema')

    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    await waitFor(() => expect(ultimosFiltros()).toMatchObject({ canal: '', usuario: '' }))
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull()
  })
})
