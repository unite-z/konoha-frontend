// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PermisoCatalogo, PermisosRol, RolConPermisos } from '@/types/core'
import RolesPermisosPage from './RolesPermisosPage'

const catalogo: PermisoCatalogo[] = [
  { codigo: 'CORE.ROL.GESTIONAR', modulo: 'MOD-01', descripcion: 'Gestionar los permisos de cada rol', es_sensible: true },
  { codigo: 'CORE.REPOSITORIO.CONSULTAR', modulo: 'MOD-01', descripcion: 'Consultar el repositorio', es_sensible: false },
  { codigo: 'PLA.CORTE.REGISTRAR', modulo: 'MOD-03', descripcion: 'Registrar el avance del corte de césped', es_sensible: false },
]
const capataz: RolConPermisos = { codigo: 'capataz', nombre: 'Capataz', descripcion: 'Responsable de una cuadrilla', activo: true, permisos: ['PLA.CORTE.REGISTRAR'] }
const ingeniero: RolConPermisos = { codigo: 'ingeniero-campo', nombre: 'Ingeniero de campo', descripcion: 'Coordina', activo: true, permisos: ['PLA.CORTE.REGISTRAR', 'CORE.REPOSITORIO.CONSULTAR'] }
const cambiarPermisosRol = vi.fn(async (_codigo: string, permisos: string[], _motivo: string): Promise<PermisosRol> => ({ rol: { ...capataz, permisos }, historial: [] }))

vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/services/api/core', () => ({
  listarRoles: async () => [capataz, ingeniero],
  listarPermisos: async () => catalogo,
  obtenerPermisosRol: async (codigo: string): Promise<PermisosRol> => ({ rol: codigo === 'capataz' ? capataz : ingeniero, historial: [] }),
  cambiarPermisosRol: (codigo: string, permisos: string[], motivo: string) => cambiarPermisosRol(codigo, permisos, motivo),
}))

afterEach(() => {
  cleanup()
  cambiarPermisosRol.mockClear()
})

function pintar() {
  render(
    <MemoryRouter>
      <RolesPermisosPage />
    </MemoryRouter>,
  )
}

describe('RolesPermisosPage (AV-381)', () => {
  it('muestra cada rol con su número de permisos y los permisos por módulo', async () => {
    pintar()
    expect(await screen.findByRole('tab', { name: /Capataz/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Ingeniero de campo/ })).toBeTruthy()
    expect(await screen.findByRole('checkbox', { name: 'Registrar el avance del corte de césped' })).toHaveProperty('checked', true)
    expect(screen.getByRole('checkbox', { name: 'Consultar el repositorio' })).toHaveProperty('checked', false)
    // Exclusivo del superadministrador: no se puede marcar.
    expect(screen.getByRole('checkbox', { name: 'Gestionar los permisos de cada rol' })).toHaveProperty('disabled', true)
  })

  it('guarda los permisos marcados con motivo obligatorio', async () => {
    pintar()
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('checkbox', { name: 'Consultar el repositorio' }))
    expect(screen.getByText('1 añadidos')).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Guardar permisos' }))
    expect(cambiarPermisosRol).not.toHaveBeenCalled()
    await usuario.type(screen.getByLabelText(/Motivo del cambio/), 'Consulta el repositorio en campo')
    await usuario.click(screen.getByRole('button', { name: 'Guardar permisos' }))
    expect(cambiarPermisosRol).toHaveBeenCalledWith('capataz', ['CORE.REPOSITORIO.CONSULTAR', 'PLA.CORTE.REGISTRAR'], 'Consulta el repositorio en campo')
    expect(await screen.findByText(/Permisos guardados: 2/)).toBeTruthy()
  })
})
