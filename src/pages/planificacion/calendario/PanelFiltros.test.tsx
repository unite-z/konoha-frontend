// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SIN_FILTROS } from './calendarioCapas'
import PanelFiltros from './PanelFiltros'

afterEach(cleanup)

describe('PanelFiltros', () => {
  it('elige varios tipos y proveedor y solo los aplica al pulsar «Aplicar»; cuadrilla, sector y lugar, bloqueados', async () => {
    const onAplicar = vi.fn()
    render(
      <PanelFiltros
        id="panel"
        filtros={SIN_FILTROS}
        tipos={[
          { valor: '1', texto: 'Corte de césped' },
          { valor: '2', texto: 'Poda' },
        ]}
        proveedores={[{ valor: 'propio', texto: 'Personal propio' }]}
        onAplicar={onAplicar}
        onCerrar={vi.fn()}
      />,
    )
    const usuario = userEvent.setup()
    await usuario.click(screen.getByLabelText('Corte de césped'))
    await usuario.click(screen.getByLabelText('Poda'))
    await usuario.selectOptions(screen.getByLabelText('Proveedor'), 'propio')
    expect(onAplicar).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(onAplicar).toHaveBeenCalledWith({ tipos: ['1', '2'], proveedor: 'propio' })
    expect((screen.getByLabelText('Cuadrilla') as HTMLSelectElement).disabled).toBe(true)

    await usuario.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(onAplicar).toHaveBeenLastCalledWith(SIN_FILTROS)
  })
})
