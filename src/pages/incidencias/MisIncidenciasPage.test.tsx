// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { incidenciasSimuladas } from '@/services/simulados/incidencias'
import MisIncidenciasPage from './MisIncidenciasPage'
import { vaciar } from '@/sincronizacion/almacenLocal'
import { descartar, reiniciarColaParaPruebas } from '@/sincronizacion/cola'
import type { NuevaIncidencia } from '@/types/incidencias'
import { anadirPendiente } from './reportesPendientes'

const propias = incidenciasSimuladas().filter((i) => [34, 37].includes(i.id))
vi.mock('@/services/api/incidencias', () => ({ listarMisIncidencias: async () => propias }))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))

afterEach(async () => {
  cleanup()
  reiniciarColaParaPruebas()
  await vaciar('pendientes')
})

const reporte: NuevaIncidencia = {
  canal: 'App',
  tipo: 'Rama caída',
  reportado_por: { usuario_id: 4 },
  espacio: 'Estacionamiento 3',
  ejemplar: null,
  descripcion: '',
}

function pintar() {
  render(
    <MemoryRouter>
      <MisIncidenciasPage />
    </MemoryRouter>,
  )
}

describe('MisIncidenciasPage', () => {
  it('lista las incidencias propias con su estado (Figma 391-8522)', async () => {
    pintar()
    expect(await screen.findByText('Árbol inclinado')).toBeTruthy()
    expect(screen.getByText('Derivada · tercerizada')).toBeTruthy()
    expect(screen.getByText('Cerrada')).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /Reportar incidencia/ }).length).toBeGreaterThan(0)
  })

  it('sin conexión avisa y muestra arriba las pendientes de enviar (Figma 394-9964)', async () => {
    const enLinea = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const clave = await anadirPendiente(reporte, null, 4)
    pintar()
    expect(await screen.findByText('Sin conexión · se enviará al reconectar')).toBeTruthy()
    expect(screen.getByText('Pendiente de enviar')).toBeTruthy()
    await act(() => descartar(clave))
    expect(screen.queryByText('Pendiente de enviar')).toBeNull()
    enLinea.mockRestore()
  })
})
