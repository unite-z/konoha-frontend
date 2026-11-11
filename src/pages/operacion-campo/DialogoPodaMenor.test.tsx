// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import DialogoPodaMenor from './DialogoPodaMenor'
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 4, nombre: 'J. Ramos' } }) }))

const pagina = (results: unknown[]) => ({ count: results.length, results, next: null, previous: null })

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function () { this.open = true }
  HTMLDialogElement.prototype.close ??= function () { this.open = false }
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function preparar(altura: number | null) {
  const cuerpos: Record<string, unknown>[] = []
  vi.stubGlobal('fetch', vi.fn(async (ruta: string, opciones: RequestInit = {}) => {
    const url = new URL(ruta, 'http://localhost')
    if (url.pathname.includes('/inventario/ejemplares')) return Response.json([{ id: 9, codigo: 'EJ-00009', area_verde_id: 2, altura_total_m: altura }])
    if (opciones.method === 'POST' && url.pathname.endsWith('/partes/')) return Response.json({ id: 30, fecha: '2026-11-04', estado: 'Abierto' })
    if (opciones.method === 'POST' && url.pathname.endsWith('/actividades/')) {
      const cuerpo = JSON.parse(String(opciones.body)) as Record<string, unknown>
      cuerpos.push(cuerpo)
      return Response.json({ id: 40, estado: 'Abierto', ...cuerpo })
    }
    if (url.pathname.includes('tipos-actividad')) return Response.json(pagina([{ id: 7, nombre: 'Poda menor', activo: true, clase_id: 4 }]))
    if (url.pathname.includes('areas-verdes')) return Response.json(pagina([{ id: 2, nombre: 'Jardín A', activo: true }]))
    if (url.pathname.includes('cuadrillas')) return Response.json(pagina([{ id: 1, nombre: 'Cuadrilla 1', activa: true }]))
    if (url.pathname.includes('partes')) return Response.json(pagina([]))
    return Response.json(pagina([]))
  }))
  return cuerpos
}

async function seleccionarBase(arbol = '9') {
  const usuario = userEvent.setup()
  await usuario.selectOptions(await screen.findByLabelText(/^Cuadrilla/), '1')
  await usuario.selectOptions(screen.getByLabelText(/^Espacio verde/), '2')
  await usuario.selectOptions(await screen.findByLabelText(/^Árbol/), arbol)
  return usuario
}

describe('DialogoPodaMenor', () => {
  it('vincula la poda de un árbol menor de 5 m al ejemplar y al parte', async () => {
    const cuerpos = preparar(3.2)
    const guardado = vi.fn()
    render(<DialogoPodaMenor onCerrar={vi.fn()} onGuardado={guardado} onIncidencia={vi.fn()} />)
    const usuario = await seleccionarBase()
    const fecha = (screen.getByLabelText(/^Fecha/) as HTMLInputElement).value
    await usuario.click(screen.getByRole('button', { name: 'Registrar poda y añadir foto' }))
    await waitFor(() => expect(guardado).toHaveBeenCalled())
    expect(cuerpos[0].fecha_hora_actividad).toBe(`${fecha}T08:00:00-05:00`)
    expect(cuerpos[0]).toMatchObject({ parte_id: 30, tipo_actividad_id: 7, area_verde_id: 2, ejemplar_id: 9, pendiente_vinculacion: false })
  })

  it('registra sobre el espacio y deja pendiente un árbol sin catastro', async () => {
    const cuerpos = preparar(3.2)
    render(<DialogoPodaMenor onCerrar={vi.fn()} onGuardado={vi.fn()} onIncidencia={vi.fn()} />)
    const usuario = await seleccionarBase('sin-catastro')
    expect(screen.getByText(/pendiente de vinculación al catastro/i)).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Registrar poda y añadir foto' }))
    await waitFor(() => expect(cuerpos).toHaveLength(1))
    expect(cuerpos[0]).toMatchObject({ ejemplar_id: null, pendiente_vinculacion: true })
  })

  it('impide la poda de 5 m o más y ofrece reportar una incidencia', async () => {
    const cuerpos = preparar(5)
    render(<DialogoPodaMenor onCerrar={vi.fn()} onGuardado={vi.fn()} onIncidencia={vi.fn()} />)
    const usuario = await seleccionarBase()
    expect(screen.getByText(/La poda menor no está permitida/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reportar incidencia' })).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Registrar poda y añadir foto' }))
    expect(cuerpos).toHaveLength(0)
  })
})
