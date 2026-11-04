// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import ExportarExcel from './ExportarExcel'

const dobles = vi.hoisted(() => ({
  permisos: [] as string[],
  exportarListado: vi.fn(),
  guardarArchivo: vi.fn(),
}))

vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ permisos: dobles.permisos }) }))
vi.mock('@/services/api/core', () => ({ exportarListado: dobles.exportarListado }))
vi.mock('@/services/api/clienteReportesGestion', () => ({ guardarArchivo: dobles.guardarArchivo }))

beforeEach(() => {
  dobles.permisos = ['INV.INVENTARIO.CONSULTAR']
  dobles.exportarListado.mockReset()
  dobles.guardarArchivo.mockReset()
})

afterEach(cleanup)

describe('ExportarExcel', () => {
  it('sin el permiso de la entidad no se muestra', () => {
    render(<ExportarExcel listado="actividades" />)

    expect(screen.queryByRole('button', { name: 'Exportar a Excel' })).toBeNull()
  })

  it('descarga el archivo del listado', async () => {
    const archivo = new Blob(['xlsx'])
    dobles.exportarListado.mockResolvedValue(archivo)
    render(<ExportarExcel listado="ejemplares" />)

    await userEvent.click(screen.getByRole('button', { name: 'Exportar a Excel' }))

    expect(dobles.exportarListado).toHaveBeenCalledWith('ejemplares')
    expect(dobles.guardarArchivo).toHaveBeenCalledWith(archivo, 'ejemplares.xlsx')
  })

  it('si el servidor lo rechaza, avisa sin descargar nada', async () => {
    dobles.exportarListado.mockRejectedValue(new ErrorApi(403, null, 'Tu rol no tiene acceso a esta función'))
    render(<ExportarExcel listado="ejemplares" />)

    await userEvent.click(screen.getByRole('button', { name: 'Exportar a Excel' }))

    expect(await screen.findByText('Tu rol no tiene acceso a esta función')).toBeTruthy()
    expect(dobles.guardarArchivo).not.toHaveBeenCalled()
  })
})
