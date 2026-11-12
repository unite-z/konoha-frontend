// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SIN_FILTROS } from './calendarioCapas'
import PanelFiltros from './PanelFiltros'
import type { CatalogosCalendario } from './useCatalogosCalendario'

afterEach(cleanup)

const CATALOGOS: CatalogosCalendario = {
  cuadrillas: [{ valor: '3', texto: 'Cuadrilla Norte' }],
  sectores: [{ valor: '7', texto: 'Sector A' }],
  lugares: [{ valor: '12', texto: 'Jardín de Letras' }],
}

function panel(catalogos: CatalogosCalendario, onAplicar = vi.fn()) {
  render(
    <PanelFiltros
      id="panel"
      filtros={SIN_FILTROS}
      tipos={[
        { valor: '1', texto: 'Corte de césped' },
        { valor: '2', texto: 'Poda' },
      ]}
      proveedores={[{ valor: 'propio', texto: 'Personal propio' }]}
      catalogos={catalogos}
      onAplicar={onAplicar}
      onCerrar={vi.fn()}
    />,
  )
  return onAplicar
}

describe('PanelFiltros', () => {
  it('elige tipos, proveedor, cuadrilla, sector y lugar y solo los aplica al pulsar «Aplicar»', async () => {
    const onAplicar = panel(CATALOGOS)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByLabelText('Corte de césped'))
    await usuario.click(screen.getByLabelText('Poda'))
    await usuario.selectOptions(screen.getByLabelText('Proveedor'), 'propio')
    await usuario.selectOptions(screen.getByLabelText('Cuadrilla'), 'Cuadrilla Norte')
    await usuario.selectOptions(screen.getByLabelText('Sector'), 'Sector A')
    await usuario.selectOptions(screen.getByLabelText('Lugar'), 'Jardín de Letras')
    expect(onAplicar).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(onAplicar).toHaveBeenCalledWith({
      tipos: ['1', '2'],
      proveedor: 'propio',
      cuadrilla: '3',
      sector: '7',
      lugar: '12',
    })
    expect(screen.queryByText(/aún no disponibles/)).toBeNull()

    await usuario.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(onAplicar).toHaveBeenLastCalledWith(SIN_FILTROS)
  })

  it('bloquea con su motivo el selector cuyo catálogo falló y deja los demás activos', () => {
    panel({ ...CATALOGOS, cuadrillas: [], motivoCuadrillas: 'No se pudo cargar la lista' })
    expect((screen.getByLabelText('Cuadrilla') as HTMLSelectElement).disabled).toBe(true)
    expect(screen.getByText('No se pudo cargar la lista')).toBeTruthy()
    expect((screen.getByLabelText('Sector') as HTMLSelectElement).disabled).toBe(false)
    expect((screen.getByLabelText('Lugar') as HTMLSelectElement).disabled).toBe(false)
  })
})
