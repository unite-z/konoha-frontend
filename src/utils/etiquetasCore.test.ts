import { describe, expect, it } from 'vitest'
import { ROLES_ASIGNABLES, resumenCambio, textoAccion } from './etiquetasCore'

describe('resumenCambio', () => {
  it('muestra el antes y el después con el nombre del rol', () => {
    expect(resumenCambio({ rol: 'practicante' }, { rol: 'ingeniero-campo' })).toBe(
      'rol: Practicante → Ingeniero de campo',
    )
  })

  it('las altas solo tienen valores nuevos y los vacíos se ven como «—»', () => {
    expect(resumenCambio({}, { correo: 'ana@pucp.edu.pe', fecha_fin_vigencia: null, activo: false })).toBe(
      'correo: ana@pucp.edu.pe; fecha_fin_vigencia: —; activo: no',
    )
  })
})

describe('etiquetas', () => {
  it('el operario no es asignable en esta fase', () => {
    expect(ROLES_ASIGNABLES).not.toContain('operario')
  })

  it('traduce las acciones conocidas y deja las de otros módulos', () => {
    expect(textoAccion('CambioRol')).toBe('Cambio de rol')
    expect(textoAccion('Finalizacion')).toBe('Finalizacion')
  })
})
