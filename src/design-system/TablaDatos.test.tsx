// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SIN_VALOR as V } from '@/utils/formato'
import TablaDatos, { type ColumnaTabla } from './TablaDatos'

afterEach(cleanup)

interface Fila {
  id: number
  nombre: string
  jardines: number | null
}

const COLUMNAS: ColumnaTabla<Fila>[] = [
  { clave: 'nombre', titulo: 'Zona', ordenable: true },
  { clave: 'jardines', titulo: 'Jardines', alineacion: 'derecha', ordenable: true },
]

const filas = (n: number): Fila[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    nombre: `Zona ${String(i + 1).padStart(2, '0')}`,
    jardines: i % 3 === 0 ? null : i,
  }))

function celdasDeColumna(indice: number) {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell')[indice].textContent)
}

describe('TablaDatos', () => {
  it('cabeceras con scope y título accesible de la tabla', () => {
    render(<TablaDatos titulo="Ruta del ciclo" columnas={COLUMNAS} filas={filas(3)} claveFila={(f) => String(f.id)} />)

    expect(screen.getByRole('table', { name: 'Ruta del ciclo' })).toBeTruthy()
    expect(screen.getAllByRole('columnheader')).toHaveLength(2)
  })

  it('ordena al pulsar la cabecera, alterna la dirección y deja los vacíos al final', async () => {
    const usuario = userEvent.setup()
    render(<TablaDatos titulo="Ruta" columnas={COLUMNAS} filas={filas(4)} claveFila={(f) => String(f.id)} />)

    await usuario.click(screen.getByRole('button', { name: 'Jardines' }))
    expect(screen.getByRole('columnheader', { name: 'Jardines' }).getAttribute('aria-sort')).toBe('ascending')
    expect(celdasDeColumna(1)).toEqual(['1', '2', V, V])

    await usuario.click(screen.getByRole('button', { name: 'Jardines' }))
    expect(screen.getByRole('columnheader', { name: 'Jardines' }).getAttribute('aria-sort')).toBe('descending')
    expect(celdasDeColumna(1)).toEqual(['2', '1', V, V])
  })

  it('pagina en el cliente de 25 en 25 y cambia el tamaño de página', async () => {
    const usuario = userEvent.setup()
    render(<TablaDatos titulo="Ruta" columnas={COLUMNAS} filas={filas(60)} claveFila={(f) => String(f.id)} />)

    expect(screen.getByText('Mostrando 1 a 25 de 60')).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Página 3' }))
    expect(screen.getByText('Mostrando 51 a 60 de 60')).toBeTruthy()
    expect(screen.getAllByRole('row')).toHaveLength(11)

    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Filas por página' }), '50')
    expect(screen.getByText('Mostrando 1 a 50 de 60')).toBeTruthy()
  })

  it('con paginación del servidor delega el cambio de página y no ofrece filas por página', async () => {
    const usuario = userEvent.setup()
    const cambiar = vi.fn()
    render(
      <TablaDatos
        titulo="Incidencias"
        columnas={COLUMNAS}
        filas={filas(25)}
        claveFila={(f) => String(f.id)}
        paginacionServidor={{ pagina: 1, total: 80, porPagina: 25, onCambiarPagina: cambiar }}
      />,
    )

    expect(screen.queryByRole('combobox')).toBeNull()
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(cambiar).toHaveBeenCalledWith(2)
  })

  it('fila clicable con ratón y con Enter', async () => {
    const usuario = userEvent.setup()
    const abrir = vi.fn()
    render(
      <TablaDatos
        titulo="Ruta"
        columnas={COLUMNAS}
        filas={filas(2)}
        claveFila={(f) => String(f.id)}
        onFilaClick={abrir}
      />,
    )

    const fila = screen.getAllByRole('row')[1]
    await usuario.click(fila)
    fila.focus()
    await usuario.keyboard('{Enter}')
    expect(abrir).toHaveBeenCalledTimes(2)
  })

  it('un botón de la fila hace lo suyo sin abrir la fila (AV-400)', async () => {
    const usuario = userEvent.setup()
    const abrir = vi.fn()
    const accion = vi.fn()
    const conAccion: ColumnaTabla<Fila>[] = [
      ...COLUMNAS,
      // Excepción al sistema (AV-351): botón crudo solo para la prueba de la tabla.
      {
        clave: 'accion',
        titulo: 'Acciones',
        tituloOculto: true,
        render: (f) => <button type="button" onClick={accion}>{`Editar ${f.nombre}`}</button>,
      },
    ]
    render(
      <TablaDatos
        titulo="Ruta"
        columnas={conAccion}
        filas={filas(1)}
        claveFila={(f) => String(f.id)}
        onFilaClick={abrir}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Editar Zona 01' }))
    screen.getByRole('button', { name: 'Editar Zona 01' }).focus()
    await usuario.keyboard('{Enter}')
    expect(accion).toHaveBeenCalledTimes(2)
    expect(abrir).not.toHaveBeenCalled()
  })

  it('estados vacío y error sustituyen a la tabla', () => {
    const { rerender } = render(
      <TablaDatos
        titulo="Ruta"
        columnas={COLUMNAS}
        filas={[]}
        claveFila={(f) => String(f.id)}
        estado="vacio"
        vacio={{ titulo: 'No hay jardines' }}
      />,
    )
    expect(screen.getByRole('heading', { name: 'No hay jardines' })).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()

    rerender(
      <TablaDatos
        titulo="Ruta"
        columnas={COLUMNAS}
        filas={[]}
        claveFila={(f) => String(f.id)}
        estado="error"
        error={{ titulo: 'No se pudo cargar', descripcion: 'Sin conexión.', onReintentar: () => {} }}
      />,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('sin filas y con vacío definido pinta el vacío aunque no se pase estado', () => {
    render(
      <TablaDatos
        titulo="Ruta"
        columnas={COLUMNAS}
        filas={[]}
        claveFila={(f) => String(f.id)}
        vacio={{ titulo: 'No hay jardines' }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'No hay jardines' })).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
