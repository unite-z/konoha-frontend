import { describe, expect, it } from 'vitest'
import type { EstadoAtencion, OrigenAtencion, RolTercerizados } from '../types/tercerizados'
import { ESTADOS_ATENCION } from '../utils/estadosTercerizados'
import { disponibilidad, esRolTercerizados, puedeRegistrarAtencion, type AccionAtencion } from './permisosTercerizados'

const JEFE: RolTercerizados = 'Jefe de sección'
const INGENIERO: RolTercerizados = 'Ingeniero de campo'
const PRACTICANTE: RolTercerizados = 'Practicante autorizado'

function atencion(estado: EstadoAtencion, extra: { es_riesgo?: boolean; origen?: OrigenAtencion; numero_orden_compra?: string } = {}) {
  return { estado, es_riesgo: false, origen: 'Demanda' as OrigenAtencion, numero_orden_compra: '', ...extra }
}

/** Estados en los que la acción está visible y habilitada para el rol. */
function habilitadaEn(accion: AccionAtencion, rol: RolTercerizados, extra = {}) {
  return ESTADOS_ATENCION.filter((estado) => disponibilidad(accion, rol, atencion(estado, extra)).habilitada)
}

describe('roles', () => {
  it('reconoce solo los grupos del módulo', () => {
    expect(esRolTercerizados(JEFE)).toBe(true)
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

describe.each([JEFE, INGENIERO, PRACTICANTE])('acciones operativas de %s', (rol) => {
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

  it('inicio de una atención de riesgo queda bloqueado con motivo', () => {
    const accion = disponibilidad('inicio', rol, atencion('OC referenciada', { es_riesgo: true }))
    expect(accion).toMatchObject({ visible: true, habilitada: false })
    expect(accion.motivo).toMatch(/riesgo/)
  })

  it('fin solo en ejecución', () => {
    expect(habilitadaEn('fin', rol)).toEqual(['En ejecución'])
  })

  it('reporte solo tras el fin (nueva revisión también con reporte adjunto)', () => {
    expect(habilitadaEn('adjuntarReporte', rol)).toEqual(['Ejecutado pendiente de reporte', 'Reporte adjunto'])
  })
})

describe('acciones exclusivas del jefe', () => {
  it.each([INGENIERO, PRACTICANTE])('%s no corrige origen ni registra acuerdo', (rol) => {
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
    ])
    expect(habilitadaEn('acuerdoUnidad', JEFE, { origen: 'Demanda' })).toEqual([])
    const antes = disponibilidad('acuerdoUnidad', JEFE, atencion('En ejecución', { origen: 'SolicitudUnidad' }))
    expect(antes).toMatchObject({ visible: true, habilitada: false })
  })
})
