// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AccionFila, { AccionFilaEnlace } from './AccionFila'

afterEach(cleanup)

describe('AccionFila (AV-390)', () => {
  it('es un botón de solo icono con el nombre accesible de la fila', async () => {
    const usuario = userEvent.setup()
    const pulsar = vi.fn()
    render(<AccionFila icono="pencil" nombre="Editar" etiqueta="Editar Canteo" onClick={pulsar} />)

    const boton = screen.getByRole('button', { name: 'Editar Canteo' })
    expect(boton.textContent).toBe('')
    await usuario.click(boton)
    expect(pulsar).toHaveBeenCalledTimes(1)
  })

  it('la burbuja aparece al pasar el cursor o con el foco y se cierra con Escape', async () => {
    const usuario = userEvent.setup()
    render(<AccionFila icono="download" nombre="Descargar" descripcion="Baja el archivo original" onClick={() => {}} />)
    const burbuja = screen.getByRole('tooltip', { hidden: true })
    expect(burbuja.hasAttribute('data-visible')).toBe(false)
    expect(burbuja.textContent).toBe('DescargarBaja el archivo original')

    const boton = screen.getByRole('button', { name: 'Descargar' })
    await usuario.hover(boton)
    expect(burbuja.hasAttribute('data-visible')).toBe(true)
    await usuario.unhover(boton)
    expect(burbuja.hasAttribute('data-visible')).toBe(false)

    await usuario.tab()
    expect(burbuja.hasAttribute('data-visible')).toBe(true)
    await usuario.keyboard('{Escape}')
    expect(burbuja.hasAttribute('data-visible')).toBe(false)
    // La descripción se anuncia como descripción del botón.
    expect(boton.getAttribute('aria-describedby')).toBe(burbuja.id)
  })

  it('deshabilitada no ejecuta la acción pero sigue enfocable', async () => {
    const usuario = userEvent.setup()
    const pulsar = vi.fn()
    render(
      <AccionFila
        icono="download"
        nombre="Descargar"
        descripcion="El archivo ya no está disponible"
        deshabilitado
        onClick={pulsar}
      />,
    )

    const boton = screen.getByRole('button', { name: 'Descargar' })
    expect(boton.getAttribute('aria-disabled')).toBe('true')
    await usuario.click(boton)
    expect(pulsar).not.toHaveBeenCalled()
  })

  it('la versión de enlace navega con el mismo aspecto', () => {
    render(
      <MemoryRouter>
        <AccionFilaEnlace
          icono="map"
          nombre="Ver en el mapa"
          etiqueta="Ver en el mapa · Jardín ornamental"
          to="/mapa"
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Ver en el mapa · Jardín ornamental' }).getAttribute('href')).toBe('/mapa')
  })
})
