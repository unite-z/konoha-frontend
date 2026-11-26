import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from './cliente'
import { cargarResumenArea } from './resumenArea'

const mocks = vi.hoisted(() => ({
  solicitarTercerizados: vi.fn(),
  solicitarPlanificacion: vi.fn(),
  obtenerAreaVerde: vi.fn(),
  listarHistorialSectorArea: vi.fn(),
  listarEjemplaresDeArea: vi.fn(),
}))
vi.mock('./clienteTercerizados', () => ({ solicitarTercerizados: mocks.solicitarTercerizados }))
vi.mock('./clientePlanificacion', () => ({ solicitarPlanificacion: mocks.solicitarPlanificacion }))
vi.mock('./areasVerdes', () => ({
  obtenerAreaVerde: mocks.obtenerAreaVerde,
  listarHistorialSectorArea: mocks.listarHistorialSectorArea,
}))
vi.mock('./ejemplares', () => ({ listarEjemplaresDeArea: mocks.listarEjemplaresDeArea }))

beforeEach(() => vi.clearAllMocks())

describe('cargarResumenArea', () => {
  it('usa el resumen agregado cuando existe', async () => {
    mocks.solicitarTercerizados.mockResolvedValue({ area: { id: 3 } })
    await expect(cargarResumenArea(3, true)).resolves.toEqual({ area: { id: 3 } })
    expect(mocks.solicitarTercerizados).toHaveBeenCalledWith(
      'areas-verdes/3/resumen',
      expect.objectContaining({ base: '/api/v1/inventario' }),
    )
    expect(mocks.obtenerAreaVerde).not.toHaveBeenCalled()
  })

  it('sin resumen (404) compone las llamadas actuales y pide las incidencias por area_verde_id', async () => {
    mocks.solicitarTercerizados.mockRejectedValue(new ErrorApi(404, null, 'No hay'))
    mocks.obtenerAreaVerde.mockResolvedValue({ id: 3, nombre: 'Jardín' })
    mocks.listarEjemplaresDeArea.mockResolvedValue([
      { situacion: 'activo' },
      { situacion: 'activo' },
      { situacion: 'muerto' },
    ])
    mocks.listarHistorialSectorArea.mockResolvedValue([
      { id: 1, sector_id: 1, sector_nombre: 'Sector A', fecha_inicio: '2026-01-01', fecha_fin: null },
    ])
    mocks.solicitarPlanificacion.mockResolvedValue([
      { estado: 'Registrada' },
      { estado: 'Cerrada' },
      { estado: 'EnAtencion' },
    ])
    const resumen = await cargarResumenArea(3, true)
    expect(mocks.solicitarPlanificacion).toHaveBeenCalledWith(
      'incidencias/',
      expect.objectContaining({ parametros: { area_verde_id: 3 } }),
    )
    expect(resumen.ejemplares_por_situacion).toEqual({ activo: 2, muerto: 1 })
    expect(resumen.incidencias_abiertas).toBe(2)
    expect(resumen.historial.results[0]).toMatchObject({ tipo: 'cambio_sector', titulo: 'Sector A' })
  })

  it('sin permiso de incidencias o con su llamada caída, no inventa el dato', async () => {
    mocks.solicitarTercerizados.mockRejectedValue(new ErrorApi(404, null, 'No hay'))
    mocks.obtenerAreaVerde.mockResolvedValue({ id: 3 })
    mocks.listarEjemplaresDeArea.mockRejectedValue(new ErrorApi(500, null, 'Falla'))
    mocks.listarHistorialSectorArea.mockResolvedValue([])
    const sinPermiso = await cargarResumenArea(3, false)
    expect(mocks.solicitarPlanificacion).not.toHaveBeenCalled()
    expect(sinPermiso.incidencias_abiertas).toBeNull()
    expect(sinPermiso.ejemplares_por_situacion).toBeNull()

    mocks.solicitarPlanificacion.mockRejectedValue(new ErrorApi(403, null, 'No'))
    expect((await cargarResumenArea(3, true)).incidencias_abiertas).toBeNull()
  })

  it('otros errores del resumen se propagan, y un 404 de la ficha también', async () => {
    mocks.solicitarTercerizados.mockRejectedValueOnce(new ErrorApi(403, null, 'No'))
    await expect(cargarResumenArea(3, true)).rejects.toMatchObject({ estado: 403 })
    mocks.solicitarTercerizados.mockRejectedValueOnce(new ErrorApi(404, null, 'No hay'))
    mocks.obtenerAreaVerde.mockRejectedValue(new ErrorApi(404, null, 'No existe'))
    mocks.listarEjemplaresDeArea.mockResolvedValue([])
    mocks.listarHistorialSectorArea.mockResolvedValue([])
    await expect(cargarResumenArea(3, false)).rejects.toMatchObject({ estado: 404 })
  })
})
