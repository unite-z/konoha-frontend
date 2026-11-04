// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SIN_FILTROS } from './calendarioCapas'
import PanelFiltros from './PanelFiltros'

afterEach(cleanup)

describe('PanelFiltros', () => {
  it('cambia tipo y proveedor y deja bloqueados cuadrilla, sector y lugar con su motivo', async () => {
    const onCambiar = vi.fn()
    render(
      <PanelFiltros
        id="panel"
        filtros={SIN_FILTROS}
        tipos={[{ valor: '1', texto: 'Corte de césped' }]}
        proveedores={[{ valor: 'propio', texto: 'Personal propio' }]}
        onCambiar={onCambiar}
      />,
    )

    await userEvent.setup().selectOptions(screen.getByLabelText('Tipo de servicio'), '1')
    expect(onCambiar).toHaveBeenCalledWith({ tipo: '1', proveedor: '' })
    expect((screen.getByLabelText('Cuadrilla') as HTMLSelectElement).disabled).toBe(true)
    expect(screen.getAllByText('Aún no disponible.')).toHaveLength(3)
  })
})
