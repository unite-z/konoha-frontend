import { describe, expect, it } from 'vitest'
import {
  esJefeCampo,
  hoyLima,
  puedeAnularActividad,
  puedeReprogramarEncargo,
  puedeRegistrarCampo,
  validarReprogramacion,
  sumarDiasCampo,
  validarEncargoCampo,
} from './operacionCampo'
import { destinoCampo, RUTAS_CAMPO } from '../router/rutasCampo'
import type { EntradaEncargo } from '../types/operacionCampo'

const encargo: EntradaEncargo = {
  cuadrilla_id: 1,
  tipo_actividad_id: 14,
  area_verde_id: 1,
  descripcion: 'Mantener jardín',
  periodicidad: 'Semanal',
  fecha_reunion: '2026-10-22',
  fecha_inicio: '2026-10-22',
  fecha_fin: '2026-10-28',
  plazo_previsto: '2026-10-28',
}
describe('Operación de campo', () => {
  it('respeta la fecha de Lima al cruzar medianoche UTC', () => {
    expect(hoyLima(new Date('2026-10-23T02:00:00Z'))).toBe('2026-10-22')
    expect(sumarDiasCampo('2026-12-28', 6)).toBe('2027-01-03')
  })
  it('valida periodos inclusivos y el plazo, igual que el backend', () => {
    expect(validarEncargoCampo(encargo)).toEqual({})
    expect(validarEncargoCampo({ ...encargo, fecha_fin: '2026-10-29' })).toHaveProperty('fecha_fin')
    expect(validarEncargoCampo({ ...encargo, periodicidad: 'Quincenal', fecha_fin: '2026-11-04' })).toEqual({})
    expect(validarEncargoCampo({ ...encargo, periodicidad: 'Quincenal', fecha_fin: '2026-11-05' })).toHaveProperty(
      'fecha_fin',
    )
    expect(validarEncargoCampo({ ...encargo, plazo_previsto: '2026-10-29' })).toHaveProperty('plazo_previsto')
    expect(validarEncargoCampo({ ...encargo, fecha_fin: '2026-10-20' })).toHaveProperty('fecha_fin')
  })
  it('no permite destinos de ingreso externos o de otros módulos', () => {
    for (const path of [
      'https://example.com',
      '//example.com',
      '/servicios-tercerizados',
      '/operacion-campo/ingreso',
      '/operacion-campo/cuadrillas\\x',
    ])
      expect(destinoCampo(path)).toBe(RUTAS_CAMPO.cuadrillas)
    expect(destinoCampo('/operacion-campo/encargos?page=2')).toBe('/operacion-campo/encargos?page=2')
  })
  it('separa la gestión de cuadrillas del registro de actividades', () => {
    // Permisos de MOD-04 de cada rol (V9): las reglas deciden por ellos (AV-382).
    const capataz = ['CAM.CUADRILLA.CONSULTAR', 'CAM.PARTE.REGISTRAR']
    const jefe = [
      'CAM.CUADRILLA.GESTIONAR',
      'CAM.CUADRILLA.CONSULTAR',
      'CAM.PARTE.CONSULTAR',
      'CAM.PARTE.VERIFICAR',
      'CAM.PARTE.ANULAR',
    ]
    const ingeniero = ['CAM.CUADRILLA.CONSULTAR', 'CAM.PARTE.CONSULTAR']
    expect(esJefeCampo(capataz)).toBe(false)
    expect(esJefeCampo(jefe)).toBe(true)
    expect(puedeRegistrarCampo(capataz)).toBe(true)
    expect(puedeRegistrarCampo(ingeniero)).toBe(false)
    expect(puedeRegistrarCampo(null)).toBe(false)
    expect(puedeAnularActividad(jefe)).toBe(true)
    expect(puedeAnularActividad(capataz)).toBe(false)
  })
})

describe('reprogramar encargos (AV-405)', () => {
  const periodico: EntradaEncargo = {
    cuadrilla_id: 1,
    tipo_actividad_id: 1,
    area_verde_id: 1,
    descripcion: 'Poda',
    periodicidad: 'Semanal',
    fecha_reunion: '2099-06-01',
    fecha_inicio: '2099-06-01',
    fecha_fin: '2099-06-07',
    plazo_previsto: '2099-06-07',
  }

  it('solo se reprograma un encargo vivo', () => {
    expect(puedeReprogramarEncargo('Por completar')).toBe(true)
    expect(puedeReprogramarEncargo('En curso')).toBe(true)
    expect(puedeReprogramarEncargo('Observado')).toBe(true)
    expect(puedeReprogramarEncargo('Completado')).toBe(false)
    expect(puedeReprogramarEncargo('Cancelado')).toBe(false)
  })

  it('exige la justificación y que cambie alguna fecha', () => {
    const igual = {
      fecha_inicio: '2099-06-01',
      fecha_fin: '2099-06-07',
      plazo_previsto: '2099-06-07',
      justificacion: '',
    }
    expect(validarReprogramacion(periodico, igual)).toEqual({
      plazo_previsto: 'Cambia alguna fecha para reprogramar',
      justificacion: 'Explica por qué se reprograma',
    })
    expect(
      validarReprogramacion(periodico, {
        ...igual,
        fecha_inicio: '2099-06-03',
        fecha_fin: '2099-06-09',
        plazo_previsto: '2099-06-09',
        justificacion: 'Lluvia',
      }),
    ).toEqual({})
  })

  it('aplica las reglas del periodo: duración máxima y plazo dentro del periodo', () => {
    const nueva = {
      fecha_inicio: '2099-06-01',
      fecha_fin: '2099-06-20',
      plazo_previsto: '2099-06-25',
      justificacion: 'Lluvia',
    }
    expect(validarReprogramacion(periodico, nueva)).toEqual({
      fecha_fin: 'El periodo debe tener entre 1 y 7 días',
      plazo_previsto: 'El plazo debe estar dentro del periodo',
    })
  })

  it('en un encargo directo basta con un plazo no anterior al inicio', () => {
    const directo: EntradaEncargo = { ...periodico, periodicidad: 'Directo', fecha_reunion: null }
    expect(
      validarReprogramacion(directo, {
        fecha_inicio: '2099-06-01',
        fecha_fin: '2099-05-30',
        plazo_previsto: '2099-05-30',
        justificacion: 'x',
      }),
    ).toEqual({ plazo_previsto: 'El plazo no puede ser anterior al inicio del encargo' })
    expect(
      validarReprogramacion(directo, {
        fecha_inicio: '2099-06-01',
        fecha_fin: '2099-06-15',
        plazo_previsto: '2099-06-15',
        justificacion: 'x',
      }),
    ).toEqual({})
  })
})
