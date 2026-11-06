// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContratoMaestro } from '@/types/maestrosTercerizados'
import ListaContratos from './ListaContratos'
import { FILTROS_MAESTROS_VACIOS, type FiltrosMaestros } from './filtrosMaestros'

const listarContratosMaestro = vi.fn()
vi.mock('@/services/api/maestrosTercerizados', () => ({
  listarContratosMaestro: (...argumentos: unknown[]) => listarContratosMaestro(...argumentos),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function contrato(id: number, numero: string, vigente: boolean): ContratoMaestro {
  return {
    id,
    numero,
    proveedor_id: 1,
    proveedor_nombre: 'Proveedor Demo',
    tipo_servicio_id: 1,
    tipo_servicio_nombre: 'Corte de césped',
    vigencia_inicio: vigente ? '2026-01-01' : '2024-01-01',
    vigencia_fin: vigente ? '2026-12-31' : '2024-12-31',
    area_metrado_estimado: '1200 m²',
    monto_fijo: '8500.00',
    frecuencia_pactada: '4 veces al año',
    frecuencia_cantidad: 4,
    frecuencia_unidad: 'Anio',
    condiciones: '',
    vigente,
    atenciones: 0,
  } as unknown as ContratoMaestro
}

function pagina(...contratos: ContratoMaestro[]) {
  return { count: contratos.length, next: null, previous: null, results: contratos }
}

function montar(filtros: Partial<FiltrosMaestros> = {}, establecer = vi.fn()) {
  render(
    <MemoryRouter>
      <ListaContratos filtros={{ ...FILTROS_MAESTROS_VACIOS, ...filtros }} establecer={establecer} puedeRegistrar />
    </MemoryRouter>,
  )
  return establecer
}

describe('ListaContratos · vigencia', () => {
  it('conserva el contrato vencido como histórico y marca el vigente', async () => {
    listarContratosMaestro.mockResolvedValue(pagina(contrato(1, 'CT-001', true), contrato(2, 'CT-002', false)))

    montar()

    const vigente = await screen.findByRole('row', { name: /CT-001/ })
    const vencido = screen.getByRole('row', { name: /CT-002/ })
    expect(within(vigente).getByText('Vigente')).toBeTruthy()
    expect(within(vencido).getByText('Vencido')).toBeTruthy()
    expect(within(vigente).queryByText('Vencido')).toBeNull()
  })

  it('sin filtro de vigencia pide todos los contratos', async () => {
    listarContratosMaestro.mockResolvedValue(pagina(contrato(1, 'CT-001', true)))

    montar()

    await waitFor(() => expect(listarContratosMaestro).toHaveBeenCalled())
    expect(listarContratosMaestro).toHaveBeenCalledWith({ q: undefined, vigente: undefined }, 1, expect.anything())
  })

  it('con el filtro «vencido» pide solo el histórico al servidor', async () => {
    listarContratosMaestro.mockResolvedValue(pagina(contrato(2, 'CT-002', false)))

    montar({ vigencia: 'vencido' })

    await screen.findByRole('row', { name: /CT-002/ })
    expect(listarContratosMaestro).toHaveBeenCalledWith({ q: undefined, vigente: false }, 1, expect.anything())
    expect(screen.getByText('1 contrato con estos filtros')).toBeTruthy()
  })

  it('con el filtro «vigente» pide solo los vigentes', async () => {
    listarContratosMaestro.mockResolvedValue(pagina(contrato(1, 'CT-001', true)))

    montar({ vigencia: 'vigente' })

    await screen.findByRole('row', { name: /CT-001/ })
    expect(listarContratosMaestro).toHaveBeenCalledWith({ q: undefined, vigente: true }, 1, expect.anything())
  })

  it('elegir una vigencia actualiza los filtros y vuelve a la primera página', async () => {
    listarContratosMaestro.mockResolvedValue(pagina(contrato(1, 'CT-001', true)))
    const establecer = montar({ pagina: '3' })
    const usuario = userEvent.setup()
    await screen.findByRole('row', { name: /CT-001/ })

    await usuario.selectOptions(screen.getByLabelText('Vigencia'), 'vencido')

    expect(establecer).toHaveBeenCalledWith({ vigencia: 'vencido', pagina: null })
  })

  it('si no hay contratos con el filtro, ofrece limpiarlo', async () => {
    listarContratosMaestro.mockResolvedValue(pagina())

    montar({ vigencia: 'vencido' })

    expect(await screen.findByText('Sin contratos con estos filtros')).toBeTruthy()
  })
})
