/**
 * Datos simulados de incidencias de MOD-03 (AV-283), solo con `VITE_DATOS_SIMULADOS=true`: el backend (AV-274 a
 * AV-281) aún no existe. Las fechas se calculan hacia atrás desde ahora para que los plazos se vean siempre igual.
 *
 * Escenarios con `?simular=`: `vacio` (bandeja vacía) y los genéricos de `simulacion.ts`.
 */
import type { CapatazDisponible, Clasificacion, IncidenciaDetalle, IncidenciaResumen, Inspector } from '@/types/incidencias'
import { errorNoEncontrado, escenarioSimulado, responderSimulado } from './simulacion'

const HORA = 3_600_000

/** Media hora de margen: la página mide desde su propio «ahora», unos instantes antes de que lleguen los datos. */
function haceHoras(horas: number, ahora: number): string {
  return new Date(ahora - (horas + 0.5) * HORA).toISOString()
}

type Semilla = Omit<IncidenciaResumen, 'fecha_registro' | 'fecha_cierre'> & { horas: number; cerradaTras?: number }

const SEMILLAS: Semilla[] = [
  { id: 41, codigo: 'INC-2026-041', tipo: 'Rama caída', tipo_sencilla: true, espacio: 'Jardín de la Biblioteca', severidad: null, via: null, estado: 'Registrada', canal: 'App', responsable: null, horas: 2 },
  { id: 40, codigo: 'INC-2026-040', tipo: 'Riego averiado', tipo_sencilla: false, espacio: 'Jardín de Ciencias', severidad: null, via: null, estado: 'Registrada', canal: 'Telefono', responsable: null, horas: 4 },
  { id: 39, codigo: 'INC-2026-039', tipo: 'Rama colgante', tipo_sencilla: true, espacio: 'Pabellón Z', severidad: 'Media', via: 'PersonalPropio', estado: 'Clasificada', canal: 'Web', responsable: null, horas: 5 },
  { id: 38, codigo: 'INC-2026-038', tipo: 'Hojarasca en exceso', tipo_sencilla: true, espacio: 'Patio de Letras', severidad: 'Baja', via: 'PersonalPropio', estado: 'EnAtencion', canal: 'App', responsable: 'Luis P.', horas: 31 },
  { id: 37, codigo: 'INC-2026-037', tipo: 'Árbol inclinado', tipo_sencilla: false, espacio: 'Estacionamiento 3', severidad: 'Alta', via: 'Tercerizada', estado: 'DerivadaTercerizada', canal: 'WhatsApp', responsable: 'Podas Altura Demo', horas: 26 },
  { id: 36, codigo: 'INC-2026-036', tipo: 'Poda de ramas', tipo_sencilla: true, espacio: 'Pabellón Z', severidad: 'Media', via: 'PersonalPropio', estado: 'DerivadaInterna', canal: 'App', responsable: 'Marta R.', horas: 46 },
  { id: 35, codigo: 'INC-2026-035', tipo: 'Rama caída', tipo_sencilla: true, espacio: 'Jardín de Ciencias', severidad: 'Media', via: 'PersonalPropio', estado: 'Atendida', canal: 'App', responsable: 'Luis P.', horas: 50 },
  { id: 34, codigo: 'INC-2026-034', tipo: 'Césped dañado', tipo_sencilla: true, espacio: 'Explanada central', severidad: 'Baja', via: 'PersonalPropio', estado: 'Cerrada', canal: 'Correo', responsable: 'Marta R.', horas: 120, cerradaTras: 20 },
  { id: 33, codigo: 'INC-2026-033', tipo: 'Basura en jardín', tipo_sencilla: true, espacio: 'Jardín de Sociales', severidad: null, via: null, estado: 'Descartada', canal: 'Presencial', responsable: null, horas: 170, cerradaTras: 3 },
]

export function incidenciasSimuladas(ahora: number = Date.now()): IncidenciaResumen[] {
  return SEMILLAS.map(({ horas, cerradaTras, ...resto }) => ({
    ...resto,
    fecha_registro: haceHoras(horas, ahora),
    fecha_cierre: cerradaTras === undefined ? null : new Date(Date.parse(haceHoras(horas, ahora)) + cerradaTras * HORA).toISOString(),
  }))
}

export function simularListarIncidencias(signal?: AbortSignal): Promise<IncidenciaResumen[]> {
  return responderSimulado(() => (escenarioSimulado() === 'vacio' ? [] : incidenciasSimuladas()), { signal })
}

const CAPATACES: CapatazDisponible[] = [
  { id: 1, nombre: 'Luis P.', cuadrilla: 'Cuadrilla A' },
  { id: 2, nombre: 'Marta R.', cuadrilla: 'Cuadrilla B' },
  { id: 3, nombre: 'J. Ramos', cuadrilla: 'Cuadrilla C' },
]

export function simularRespuestaVacia(): Promise<void> {
  return responderSimulado(() => undefined)
}

export function simularCapataces(signal?: AbortSignal): Promise<CapatazDisponible[]> {
  return responderSimulado(() => CAPATACES, { signal })
}

export function simularReasignar(incidenciaId: number, capatazId: number): Promise<IncidenciaResumen> {
  return responderSimulado(() => {
    const incidencia = incidenciasSimuladas().find((i) => i.id === incidenciaId)
    const capataz = CAPATACES.find((c) => c.id === capatazId)
    if (!incidencia || !capataz) throw errorNoEncontrado()
    return { ...incidencia, responsable: capataz.nombre }
  })
}

/** Detalle de cada incidencia simulada: zona, ejemplar, descripción y quién la reportó (INC-2026-041 como en Figma). */
const DETALLES: Record<number, Pick<IncidenciaDetalle, 'zona' | 'descripcion' | 'ejemplar' | 'reportado_por' | 'impacto'>> = {
  41: { zona: 'Ciencias', descripcion: 'Rama grande caída sobre el paso peatonal.', ejemplar: { codigo: 'T-0412', especie: 'Ficus', altura_m: 7 }, reportado_por: 'Ana Q.', impacto: null },
  40: { zona: 'Ciencias', descripcion: 'El aspersor del sector norte no se apaga.', ejemplar: null, reportado_por: 'Mesa de partes', impacto: null },
  39: { zona: 'Sociales', descripcion: 'Rama colgando sobre la entrada del pabellón.', ejemplar: { codigo: 'T-0218', especie: 'Molle', altura_m: 4 }, reportado_por: 'Luis P.', impacto: 'Medio' },
}

const INSPECTORES: Inspector[] = [
  { id: 1, nombre: 'Ing. Carla M.' },
  { id: 2, nombre: 'Ing. Pedro S.' },
  { id: 3, nombre: 'Practicante Rosa T.' },
]

/** Cambios hechos en la sesión del navegador (clasificar, descartar), encima de los datos de siempre. */
const cambios = new Map<number, Partial<IncidenciaDetalle>>()

export function incidenciaSimulada(id: number, ahora: number = Date.now()): IncidenciaDetalle | null {
  const resumen = incidenciasSimuladas(ahora).find((i) => i.id === id)
  if (!resumen) return null
  const detalle = DETALLES[id] ?? { zona: null, descripcion: `${resumen.tipo} en ${resumen.espacio}.`, ejemplar: null, reportado_por: 'Personal de campo', impacto: null }
  return { ...resumen, ...detalle, foto_url: null, ...cambios.get(id) }
}

export function simularObtenerIncidencia(id: number, signal?: AbortSignal): Promise<IncidenciaDetalle> {
  return responderSimulado(() => {
    const incidencia = incidenciaSimulada(id)
    if (!incidencia) throw errorNoEncontrado()
    return incidencia
  }, { signal })
}

export function simularClasificar(id: number, cuerpo: Clasificacion): Promise<IncidenciaDetalle> {
  return responderSimulado(() => {
    cambios.set(id, { ...cambios.get(id), severidad: cuerpo.severidad, impacto: cuerpo.impacto, via: cuerpo.via, estado: 'Clasificada' })
    const incidencia = incidenciaSimulada(id)
    if (!incidencia) throw errorNoEncontrado()
    return incidencia
  })
}

export function simularDescartar(id: number): Promise<IncidenciaDetalle> {
  return responderSimulado(() => {
    cambios.set(id, { ...cambios.get(id), estado: 'Descartada', fecha_cierre: new Date().toISOString() })
    const incidencia = incidenciaSimulada(id)
    if (!incidencia) throw errorNoEncontrado()
    return incidencia
  })
}

export function simularInspectores(signal?: AbortSignal): Promise<Inspector[]> {
  return responderSimulado(() => INSPECTORES, { signal })
}
