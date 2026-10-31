import { describe, expect, it } from 'vitest'
import { reglasIncumplidas, validarCambioContrasena, validarCuenta, validarMotivo } from './validacionCore'

describe('reglasIncumplidas', () => {
  it('seis caracteres sin números incumplen dos reglas (HU-MOD01-003)', () => {
    expect(reglasIncumplidas('abcdef')).toEqual(['Debe tener al menos 8 caracteres', 'Debe incluir al menos un número'])
  })

  it('acepta letras con tilde y números', () => {
    expect(reglasIncumplidas('árbol2026')).toEqual([])
    expect(reglasIncumplidas('12345678')).toEqual(['Debe incluir al menos una letra'])
  })
})

describe('validarCambioContrasena', () => {
  it('exige la actual, una nueva distinta y la confirmación igual', () => {
    expect(validarCambioContrasena('', '', '')).toEqual({
      actual: 'Escribe tu contraseña actual',
      nueva: 'Escribe la contraseña nueva',
      confirmacion: 'Repite la contraseña nueva',
    })
    expect(validarCambioContrasena('clave-vieja1', 'clave-vieja1', 'clave-vieja1').nueva).toBe(
      'Debe ser distinta de la contraseña actual',
    )
    expect(validarCambioContrasena('a', 'clave-nueva1', 'otra').confirmacion).toBe('No coincide con la contraseña nueva')
    expect(validarCambioContrasena('a', 'clave-nueva1', 'clave-nueva1')).toEqual({})
  })
})

describe('validarCuenta', () => {
  const base = { correo: 'ana@pucp.edu.pe', nombre: 'Ana Pérez', telefono: '', fecha_fin_vigencia: '' as const }

  it('acepta una cuenta completa', () => {
    expect(validarCuenta(base, '2026-10-28')).toEqual({})
  })

  it('rechaza correo inválido, nombre vacío y vigencia pasada', () => {
    expect(validarCuenta({ ...base, correo: 'ana', nombre: ' ', fecha_fin_vigencia: '2026-10-27' }, '2026-10-28')).toEqual({
      correo: 'Escribe un correo válido',
      nombre: 'Escribe los nombres y apellidos',
      fecha_fin_vigencia: 'La fecha de fin de vigencia no puede estar en el pasado',
    })
  })

  it('al editar no valida el correo, que no cambia', () => {
    expect(validarCuenta({ ...base, correo: '' }, '2026-10-28', false)).toEqual({})
  })
})

describe('validarMotivo', () => {
  it('exige un motivo de hasta 500 caracteres', () => {
    expect(validarMotivo('  ')).toBe('Indica el motivo')
    expect(validarMotivo('x'.repeat(501))).toBe('Máximo 500 caracteres')
    expect(validarMotivo('Asume la supervisión')).toBeUndefined()
  })
})
