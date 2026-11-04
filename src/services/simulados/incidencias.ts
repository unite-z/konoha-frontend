/**
 * Datos simulados de incidencias de MOD-03 (AV-283), solo con `VITE_DATOS_SIMULADOS=true`: el backend (AV-274 a
 * AV-281) aún no existe. Las fechas se calculan hacia atrás desde ahora para que los plazos se vean siempre igual.
 *
 * Escenarios con `?simular=`: `vacio` (bandeja vacía) y los genéricos de `simulacion.ts`.
 */
import type { IncidenciaResumen } from '@/types/incidencias'
import { escenarioSimulado, responderSimulado } from './simulacion'

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
