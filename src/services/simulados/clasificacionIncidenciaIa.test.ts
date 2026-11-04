import { afterEach, describe, expect, it, vi } from 'vitest'
import { descartarSimulado, manualSimulado, pendientesSimulado, solicitarSimulado, validarSimulado } from './clasificacionIncidenciaIa'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('datos simulados de RF-IA-005', () => {
  it('sugiere categoría, prioridad y atención con su motivo', () => {
    const s = solicitarSimulado(231)
    expect(s.contenido.sugerencia).toMatchObject({ tipo_evento: 'Incidencia', categoria: 'Arbolado', severidad: 'Alta', via_atencion: 'Tercerizado' })
    expect(s.contenido.motivos.severidad).toContain('riesgo')
    expect(s.contenido.suficiencia).toBe('suficiente')
  })

  it('poca evidencia o ?simular=datos-insuficientes: insuficiente y sin severidad', () => {
    expect(solicitarSimulado(236).contenido).toMatchObject({ suficiencia: 'insuficiente', sugerencia: { severidad: null } })
    vi.stubGlobal('location', { search: '?simular=datos-insuficientes' })
    const forzada = solicitarSimulado(232)
    expect(forzada.contenido.suficiencia).toBe('insuficiente')
    expect(forzada.contenido.faltantes.length).toBeGreaterThan(0)
  })

  it('validar exige los obligatorios, clasifica sin derivar y saca la incidencia de pendientes', () => {
    const s = solicitarSimulado(233)
    expect(() => validarSimulado(s.id, { por_campo: { tipo_evento: { accion: 'descartar', valor_final: null } } })).toThrow('obligatorios')
    const validada = validarSimulado(s.id, {
      por_campo: {
        tipo_evento: { accion: 'aceptar', valor_final: null },
        categoria: { accion: 'aceptar', valor_final: null },
        severidad: { accion: 'corregir', valor_final: 'Media' },
        via_atencion: { accion: 'aceptar', valor_final: null },
        es_sencilla: { accion: 'descartar', valor_final: null },
      },
    })
    expect(validada.contenido.decision?.valores_registrados).toMatchObject({ tipo_evento: 'Reclamo', severidad: 'Media', es_sencilla: null })
    expect(validada.contenido.incidencia.estado).toBe('Clasificada')
    expect(pendientesSimulado().results.some((i) => i.id === 233)).toBe(false)
  })

  it('descartar deja la incidencia pendiente y la clasificación manual la clasifica sin sugerencia', () => {
    const s = solicitarSimulado(234)
    descartarSimulado(s.id)
    expect(pendientesSimulado().results.some((i) => i.id === 234)).toBe(true)
    const manual = manualSimulado({
      incidencia_id: 234,
      valores: { tipo_evento: 'Hallazgo de supervisión', categoria: 'Plagas', severidad: 'Media', via_atencion: 'Tercerizado', es_sencilla: false },
    })
    expect(manual).toMatchObject({ estado: 'Validada', contenido: { sugerencia: null } })
    expect(pendientesSimulado().results.some((i) => i.id === 234)).toBe(false)
  })
})
