// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import type { FilaMapa } from '@/utils/mapaAtenciones'
import MapaCampusAtenciones from './MapaCampusAtenciones'

vi.mock('@/services/api/mapaInventario', () => ({
  cargarAreasVerdesGeoJSON: async (): Promise<AreasVerdesGeoJSON> => ({
    type: 'FeatureCollection',
    features: ['p-1', 'p-2'].map((id, i) => ({
      type: 'Feature',
      properties: { mapa_id: id, Nombre: `Jardín ${i + 1}`, Uso: 'Recreación', Área: 100 * (i + 1) },
      geometry: { type: 'MultiPolygon', coordinates: [[[[i, 0], [i + 1, 0], [i + 1, 1], [i, 0]]]] },
    })),
  }),
}))
vi.mock('@/services/api/mapaAsignaciones', () => ({
  listarPoligonosMapa: async () => [
    {
      id_fuente: 'p-1',
      area_verde_id: 42,
      area_verde_nombre: 'Bosque Húmedo',
      superficie_registrada_m2: '120',
      area_verde_tipo_uso_id: 1,
      area_verde_tipo_uso_nombre: 'Recreación',
      area_verde_activa: true,
    },
  ],
}))

afterEach(cleanup)

function fila(cambios: Partial<FilaMapa>): FilaMapa {
  return {
    clave: 'Tercerizado-1-3-sin',
    con_ubicacion: true,
    atencion_id: 1,
    codigo: 'AT-001',
    tipo_atencion: 'Poda',
    tipo_servicio: 'Poda menor',
    fecha: '2026-10-10',
    estado: 'Reporte adjunto',
    modalidad: 'Tercerizado',
    es_riesgo: false,
    proveedor: 'Proveedor',
    area_verde_id: 3,
    espacio: 'Bosque Húmedo',
    ejemplar_id: null,
    ejemplar_codigo: null,
    archivos_asociados: 0,
    tipo_uso_id: 1,
    area_inventario_id: 42,
    ...cambios,
  }
}

it('pinta el mapa del campus, resalta el área con atenciones e informa del área elegida', async () => {
  const elegirArea = vi.fn()
  const { container } = render(
    <MapaCampusAtenciones
      filas={[fila({})]}
      elementos={[]}
      usos={[{ id: 1, nombre: 'Recreación', color: '#2e7d32' }]}
      idFuenteElegido={null}
      ejemplarElegido={null}
      onElegirArea={elegirArea}
      onElegirEjemplar={vi.fn()}
    />,
  )
  await waitFor(() => expect(container.querySelectorAll('svg path[class]')).toHaveLength(2))
  const [conAtenciones, sinAtenciones] = container.querySelectorAll('svg path[class]')
  expect(conAtenciones.getAttribute('fill')).toBe('#2e7d32')
  expect(sinAtenciones.getAttribute('fill')).toBe('var(--color-text-secondary)')

  fireEvent.click(conAtenciones)
  expect(elegirArea).toHaveBeenCalledWith({
    idFuente: 'p-1',
    nombre: 'Bosque Húmedo',
    tipoUso: 'Recreación',
    superficie: 100,
    areaInventarioId: 42,
  })

  fireEvent.click(sinAtenciones)
  expect(elegirArea).toHaveBeenLastCalledWith(expect.objectContaining({ idFuente: 'p-2', areaInventarioId: null }))
})
