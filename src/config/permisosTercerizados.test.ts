import { describe, expect, it } from 'vitest'
import type { ClaseAtencion, EstadoAtencion, OrigenAtencion, RolTercerizados } from '../types/tercerizados'
import { ESTADOS_ATENCION } from '../utils/estadosTercerizados'
import { disponibilidad, esRolTercerizados, puedeRegistrarAtencion, type AccionAtencion } from './permisosTercerizados'

// Permisos de MOD-05 que da hoy cada rol (V9 y V76): las reglas deciden por ellos, no por el nombre (AV-382).
const JEFE = ['SER.ATENCION.REGISTRAR', 'SER.ATENCION.GESTIONAR', 'SER.CONFORMIDAD.REGISTRAR', 'SER.SEGURIDAD.VERIFICAR', 'SER.CONTRATO.CONSULTAR', 'SER.CONTRATO.GESTIONAR']
const INGENIERO = ['SER.ATENCION.REGISTRAR', 'SER.SEGURIDAD.VERIFICAR', 'SER.CONTRATO.CONSULTAR']
const PRACTICANTE = ['SER.ATENCION.REGISTRAR', 'SER.CONTRATO.CONSULTAR']

function atencion(
  estado: EstadoAtencion,
  extra: { es_riesgo?: boolean; origen?: OrigenAtencion; clase?: ClaseAtencion; numero_orden_compra?: string } = {},
) {
  return {
    estado,
    es_riesgo: false,
    origen: 'Demanda' as OrigenAtencion,
    clase: 'ProgramadaContrato' as ClaseAtencion,
    numero_orden_compra: '',
    ...extra,
  }
}

/** Estados en los que la acción está visible y habilitada para el rol. */
function habilitadaEn(accion: AccionAtencion, rol: readonly string[], extra = {}) {
  return ESTADOS_ATENCION.filter((estado) => disponibilidad(accion, rol, atencion(estado, extra)).habilitada)
}

describe('roles', () => {
  it('reconoce solo los grupos del módulo', () => {
    expect(esRolTercerizados('Jefe de sección' as RolTercerizados)).toBe(true)
    expect(esRolTercerizados('Practicante')).toBe(false)
    expect(esRolTercerizados(null)).toBe(false)
  })

  it('solo el jefe registra atenciones', () => {
    expect(puedeRegistrarAtencion(JEFE)).toBe(true)
    expect(puedeRegistrarAtencion(INGENIERO)).toBe(false)
    expect(puedeRegistrarAtencion(PRACTICANTE)).toBe(false)
    expect(puedeRegistrarAtencion(null)).toBe(false)
  })

  it('sin rol del módulo no se muestra ninguna acción', () => {
    const accion = disponibilidad('ordenCompra', null, atencion('Requerimiento registrado'))
    expect(accion).toEqual({ visible: false, habilitada: false })
  })
})

describe.each([['jefe', JEFE], ['ingeniero', INGENIERO], ['practicante', PRACTICANTE]] as const)('acciones operativas de %s', (_nombre, rol) => {
  it('OC solo antes del inicio', () => {
    expect(habilitadaEn('ordenCompra', rol)).toEqual(['Requerimiento registrado', 'OC referenciada'])
  })

  it('inicio solo con OC referenciada', () => {
    expect(habilitadaEn('inicio', rol)).toEqual(['OC referenciada'])
  })

  it('inicio sin OC se muestra deshabilitado con motivo', () => {
    const accion = disponibilidad('inicio', rol, atencion('Requerimiento registrado'))
    expect(accion.visible && !accion.habilitada).toBe(true)
    expect(accion.motivo).toMatch(/orden de compra/)
  })

  it('inicio de una extraordinaria sin orden pide la orden de servicio', () => {
    const accion = disponibilidad('inicio', rol, atencion('Requerimiento registrado', { clase: 'Extraordinaria' }))
    expect(accion.visible && !accion.habilitada).toBe(true)
    expect(accion.motivo).toMatch(/orden de servicio/)
  })

  it('inicio de una atención de riesgo queda bloqueado con motivo', () => {
    const accion = disponibilidad('inicio', rol, atencion('OC referenciada', { es_riesgo: true }))
    expect(accion).toMatchObject({ visible: true, habilitada: false })
    expect(accion.motivo).toMatch(/riesgo/)
  })

  it('fin solo en ejecución', () => {
    expect(habilitadaEn('fin', rol)).toEqual(['En ejecución'])
  })

  it('reporte solo tras el fin y hasta la conformidad (nueva revisión también con reporte adjunto u observado)', () => {
    expect(habilitadaEn('adjuntarReporte', rol)).toEqual([
      'Ejecutado pendiente de reporte',
      'Reporte adjunto',
      'Observado',
    ])
  })
})

describe('acciones exclusivas del jefe', () => {
  it.each([['ingeniero', INGENIERO], ['practicante', PRACTICANTE]] as const)('%s no corrige origen ni registra acuerdo', (_nombre, rol) => {
    for (const estado of ESTADOS_ATENCION) {
      expect(disponibilidad('corregirOrigen', rol, atencion(estado)).visible).toBe(false)
      expect(disponibilidad('acuerdoUnidad', rol, atencion(estado, { origen: 'SolicitudUnidad' })).visible).toBe(false)
    }
  })

  it('el jefe corrige el origen solo antes del inicio', () => {
    expect(habilitadaEn('corregirOrigen', JEFE)).toEqual(['Requerimiento registrado', 'OC referenciada'])
  })

  it('el acuerdo solo aplica a solicitudes de unidad y tras el fin', () => {
    expect(habilitadaEn('acuerdoUnidad', JEFE, { origen: 'SolicitudUnidad' })).toEqual([
      'Ejecutado pendiente de reporte',
      'Reporte adjunto',
      'Observado',
      'Conforme / cerrado',
    ])
    expect(habilitadaEn('acuerdoUnidad', JEFE, { origen: 'Demanda' })).toEqual([])
    const antes = disponibilidad('acuerdoUnidad', JEFE, atencion('En ejecución', { origen: 'SolicitudUnidad' }))
    expect(antes).toMatchObject({ visible: true, habilitada: false })
  })
})

describe('conformidad (RF-SER-007)', () => {
  it.each([['ingeniero', INGENIERO], ['practicante', PRACTICANTE]] as const)('%s no la ve en ningún estado', (_nombre, rol) => {
    for (const estado of ESTADOS_ATENCION) {
      expect(disponibilidad('conformidad', rol, atencion(estado)).visible).toBe(false)
    }
  })

  it('el jefe la da u observa solo con el reporte adjunto', () => {
    expect(habilitadaEn('conformidad', JEFE)).toEqual(['Reporte adjunto'])
  })

  it('sin informe se muestra deshabilitada con su motivo (RN-007)', () => {
    const d = disponibilidad('conformidad', JEFE, atencion('Ejecutado pendiente de reporte'))
    expect(d).toMatchObject({ visible: true, habilitada: false })
    expect(d.motivo).toMatch(/informe/i)
  })

  it('observado espera la nueva revisión', () => {
    const d = disponibilidad('conformidad', JEFE, atencion('Observado'))
    expect(d).toMatchObject({ visible: true, habilitada: false })
    expect(d.motivo).toMatch(/revisión/i)
  })

  it('antes del fin y ya cerrada no se ofrece', () => {
    for (const estado of ['Requerimiento registrado', 'OC referenciada', 'En ejecución', 'Conforme / cerrado'] as const) {
      expect(disponibilidad('conformidad', JEFE, atencion(estado)).visible).toBe(false)
    }
  })
})

describe('verificación de seguridad', () => {
  it.each([['jefe', JEFE], ['ingeniero', INGENIERO]] as const)('%s verifica antes de iniciar', (_nombre, rol) => {
    expect(disponibilidad('seguridad', rol, atencion('OC referenciada', { es_riesgo: true })).habilitada).toBe(true)
  })
  it('oculta el registro al practicante y habilita el inicio con constancia', () => {
    expect(disponibilidad('seguridad', PRACTICANTE, atencion('OC referenciada', { es_riesgo: true })).visible).toBe(false)
    const a = { ...atencion('OC referenciada', { es_riesgo: true }), verificaciones_seguridad: [{ id: 1, medidas: 'EPP', usuario_id: 1, usuario_nombre: 'Jefe', fecha_creacion: '2026-11-10' }] }
    expect(disponibilidad('inicio', JEFE, a).habilitada).toBe(true)
    expect(disponibilidad('seguridad', JEFE, { ...a, estado: 'En ejecución' }).visible).toBe(false)
  })
})
