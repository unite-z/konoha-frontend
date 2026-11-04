// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import PanelNuevaRestriccion from './PanelNuevaRestriccion'

const crearRestriccion = vi.fn(async (_cuerpo: unknown) => [])
vi.mock('@/services/api/planificacion', () => ({
  listarTiposRestriccion: async () => [{ id: 3, nombre: 'Actividad extracurricular', efecto: 'Advertencia', aplica_servicios_ruidosos: true }],
  listarProgramaciones: async () => [
    { id: 11, tipo_servicio_id: 1, servicio: 'Corte de césped', proveedor_id: null, proveedor: null, estacion: 'Primavera', fecha_inicio_prevista: '2026-11-16', fecha_fin_prevista: '2026-11-19', estado: 'Programada', fecha_inicio_real: null, fecha_fin_real: null },
  ],
  crearRestriccion: (cuerpo: unknown) => crearRestriccion(cuerpo),
}))
vi.mock('@/services/api/areasVerdes', () => ({ listarAreasVerdes: async () => ({ count: 0, next: null, previous: null, results: [] }) }))
vi.mock('@/utils/instanteLima', () => ({ hoyLima: () => '2026-11-04' }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})
afterEach(cleanup)

describe('PanelNuevaRestriccion', () => {
  it('con repetición semanal muestra las fechas, avisa del ciclo que coincide y envía la recurrencia', async () => {
    const onCreadas = vi.fn()
    render(
      <MemoryRouter>
        <PanelNuevaRestriccion
          fechaInicial="2026-11-05"
          servicios={[{ id: 1, nombre: 'Corte de césped', es_ruidoso: true, frecuencias: [], duracion: null }]}
          onCerrar={vi.fn()}
          onCreadas={onCreadas}
        />
      </MemoryRouter>,
    )
    const usuario = userEvent.setup()
    await screen.findByRole('option', { name: 'Actividad extracurricular' })
    await usuario.selectOptions(screen.getByLabelText(/^Tipo/), '3')
    expect(screen.getByText('Aviso')).toBeTruthy()
    expect(screen.getByText('Este tipo solo afecta a los servicios ruidosos.')).toBeTruthy()

    await usuario.click(screen.getByLabelText('Se repite'))
    await usuario.click(screen.getByLabelText('Jueves'))
    fireEvent.change(screen.getByLabelText(/Se repite hasta/), { target: { value: '2026-12-31' } })
    expect(screen.getByText('Todos los jueves · 9 fechas')).toBeTruthy()
    expect(await screen.findByText('Coincide con 1 ciclo programado')).toBeTruthy()

    await usuario.click(screen.getByRole('button', { name: 'Guardar restricción' }))
    expect(crearRestriccion).toHaveBeenCalledWith({
      tipo_restriccion_id: 3,
      fecha_inicio: '2026-11-05',
      fecha_fin: '2026-11-05',
      recurrencia: { dias_semana: [4], hasta: '2026-12-31' },
    })
    expect(onCreadas).toHaveBeenCalled()
  })
})
