// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AreaVerde } from '@/types/areasVerdes'
import AreaVerdeForm from './AreaVerdeForm'

const { modificarAreaVerde } = vi.hoisted(() => ({ modificarAreaVerde: vi.fn() }))

vi.mock('@/services/api/areasVerdes', () => ({
  modificarAreaVerde,
  registrarAreaVerde: vi.fn(),
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
  useConsulta: (clave: string, consultar: (signal: AbortSignal) => Promise<unknown>) => {
    void consultar
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
})
