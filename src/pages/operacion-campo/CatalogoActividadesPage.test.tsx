// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EntradaTipoActividadCampo, TipoActividadCampo } from '@/types/operacionCampo'
import CatalogoActividadesPage from './CatalogoActividadesPage'
import DialogoNuevaActividad from './DialogoNuevaActividad'

const sesion = vi.hoisted(() => ({ usuario: { id: 4, nombre: 'J. Ramos' }, permisos: ['CORE.CATALOGO.GESTIONAR'] }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => sesion }))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))

// Contrato propuesto: estas respuestas no acreditan integración con el backend.
const clases = ['Habilitación', 'Rehabilitación y rediseño', 'Mantenimiento', 'Poda', 'Propagación y plantación', 'Riego', 'Manejo fitosanitario', 'Manejo de residuos vegetales', 'Inspección y monitoreo'].map((nombre, i) => ({ id: i + 1, nombre, activo: true }))
let tipos: TipoActividadCampo[]
let falloLectura = 0
let falloEscritura = 0
const escrituras: { metodo: string; entrada: EntradaTipoActividadCampo }[] = []
const pagina = (results: unknown[]) => ({ count: results.length, results, next: null, previous: null })

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function () { this.open = true }
  HTMLDialogElement.prototype.close ??= function () { this.open = false }
})
beforeEach(() => {
  tipos = [{ id: 1, nombre: 'Canteo', activo: true, clase_id: 3 }, { id: 2, nombre: 'Poda antigua', activo: false, clase_id: 4 }]
  falloLectura = 0; falloEscritura = 0; escrituras.length = 0
  sesion.permisos = ['CORE.CATALOGO.GESTIONAR']
  vi.stubGlobal('fetch', vi.fn(async (ruta: string, opciones: RequestInit) => {
    const url = new URL(ruta, 'http://localhost')
    const metodo = opciones.method ?? 'GET'
    if (metodo !== 'GET') {
      const entrada = JSON.parse(String(opciones.body)) as EntradaTipoActividadCampo
      escrituras.push({ metodo, entrada })
      if (falloEscritura) return Response.json({ detalle: 'Operación rechazada' }, { status: falloEscritura })
      const id = metodo === 'POST' ? 3 : Number(url.pathname.split('/').at(-2))
      const tipo = { ...entrada, id }
      tipos = [...tipos.filter(t => t.id !== id), tipo]
      return Response.json(tipo)
    }
    if (url.pathname.includes('clases-actividad')) return falloLectura ? Response.json({ detalle: 'No disponible' }, { status: falloLectura }) : Response.json(pagina(clases))
    if (url.pathname.includes('tipos-actividad')) return Response.json(pagina(url.searchParams.get('activo') === 'true' ? tipos.filter(t => t.activo) : tipos))
    if (url.pathname.includes('cuadrillas')) return Response.json(pagina([{ id: 1, nombre: 'Cuadrilla de prueba' }]))
    return Response.json(pagina([]))
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('AV-62: catálogo de actividades (API simulada)', () => {
  it('muestra las nueve clases y filtra tipos por clase y estado', async () => {
    render(<CatalogoActividadesPage />)
    const filtro = await screen.findByLabelText('Clase de actividad')
    expect(within(filtro).getAllByRole('option')).toHaveLength(10)
    await userEvent.selectOptions(filtro, '4')
    expect(screen.queryByText('Canteo')).toBeNull()
    expect(screen.getByText('Poda antigua')).toBeTruthy()
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'true')
    expect(screen.getByText('No hay tipos de actividad')).toBeTruthy()
  })

  it('crea un tipo activo que aparece al abrir el registro del parte', async () => {
    const usuario = userEvent.setup()
    const vista = render(<CatalogoActividadesPage />)
    await usuario.click(await screen.findByRole('button', { name: 'Añadir tipo de actividad' }))
    const dialogo = screen.getByRole('dialog')
    await usuario.selectOptions(within(dialogo).getByLabelText(/^Clase de actividad/), '4')
    await usuario.type(within(dialogo).getByLabelText(/^Nombre del tipo/), 'Poda de formación')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar tipo' }))
    expect(await screen.findByText('Tipo de actividad guardado')).toBeTruthy()
    expect(escrituras[0]).toEqual({ metodo: 'POST', entrada: { nombre: 'Poda de formación', clase_id: 4, activo: true } })
    vista.unmount()
    render(<DialogoNuevaActividad onCerrar={() => {}} onGuardado={() => {}} />)
    await usuario.selectOptions(await screen.findByLabelText(/^Clase de actividad/), '4')
    expect(screen.getByRole('option', { name: 'Poda de formación' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'Poda antigua' })).toBeNull()
    await usuario.selectOptions(screen.getByLabelText(/^Tipo de actividad/), '3')
    await usuario.selectOptions(screen.getByLabelText(/^Clase de actividad/), '3')
    expect((screen.getByLabelText(/^Tipo de actividad/) as HTMLSelectElement).value).toBe('')
    expect(screen.queryByRole('option', { name: 'Poda de formación' })).toBeNull()
  })

  it('desactiva mediante PUT sin borrar ni renombrar el tipo y lo excluye de nuevas altas', async () => {
    const usuario = userEvent.setup()
    const vista = render(<CatalogoActividadesPage />)
    await usuario.click(await screen.findByRole('button', { name: 'Editar Canteo' }))
    await usuario.click(screen.getByLabelText('Tipo activo'))
    await usuario.click(screen.getByRole('button', { name: 'Guardar tipo' }))
    expect(await screen.findByText('Tipo de actividad guardado')).toBeTruthy()
    expect(escrituras[0]).toEqual({ metodo: 'PUT', entrada: { nombre: 'Canteo', clase_id: 3, activo: false } })
    expect(screen.getByText('Canteo')).toBeTruthy()
    vista.unmount()
    render(<DialogoNuevaActividad onCerrar={() => {}} onGuardado={() => {}} />)
    await usuario.selectOptions(await screen.findByLabelText(/^Clase de actividad/), '3')
    expect(screen.queryByRole('option', { name: 'Canteo' })).toBeNull()
  })

  it('oculta la edición sin permiso de gestión', async () => {
    sesion.permisos = []
    render(<CatalogoActividadesPage />)
    await screen.findByText('Canteo')
    expect(screen.queryByRole('button', { name: 'Editar Canteo' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Añadir tipo de actividad' })).toBeNull()
  })

  it('muestra sin acceso ante un 403 de lectura', async () => {
    falloLectura = 403
    render(<CatalogoActividadesPage />)
    expect(await screen.findByText('No tienes permiso')).toBeTruthy()
  })

  it('conserva el formulario ante un error y permite reintentar', async () => {
    const usuario = userEvent.setup()
    falloEscritura = 400
    render(<CatalogoActividadesPage />)
    await usuario.click(await screen.findByRole('button', { name: 'Editar Canteo' }))
    await usuario.type(screen.getByLabelText(/^Nombre del tipo/), ' nuevo')
    await usuario.click(screen.getByRole('button', { name: 'Guardar tipo' }))
    expect(await screen.findByText('Operación rechazada')).toBeTruthy()
    falloEscritura = 0
    await usuario.click(screen.getByRole('button', { name: 'Guardar tipo' }))
    expect(await screen.findByText('Tipo de actividad guardado')).toBeTruthy()
  })

  it('muestra sin acceso ante un 403 de escritura', async () => {
    falloEscritura = 403
    const usuario = userEvent.setup()
    render(<CatalogoActividadesPage />)
    await usuario.click(await screen.findByRole('button', { name: 'Editar Canteo' }))
    await usuario.click(screen.getByLabelText('Tipo activo'))
    await usuario.click(screen.getByRole('button', { name: 'Guardar tipo' }))
    expect(await screen.findByText('No tienes permiso')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar tipo' }).getAttribute('aria-disabled')).toBe('true')
    await usuario.click(screen.getByRole('button', { name: 'Guardar tipo' }))
    expect(escrituras).toHaveLength(1)
  })

  it('permite recuperar el catálogo tras un fallo de lectura', async () => {
    falloLectura = 500
    render(<CatalogoActividadesPage />)
    await screen.findByText('No pudimos cargar el catálogo de actividades')
    falloLectura = 0
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Canteo')).toBeTruthy()
  })

  it('conserva el selector plano del parte ante un backend sin clases', async () => {
    falloLectura = 404
    render(<DialogoNuevaActividad onCerrar={() => {}} onGuardado={() => {}} />)
    await waitFor(() => expect(screen.getByRole('option', { name: 'Canteo' })).toBeTruthy())
    expect(screen.queryByLabelText(/^Clase de actividad/)).toBeNull()
  })
})
