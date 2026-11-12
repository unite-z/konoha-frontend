// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EstadoCarga from './EstadoCarga'
import EstadoError from './EstadoError'
import EstadoSinAcceso from './EstadoSinAcceso'
import EstadoVacio from './EstadoVacio'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Estados de contenido', () => {
  it('Vacío: título como encabezado, descripción y acción; sin icono salvo que se pida', () => {
    const { container, rerender } = render(
      <EstadoVacio titulo="No hay registros" descripcion="Prueba ajustar filtros." accion={<button>Crear registro</button>} />,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'No hay registros' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Crear registro' })).toBeTruthy()
    expect(container.querySelector('svg')).toBeNull()

    rerender(<EstadoVacio titulo="No hay registros" icono="info" nivel={3} />)
    expect(screen.getByRole('heading', { level: 3 })).toBeTruthy()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('Error: se anuncia como alerta y «Reintentar» llama a su función', async () => {
    const usuario = userEvent.setup()
    const reintentar = vi.fn()
    render(<EstadoError titulo="No se pudo cargar" descripcion="Revisa la conexión." onReintentar={reintentar} />)

    expect(screen.getByRole('alert').textContent).toContain('Revisa la conexión.')
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(reintentar).toHaveBeenCalledTimes(1)
  })

  it('Sin acceso: textos de Figma por defecto y personalizables', () => {
    const { rerender } = render(<EstadoSinAcceso />)
    expect(screen.getByRole('heading', { name: 'No tienes permiso' })).toBeTruthy()
    expect(screen.getByText('Solicita acceso a una persona administradora.')).toBeTruthy()

    rerender(<EstadoSinAcceso titulo="Solo el jefe de sección" descripcion="Pide que te asignen el rol." />)
    expect(screen.getByRole('heading', { name: 'Solo el jefe de sección' })).toBeTruthy()
  })

  it('Cargando: estado ocupado con texto accesible y umbral de 300 ms si se pide', () => {
    vi.useFakeTimers()
    const { rerender } = render(<EstadoCarga forma="tabla" />)
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('Cargando…')).toBeTruthy()

    rerender(<EstadoCarga forma="tabla" retrasar key="retrasado" />)
    expect(screen.queryByRole('status')).toBeNull()
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByRole('status')).toBeTruthy()
  })
})
