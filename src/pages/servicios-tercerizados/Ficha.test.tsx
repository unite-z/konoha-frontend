// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Atencion } from '@/types/tercerizados'
import Ficha from './Ficha'

vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => null }))
vi.mock('@/components/core/Adjuntos', () => ({ default: () => <div>Adjuntos</div> }))
vi.mock('@/components/core/HistorialCambios', () => ({ default: () => <div>HistorialCambios</div> }))
vi.mock('./DocumentosProveedor', () => ({ default: () => <div>DocumentosProveedor</div> }))

afterEach(cleanup)

const atencion = {
  id: 9,
  codigo: 'ATN-2026-0009',
  descripcion: 'Poda de ficus',
  estado: 'Programada',
  clase: 'Servicio',
  origen: 'Directa',
  es_riesgo: false,
  alcances: [],
  productos: [],
  plagas: [],
  historial: [],
  fecha_hora_inicio: null,
  fecha_hora_fin: null,
  fecha_creacion: '2026-01-05T09:00:00-05:00',
} as unknown as Atencion

describe('Ficha', () => {
  it('pinta el título, las acciones recibidas y los bloques comunes', () => {
    render(
      <Ficha
        atencion={atencion}
        acciones={<button>Registrar inicio</button>}
        versionDocumentos={0}
        enfocarTitulo={false}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Poda de ficus' })).toBeTruthy()
    expect(screen.getByText('Registrar inicio')).toBeTruthy()
    expect(screen.getByText('Historial de estados')).toBeTruthy()
    expect(screen.getByText('DocumentosProveedor')).toBeTruthy()
  })

  it('con el foco pedido, el título lo recibe', () => {
    render(<Ficha atencion={atencion} acciones={null} versionDocumentos={0} enfocarTitulo />)
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Poda de ficus' }))
  })
})
