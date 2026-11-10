// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AreaVerde } from '@/types/areasVerdes'
import AreaVerdeForm from './AreaVerdeForm'

const { modificarAreaVerde, registrarAreaVerde } = vi.hoisted(() => ({ modificarAreaVerde: vi.fn(), registrarAreaVerde: vi.fn() }))

vi.mock('@/services/api/areasVerdes', () => ({
  modificarAreaVerde,
  registrarAreaVerde,
}))
vi.mock('@/services/api/coberturas', () => ({
  listarCoberturas: async () => [{ id: 5, nombre: 'Césped', activo: true }],
}))
vi.mock('@/services/api/catalogosInventario', () => ({
  listarCuarteles: async () => [{ id: 7, numero: 'Q-7', nombre: 'Cuartel norte', estado: 'vigente' }],
  listarSectores: async () => [{ id: 8, nombre: 'Sector norte', activo: true }],
  listarTiposUso: async () => [
    { id: 11, nombre: 'Ornamental', activo: true },
    { id: 22, nombre: 'Deportivo', activo: true },
  ],
}))
vi.mock('@/hooks/useConsulta', () => ({
  useConsulta: (clave: string | null, consultar: (signal: AbortSignal) => Promise<unknown>) => {
    void consultar
    if (!clave) return { estado: 'inactivo', datos: null, error: null, cargaVisible: false, reintentar: vi.fn() }
    if (clave === 'alta-area-geometria') return {
      datos: { type: 'FeatureCollection', features: [
        { type: 'Feature', properties: { mapa_id: 'libre', Nombre: 'Bosque Húmedo', Referenc_1: 'Acceso norte', Área: 123.456, Uso: 'ORNAMENTAL' },
          geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] } },
        { type: 'Feature', properties: { mapa_id: 'ocupado', Nombre: 'Jardín Central' },
          geometry: { type: 'MultiPolygon', coordinates: [[[[2, 0], [3, 0], [3, 1], [2, 0]]]] } },
      ] },
    }
    if (clave === 'alta-area-vinculos') return { datos: [{ id_fuente: 'ocupado', area_verde_id: 15 }] }
    const datos = clave.includes('coberturas')
      ? [{ id: 5, nombre: 'Césped', activo: true }]
      : clave.includes('tipos-uso')
        ? [{ id: 11, nombre: 'Ornamental', activo: true }, { id: 22, nombre: 'Deportivo', activo: true }]
        : clave.includes('sectores')
          ? [{ id: 8, nombre: 'Sector norte', activo: true }]
          : [{ id: 7, numero: 'Q-7', nombre: 'Cuartel norte', estado: 'vigente' }]
    return { estado: 'exito', datos, error: null, cargaVisible: false, reintentar: vi.fn() }
  },
}))

const area: AreaVerde = {
  id: 1,
  nombre: 'Jardín A',
  lugar: 'Campus',
  ubicacion: 'Zona norte',
  superficie_m2: '100.00',
  tipo_cobertura_id: 5,
  tipo_cobertura_nombre: 'Césped',
  tipo_uso_id: 11,
  tipo_uso_nombre: 'Ornamental',
  cuartel_id: 7,
  cuartel_numero: 'Q-7',
  sector_id: 8,
  sector_nombre: 'Sector norte',
  activo: true,
}

afterEach(cleanup)

describe('AreaVerdeForm', () => {
  it('edita el tipo de uso sin incluir el sector en el PATCH', async () => {
    modificarAreaVerde.mockResolvedValue({ ...area, tipo_uso_id: 22, tipo_uso_nombre: 'Deportivo' })
    render(<AreaVerdeForm modo="editar" area={area} alGuardar={vi.fn()} alCancelar={vi.fn()} />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo de uso' }), { target: { value: '22' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(modificarAreaVerde).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ nombre: 'Jardín A', tipo_uso_id: 22, activo: true }),
    ))
    expect(modificarAreaVerde.mock.calls[0][1]).not.toHaveProperty('sector_id')
  })

  it('envía el polígono libre junto con el alta del área', async () => {
    registrarAreaVerde.mockResolvedValue(area)
    render(<AreaVerdeForm modo="crear" puedeVincularMapa alGuardar={vi.fn()} alCancelar={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/^Ubicación/), { target: { value: 'Zona norte' } })
    expect(screen.queryByRole('option', { name: /Jardín Central/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Elegir área en el mapa' }))
    const selector = screen.getByRole('combobox', { name: 'Área del mapa (opcional)' })
    fireEvent.click(screen.getByText('Jardín Central · Ya vinculada'))
    expect(selector).toHaveProperty('value', '')
    fireEvent.click(screen.getByText('Bosque Húmedo · Disponible'))
    expect(selector).toHaveProperty('value', 'libre')
    expect(screen.getByRole('status').textContent).toContain('Área del mapa seleccionada · Bosque Húmedo')
    expect(screen.getByLabelText(/^Nombre/)).toHaveProperty('value', 'Bosque Húmedo')
    expect(screen.getByLabelText(/^Lugar o referente/)).toHaveProperty('value', 'Acceso norte')
    expect(screen.getByLabelText(/^Superficie/)).toHaveProperty('value', '123.46')
    expect(screen.getByRole('combobox', { name: 'Tipo de uso' })).toHaveProperty('value', '11')

    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Bosque Húmedo norte' } })
    fireEvent.click(screen.getByRole('button', { name: 'Quitar selección' }))
    expect(screen.getByLabelText(/^Nombre/)).toHaveProperty('value', 'Bosque Húmedo norte')
    expect(screen.getByLabelText(/^Lugar o referente/)).toHaveProperty('value', '')
    expect(screen.getByLabelText(/^Superficie/)).toHaveProperty('value', '')
    expect(screen.getByRole('combobox', { name: 'Tipo de uso' })).toHaveProperty('value', '')

    fireEvent.change(selector, { target: { value: 'libre' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar área' }))
    await waitFor(() => expect(registrarAreaVerde).toHaveBeenCalledWith(expect.objectContaining({
      poligono_mapa_id: 'libre',
      nombre: 'Bosque Húmedo norte',
      lugar: 'Acceso norte',
      ubicacion: 'Zona norte',
      superficie_m2: '123.46',
      tipo_uso_id: 11,
    })))
  })
})
