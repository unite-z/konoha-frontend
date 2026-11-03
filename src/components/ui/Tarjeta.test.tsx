// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import Tarjeta from './Tarjeta'
import TarjetaIndicador from './TarjetaIndicador'

afterEach(cleanup)

describe('Tarjeta', () => {
  it('con título es una región con nombre y encabezado del nivel pedido', () => {
    render(
      <Tarjeta titulo="Avance de la ruta" nivel={3} descripcion="45 jardines" acciones={<button>Ver ruta</button>}>
        <p>Contenido</p>
      </Tarjeta>,
    )

    expect(screen.getByRole('region', { name: 'Avance de la ruta' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'Avance de la ruta' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ver ruta' })).toBeTruthy()
    expect(screen.getByText('Contenido')).toBeTruthy()
  })

  it('sin título es un contenedor sin región', () => {
    render(<Tarjeta>Solo contenido</Tarjeta>)

    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.getByText('Solo contenido')).toBeTruthy()
  })

  it('sin título, con etiqueta o con un encabezado propio, es una región con nombre', () => {
    render(
      <>
        <Tarjeta etiqueta="Evidencias">x</Tarjeta>
        <Tarjeta etiquetadaPor="titulo-propio">
          <h2 id="titulo-propio">Poda del jardín central</h2>
        </Tarjeta>
      </>,
    )

    expect(screen.getByRole('region', { name: 'Evidencias' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Poda del jardín central' })).toBeTruthy()
  })

  it('los dos rellenos tienen aspecto distinto', () => {
    const { container } = render(
      <>
        <Tarjeta>a</Tarjeta>
        <Tarjeta relleno="amplio">b</Tarjeta>
      </>,
    )

    const [normal, amplio] = Array.from(container.children)
    expect(normal.className).not.toBe(amplio.className)
  })
})

describe('TarjetaIndicador', () => {
  it('muestra etiqueta, cifra, unidad y contexto', () => {
    render(<TarjetaIndicador etiqueta="Abiertas" valor="12" unidad="incidencias" contexto="3 nuevas esta semana" />)

    expect(screen.getByText('Abiertas')).toBeTruthy()
    expect(screen.getByText('12').textContent).toContain('incidencias')
    expect(screen.getByText('3 nuevas esta semana')).toBeTruthy()
  })

  it('sin datos nunca muestra un cero y explica el motivo', () => {
    render(<TarjetaIndicador etiqueta="Cumplimiento" valor="0" estado="sinDatos" motivoSinDatos="No hay ciclos en el periodo." />)

    expect(screen.getByText('Sin datos')).toBeTruthy()
    expect(screen.queryByText('0')).toBeNull()
    expect(screen.getByText('No hay ciclos en el periodo.')).toBeTruthy()
  })

  it('en alerta muestra la causa como Estado y el enlace lleva al detalle', () => {
    render(
      <MemoryRouter>
        <TarjetaIndicador
          etiqueta="Pendientes"
          valor="4"
          estado="alerta"
          insignia={{ tono: 'error', texto: 'Fuera de plazo' }}
          enlace={{ texto: 'Ver detalle', a: '/reportes-indicadores/panel/pendientes' }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Fuera de plazo')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver detalle' }).getAttribute('href')).toBe('/reportes-indicadores/panel/pendientes')
  })

  it('cargando se anuncia como ocupado', () => {
    const { container } = render(<TarjetaIndicador etiqueta="Abiertas" estado="cargando" />)

    expect(container.firstElementChild?.getAttribute('aria-busy')).toBe('true')
  })
})
