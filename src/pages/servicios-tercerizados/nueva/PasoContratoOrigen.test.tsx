// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Contrato } from '@/types/tercerizados'
import { BORRADOR_VACIO } from '@/utils/nuevaAtencion'
import PasoContratoOrigen from './PasoContratoOrigen'

const listarContratos = vi.fn()
vi.mock('@/services/api/tercerizados', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('@/services/api/tercerizados')>()),
  listarContratos: (...argumentos: unknown[]) => listarContratos(...argumentos),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const vigente: Contrato = {
  id: 1,
  numero: 'CT-001',
  proveedor_id: 1,
  proveedor_nombre: 'Proveedor Demo',
  tipo_servicio_id: 1,
  tipo_servicio_nombre: 'Corte de césped',
  vigencia_inicio: '2026-01-01',
  vigencia_fin: '2026-12-31',
}

function montar(cambiar = vi.fn(), borrador = BORRADOR_VACIO) {
  render(
    <MemoryRouter>
      <PasoContratoOrigen borrador={borrador} cambiar={cambiar} errores={{}} servicio={null} />
    </MemoryRouter>,
  )
  return cambiar
}

describe('PasoContratoOrigen · contrato vigente', () => {
  it('solo ofrece contratos vigentes: los vencidos se quedan como histórico', async () => {
    listarContratos.mockResolvedValue({ count: 1, next: null, previous: null, results: [vigente] })
    montar()
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('combobox', { name: /Contrato vigente/ }))

    await waitFor(() => expect(listarContratos).toHaveBeenCalled())
    expect(listarContratos).toHaveBeenCalledWith({ vigente: true, q: undefined }, expect.anything())
    expect(screen.getByText(/Solo se listan contratos vigentes hoy/)).toBeTruthy()
  })

  it('al escribir, busca en el servidor sin dejar de pedir solo los vigentes', async () => {
    listarContratos.mockResolvedValue({ count: 1, next: null, previous: null, results: [vigente] })
    montar()
    const usuario = userEvent.setup()

    await usuario.type(screen.getByRole('combobox', { name: /Contrato vigente/ }), 'CT-0')

    await waitFor(() => expect(listarContratos).toHaveBeenCalledWith({ vigente: true, q: 'CT-0' }, expect.anything()))
  })

  it('elegir un contrato lo entrega al borrador', async () => {
    listarContratos.mockResolvedValue({ count: 1, next: null, previous: null, results: [vigente] })
    const cambiar = montar()
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('combobox', { name: /Contrato vigente/ }))
    await usuario.click(await screen.findByRole('option', { name: /CT-001/ }))

    expect(cambiar).toHaveBeenCalledWith({ contrato: vigente })
  })
})

describe('PasoContratoOrigen · modalidad', () => {
  it('ofrece las dos modalidades con la programada elegida por defecto', () => {
    montar()
    expect((screen.getByRole('radio', { name: 'Programada según contrato' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: 'Extraordinaria' }) as HTMLInputElement).checked).toBe(false)
    expect(screen.queryByText(/orden de servicio/)).toBeNull()
  })

  it('elegir la extraordinaria cambia el borrador', async () => {
    const cambiar = montar()
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Extraordinaria' }))
    expect(cambiar).toHaveBeenCalledWith({ clase: 'Extraordinaria' })
  })

  it('avisa que la extraordinaria no inicia sin su orden de servicio', () => {
    montar(vi.fn(), { ...BORRADOR_VACIO, clase: 'Extraordinaria' })
    expect(screen.getByText(/No podrá iniciar hasta/)).toBeTruthy()
  })
})
