import { afterEach, describe, expect, it, vi } from 'vitest'
import { coincideConProhibicion } from '@/utils/cronogramaIa'
import { confirmarSimulado, programacionExistenteDe, propuestasDe, rechazarSimulado, solicitarSimulado } from './cronogramaIa'

const NOVIEMBRE = { desde: '2026-11-01', hasta: '2026-11-30' }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('datos simulados de RF-IA-003', () => {
  it('14 propuestas con una advertencia y una prohibición', () => {
    const propuestas = propuestasDe(NOVIEMBRE)
    expect(propuestas).toHaveLength(14)
    expect(propuestas.filter((p) => p.coincidencias.some((c) => c.tipo === 'Advertencia'))).toHaveLength(1)
    expect(propuestas.filter(coincideConProhibicion).length).toBeGreaterThanOrEqual(1)
  })

  it('la modalidad filtra las propuestas', () => {
    expect(propuestasDe({ ...NOVIEMBRE, modalidad: 'PersonalPropio' }).every((p) => p.recursos.modalidad === 'PersonalPropio')).toBe(true)
  })

  it('?simular=datos-insuficientes da 6 propuestas parciales; ?simular=vacio, ninguna', () => {
    vi.stubGlobal('location', { search: '?simular=datos-insuficientes' })
    const parcial = solicitarSimulado(NOVIEMBRE)
    expect(parcial.contenido.propuestas).toHaveLength(6)
    expect(parcial.contenido.suficiencia).toBe('parcial')
    vi.stubGlobal('location', { search: '?simular=vacio' })
    expect(solicitarSimulado(NOVIEMBRE).contenido.propuestas).toEqual([])
  })

  it('confirmar exige la confirmación de RI-25 y solo programa lo aceptado o modificado', () => {
    const s = solicitarSimulado(NOVIEMBRE)
    const decidir = (confirma: boolean) => ({
      por_propuesta: Object.fromEntries(
        s.contenido.propuestas.map((p, i) => [
          p.clave,
          { accion: i === 0 ? ('descartar' as const) : ('aceptar' as const), valores_finales: null, confirma_restriccion: confirma && coincideConProhibicion(p) },
        ]),
      ),
    })
    expect(() => confirmarSimulado(s.id, decidir(false))).toThrow('sin confirmación expresa')
    const confirmada = confirmarSimulado(s.id, decidir(true))
    expect(confirmada.estado).toBe('Validada')
    expect(confirmada.contenido.decision?.programaciones_creadas).toHaveLength(s.contenido.propuestas.length - 1)
    expect(() => rechazarSimulado(s.id, null)).toThrow('ya fue revisada')
  })
})

describe('programación existente simulada', () => {
  it('queda dentro del periodo y una se cruza con la propuesta en el mismo espacio', () => {
    const existentes = programacionExistenteDe(NOVIEMBRE.desde, NOVIEMBRE.hasta)
    expect(existentes.length).toBeGreaterThan(0)
    expect(existentes.every((e) => e.fecha_fin >= NOVIEMBRE.desde && e.fecha_inicio <= NOVIEMBRE.hasta)).toBe(true)
    const propuestas = propuestasDe(NOVIEMBRE)
    const cruce = propuestas.some((p) =>
      existentes.some((e) => e.area_verde_id === p.area_verde_id && e.fecha_inicio <= p.fecha_fin && e.fecha_fin >= p.fecha_inicio),
    )
    expect(cruce).toBe(true)
  })
})
