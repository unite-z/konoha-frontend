// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { incidenciasSimuladas } from '@/services/simulados/incidencias'
import BandejaIncidenciasPage from './BandejaIncidenciasPage'

const datos = incidenciasSimuladas()
const listar = vi.fn(async (_signal?: AbortSignal, _q = '') => datos)
const anotarCausaRetraso = vi.fn(async () => undefined)
const reasignarIncidencia = vi.fn(async (id: number, _capataz: number) => ({ ...(datos.find((i) => i.id === id) ?? datos[0]), responsable: 'J. Ramos' }))
vi.mock('@/services/api/incidencias', () => ({
  listarIncidencias: (signal?: AbortSignal, q?: string) => listar(signal, q),
  anotarCausaRetraso: (...argumentos: unknown[]) => anotarCausaRetraso(...(argumentos as [])),
  listarCapatacesDisponibles: async () => [
    { id: 1, nombre: 'Luis P.', cuadrilla: 'Cuadrilla A' },
    { id: 3, nombre: 'J. Ramos', cuadrilla: 'Cuadrilla C' },
  ],
  reasignarIncidencia: (id: number, capataz: number) => reasignarIncidencia(id, capataz),
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
const pagina = vi.hoisted(() => ({ titulo: '' }))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: (titulo: string) => { pagina.titulo = titulo } }))
const sesion = vi.hoisted(() => ({ permisos: ['PLA.INCIDENCIA.CONSULTAR_TODAS'] as string[] }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ permisos: sesion.permisos }) }))

afterEach(() => {
  cleanup()
  listar.mockClear()
  sesion.permisos = ['PLA.INCIDENCIA.CONSULTAR_TODAS']
})

describe('BandejaIncidenciasPage', () => {
  it('muestra las incidencias con su severidad y vía, y filtra por pestaña', async () => {
    render(
      <MemoryRouter>
        <BandejaIncidenciasPage />
      </MemoryRouter>,
    )
    const tabla = await screen.findByRole('table')
    expect(within(tabla).getByText('INC-2026-041')).toBeTruthy()
    expect(within(tabla).getAllByText('Sin clasificar').length).toBeGreaterThan(0)
    expect(within(tabla).getByText('31 h')).toBeTruthy()

    await userEvent.setup().click(screen.getByRole('tab', { name: 'Cerradas 2' }))
    expect(within(screen.getByRole('table')).queryByText('INC-2026-041')).toBeNull()
    expect(within(screen.getByRole('table')).getByText('Descartada')).toBeTruthy()
  })

  it('avisa de las sencillas fuera de plazo y anota la causa o reasigna el capataz (Figma 388-7027 y 394-9392)', async () => {
    render(
      <MemoryRouter>
        <BandejaIncidenciasPage />
      </MemoryRouter>,
    )
    const usuario = userEvent.setup()
    const alertas = await screen.findByRole('region', { name: 'Plazo de incidencias sencillas' })
    expect(within(alertas).getByText('Supera el objetivo')).toBeTruthy()
    expect(within(alertas).getByText('Poda de ramas · Pabellón Z · 46 h · Marta R.')).toBeTruthy()

    await usuario.click(within(alertas).getAllByRole('button', { name: 'Anotar causa' })[0])
    expect(screen.getByRole('dialog', { name: 'Anotar causa · INC-2026-038' })).toBeTruthy()
    await usuario.type(screen.getByLabelText(/^Causa/), 'Lluvia')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(anotarCausaRetraso).toHaveBeenCalledWith(38, 'Lluvia')
    expect(await screen.findByText('Causa anotada en INC-2026-038')).toBeTruthy()

    await usuario.click(within(alertas).getAllByRole('button', { name: 'Reasignar' })[0])
    await usuario.selectOptions(await screen.findByLabelText(/^Capataz/), '3')
    await usuario.click(within(screen.getByRole('dialog', { name: 'Reasignar · INC-2026-038' })).getByRole('button', { name: 'Reasignar' }))
    expect(reasignarIncidencia).toHaveBeenCalledWith(38, 3)
    expect(await screen.findByText('INC-2026-038 reasignada a J. Ramos')).toBeTruthy()
  })

  it('busca en el servidor al enviar y vuelve a pedir la bandeja con el término (AV-407)', async () => {
    render(
      <MemoryRouter>
        <BandejaIncidenciasPage />
      </MemoryRouter>,
    )
    await screen.findByRole('table')
    expect(listar).toHaveBeenLastCalledWith(expect.any(AbortSignal), '')

    const usuario = userEvent.setup()
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar incidencias' }), '  rama  ')
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }))
    await screen.findByRole('table')
    expect(listar).toHaveBeenLastCalledWith(expect.any(AbortSignal), 'rama')
  })

  it('sin el permiso de consultar todas, la bandeja se presenta como la de su cuadrilla (AV-407)', async () => {
    sesion.permisos = ['PLA.INCIDENCIA.REGISTRAR']
    render(
      <MemoryRouter>
        <BandejaIncidenciasPage />
      </MemoryRouter>,
    )
    await screen.findByRole('table')
    expect(pagina.titulo).toBe('Incidencias de mi cuadrilla')
  })

  it('con el permiso, el título sigue siendo «Incidencias»', async () => {
    render(
      <MemoryRouter>
        <BandejaIncidenciasPage />
      </MemoryRouter>,
    )
    await screen.findByRole('table')
    expect(pagina.titulo).toBe('Incidencias')
  })
})
