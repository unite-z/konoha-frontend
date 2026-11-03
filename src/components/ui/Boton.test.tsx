// @vitest-environment jsdom
/**
 * Plantilla de prueba de componente (docs/estandares/pruebas.md):
 * - entorno jsdom solo en este fichero (comentario de la primera línea);
 * - consultas por rol y nombre accesible, como las usaría un lector de pantalla;
 * - interacción con user-event, no con eventos sintéticos;
 * - nada de comprobar clases CSS: se prueba el comportamiento y la accesibilidad.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Boton, { BotonEnlace } from './Boton'

afterEach(cleanup)

describe('Boton', () => {
  it('es un botón de tipo button con su etiqueta como nombre accesible', () => {
    render(<Boton>Aplicar filtros</Boton>)

    const boton = screen.getByRole('button', { name: 'Aplicar filtros' })
    expect(boton.getAttribute('type')).toBe('button')
    expect(boton.hasAttribute('aria-disabled')).toBe(false)
  })

  it('respeta el tipo submit', () => {
    render(<Boton type="submit">Guardar servicio</Boton>)

    expect(screen.getByRole('button', { name: 'Guardar servicio' }).getAttribute('type')).toBe('submit')
  })

  it('ejecuta la acción al pulsarlo con el ratón o con el teclado', async () => {
    const usuario = userEvent.setup()
    const alPulsar = vi.fn()
    render(<Boton onClick={alPulsar}>Registrar inicio</Boton>)

    await usuario.click(screen.getByRole('button', { name: 'Registrar inicio' }))
    await usuario.keyboard('{Enter}')

    expect(alPulsar).toHaveBeenCalledTimes(2)
  })

  describe('deshabilitado', () => {
    it('sigue recibiendo el foco, se anuncia como deshabilitado y no ejecuta la acción', async () => {
      const usuario = userEvent.setup()
      const alPulsar = vi.fn()
      const alPulsarDeshabilitado = vi.fn()
      render(
        <Boton deshabilitado onClick={alPulsar} onClickDeshabilitado={alPulsarDeshabilitado}>
          Enviar a revisión
        </Boton>,
      )
      const boton = screen.getByRole('button', { name: 'Enviar a revisión' })

      await usuario.tab()
      expect(document.activeElement).toBe(boton)
      expect(boton.getAttribute('aria-disabled')).toBe('true')

      await usuario.click(boton)
      expect(alPulsar).not.toHaveBeenCalled()
      expect(alPulsarDeshabilitado).toHaveBeenCalledTimes(1)
    })

    it('enlaza el motivo con aria-describedby', () => {
      render(
        <Boton deshabilitado ayudaDeshabilitado="Completa los campos obligatorios">
          Guardar
        </Boton>,
      )
      const boton = screen.getByRole('button', { name: 'Guardar' })
      const ayuda = screen.getByText('Completa los campos obligatorios')

      expect(boton.getAttribute('aria-describedby')).toBe(ayuda.id)
    })
  })

  describe('cargando', () => {
    it('se anuncia como ocupado y bloquea el doble envío', async () => {
      const usuario = userEvent.setup()
      const alPulsar = vi.fn()
      const alPulsarDeshabilitado = vi.fn()
      render(
        <Boton cargando onClick={alPulsar} onClickDeshabilitado={alPulsarDeshabilitado}>
          Guardar
        </Boton>,
      )
      const boton = screen.getByRole('button', { name: 'Guardar' })

      expect(boton.getAttribute('aria-busy')).toBe('true')
      await usuario.click(boton)
      expect(alPulsar).not.toHaveBeenCalled()
      expect(alPulsarDeshabilitado).not.toHaveBeenCalled()
    })
  })
})

describe('BotonEnlace', () => {
  it('navega: es un enlace con su ruta, no un botón', () => {
    render(
      <MemoryRouter>
        <BotonEnlace to="/servicios-tercerizados/atenciones">Volver a la bandeja</BotonEnlace>
      </MemoryRouter>,
    )

    const enlace = screen.getByRole('link', { name: 'Volver a la bandeja' })
    expect(enlace.getAttribute('href')).toBe('/servicios-tercerizados/atenciones')
    expect(screen.queryByRole('button')).toBeNull()
  })
})
