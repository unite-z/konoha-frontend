// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rutaDetalleProveedor } from '@/router/rutasApp'
import type { ProveedorMaestro } from '@/types/maestrosTercerizados'
import ProveedorDetallePage from './ProveedorDetallePage'

/** Ficha del proveedor (AV-410): vínculo con enlace, contacto vacío y sin conteos repetidos. */

const api = vi.hoisted(() => ({ obtenerProveedor: vi.fn(), listarContratosMaestro: vi.fn(), cambiarEstadoProveedor: vi.fn() }))
vi.mock('@/services/api/maestrosTercerizados', () => api)
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => [] }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function proveedor(cambios: Partial<ProveedorMaestro> = {}): ProveedorMaestro {
  return {
    id: 1,
    razon_social: 'Verde Sur SAC',
    ruc: '20555530090',
    activo: true,
    contacto_nombre: '',
    contacto_telefono: '',
    contacto_correo: '',
    tipo_vinculo: 'Principal',
    proveedor_relacionado_id: null,
    proveedor_relacionado_nombre: null,
    contratos: 0,
    ...cambios,
  }
}

const SIN_CONTRATOS = { count: 0, next: null, previous: null, results: [] }

function pagina(id = 1) {
  return render(
    <MemoryRouter initialEntries={[rutaDetalleProveedor(id)]}>
      <Routes>
        <Route path={rutaDetalleProveedor(':id')} element={<ProveedorDetallePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProveedorDetallePage', () => {
  it('enlaza la empresa relacionada y abre su ficha', async () => {
    const principal = proveedor({ id: 7, razon_social: 'Grupo Verde SA' })
    api.obtenerProveedor.mockImplementation((id: number) =>
      Promise.resolve(
        id === 7
          ? principal
          : proveedor({ tipo_vinculo: 'Subsidiaria', proveedor_relacionado_id: 7, proveedor_relacionado_nombre: 'Grupo Verde SA' }),
      ),
    )
    api.listarContratosMaestro.mockResolvedValue(SIN_CONTRATOS)
    pagina()

    const enlace = await screen.findByRole('link', { name: 'Grupo Verde SA' })
    expect(screen.getByText(/Subsidiaria de/)).toBeTruthy()
    await userEvent.click(enlace)

    expect(await screen.findByRole('heading', { name: 'Grupo Verde SA' })).toBeTruthy()
    expect(api.obtenerProveedor).toHaveBeenLastCalledWith(7, expect.anything())
  })

  it('sin contacto muestra una frase y no repite el número de contratos', async () => {
    api.obtenerProveedor.mockResolvedValue(proveedor())
    api.listarContratosMaestro.mockResolvedValue(SIN_CONTRATOS)
    pagina()

    expect(await screen.findByText('Sin persona de contacto registrada.')).toBeTruthy()
    expect(await screen.findByText('Este proveedor aún no tiene contratos')).toBeTruthy()
    expect(screen.queryByText('0 contratos')).toBeNull()
    expect(screen.queryByText('Contratos')).toBeNull()
  })
})
