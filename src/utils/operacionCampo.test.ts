import { describe, expect, it } from 'vitest'
import { esJefeCampo, hoyLima, puedeRegistrarCampo, sumarDiasCampo, validarEncargoCampo } from './operacionCampo'
import { destinoCampo, RUTAS_CAMPO } from '../router/rutasCampo'
import type { EntradaEncargo, UsuarioCampo } from '../types/operacionCampo'

const encargo:EntradaEncargo={cuadrilla_id:1,tipo_actividad_id:14,area_verde_id:1,descripcion:'Mantener jardín',periodicidad:'Semanal',fecha_reunion:'2026-10-22',fecha_inicio:'2026-10-22',fecha_fin:'2026-10-28',plazo_previsto:'2026-10-28'}
const user=(rol:string):UsuarioCampo=>({id:1,usuario:'prueba',nombre:'Prueba',rol,personal_id:2})
describe('Operación de campo',()=>{
  it('respeta la fecha de Lima al cruzar medianoche UTC',()=>{
    expect(hoyLima(new Date('2026-10-23T02:00:00Z'))).toBe('2026-10-22')
    expect(sumarDiasCampo('2026-12-28',6)).toBe('2027-01-03')
  })
  it('valida periodos inclusivos y el plazo, igual que el backend',()=>{
    expect(validarEncargoCampo(encargo)).toEqual({})
    expect(validarEncargoCampo({...encargo,fecha_fin:'2026-10-29'})).toHaveProperty('fecha_fin')
    expect(validarEncargoCampo({...encargo,periodicidad:'Quincenal',fecha_fin:'2026-11-04'})).toEqual({})
    expect(validarEncargoCampo({...encargo,periodicidad:'Quincenal',fecha_fin:'2026-11-05'})).toHaveProperty('fecha_fin')
    expect(validarEncargoCampo({...encargo,plazo_previsto:'2026-10-29'})).toHaveProperty('plazo_previsto')
    expect(validarEncargoCampo({...encargo,fecha_fin:'2026-10-20'})).toHaveProperty('fecha_fin')
  })
  it('no permite destinos de ingreso externos o de otros módulos',()=>{
    for(const path of ['https://example.com','//example.com','/servicios-tercerizados','/operacion-campo/ingreso','/operacion-campo/cuadrillas\\x']) expect(destinoCampo(path)).toBe(RUTAS_CAMPO.cuadrillas)
    expect(destinoCampo('/operacion-campo/encargos?page=2')).toBe('/operacion-campo/encargos?page=2')
  })
  it('separa la gestión de cuadrillas del registro de actividades',()=>{
    expect(esJefeCampo(user('Capataz'))).toBe(false)
    expect(esJefeCampo(user('Jefe de sección'))).toBe(true)
    expect(puedeRegistrarCampo(user('Capataz'))).toBe(true)
    expect(puedeRegistrarCampo(user('Ingeniero de campo'))).toBe(false)
    expect(puedeRegistrarCampo(null)).toBe(false)
  })
})
