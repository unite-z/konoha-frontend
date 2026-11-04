/**
 * Datos simulados de incidencias de MOD-03 (AV-283), solo con `VITE_DATOS_SIMULADOS=true`: el backend (AV-274 a
 * AV-281) aún no existe. Las fechas se calculan hacia atrás desde ahora para que los plazos se vean siempre igual.
 *
 * Escenarios con `?simular=`: `vacio` (bandeja vacía) y los genéricos de `simulacion.ts`.
 */
import { ErrorApi } from '../api/cliente'
import type { CapatazDisponible, Clasificacion, IncidenciaDetalle, IncidenciaResumen, Inspector, NuevoEncargo, NuevoRequerimiento, ProveedorIncidencia, RequerimientoIncidencia } from '@/types/incidencias'
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
  { id: 32, codigo: 'INC-2026-032', tipo: 'Rama colgante', tipo_sencilla: false, espacio: 'Jardín de la Biblioteca', severidad: 'Media', via: 'PersonalPropio', estado: 'Clasificada', canal: 'Web', responsable: null, horas: 20 },
  { id: 31, codigo: 'INC-2026-031', tipo: 'Hojarasca en exceso', tipo_sencilla: true, espacio: 'Jardín de Sociales', severidad: 'Baja', via: 'PersonalPropio', estado: 'Atendida', canal: 'App', responsable: 'Luis P.', horas: 6 },
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
  { id: 1, nombre: 'Marta R.', cuadrilla: 'Cuadrilla A' },
  { id: 2, nombre: 'Luis P.', cuadrilla: 'Cuadrilla B' },
  { id: 3, nombre: 'Jorge T.', cuadrilla: 'Cuadrilla C' },
]

export function simularRespuestaVacia(): Promise<void> {
  return responderSimulado(() => undefined)
}

/**
 * Carga de cada cuadrilla un día: pasado mañana, todas llenas (para ver «Sin capataz libre», Figma 394-8975); otro
 * día, la B (Luis P.) con hueco.
 */
function cargaDelDia(capataz: CapatazDisponible, fecha: string): { asignados: number; capacidad: number } {
  const pasado = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)
  const capacidad = capataz.id === 1 ? 6 : 5
  if (fecha === pasado || capataz.id !== 2) return { asignados: capacidad, capacidad }
  return { asignados: capacidad - 2, capacidad }
}

export function simularCapataces(signal?: AbortSignal, fecha?: string): Promise<CapatazDisponible[]> {
  return responderSimulado(() => CAPATACES.map((c) => (fecha ? { ...c, carga: cargaDelDia(c, fecha) } : c)), { signal })
}

export function simularActividades(signal?: AbortSignal): Promise<string[]> {
  return responderSimulado(() => ['Retiro de rama caída', 'Poda menor', 'Limpieza de hojarasca', 'Revisión de riego'], { signal })
}

export function simularEncargo(id: number, cuerpo: NuevoEncargo): Promise<IncidenciaDetalle> {
  return responderSimulado(() => {
    const capataz = CAPATACES.find((c) => c.id === cuerpo.capataz_id)
    cambios.set(id, { ...cambios.get(id), estado: 'DerivadaInterna', via: 'PersonalPropio', responsable: capataz?.nombre ?? null, encargo_cancelado: null })
    const incidencia = incidenciaSimulada(id)
    if (!incidencia) throw errorNoEncontrado()
    return incidencia
  })
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
  35: { zona: 'Ciencias', descripcion: 'Rama caída sobre el camino del jardín.', ejemplar: { codigo: 'T-0388', especie: 'Jacarandá', altura_m: 4 }, reportado_por: 'Ana Q.', impacto: 'Medio' },
  34: { zona: 'Central', descripcion: 'Césped levantado junto a la fuente.', ejemplar: null, reportado_por: 'Ana Q.', impacto: 'Bajo' },
  37: { zona: 'Estacionamientos', descripcion: 'Árbol inclinado hacia la vía de salida.', ejemplar: { codigo: 'T-0907', especie: 'Eucalipto', altura_m: 12 }, reportado_por: 'Vigilancia', impacto: 'Alto' },
  32: { zona: 'Ciencias', descripcion: 'Rama colgando a 6 m sobre la banca.', ejemplar: { codigo: 'T-0415', especie: 'Ficus', altura_m: 8 }, reportado_por: 'Ana Q.', impacto: 'Medio' },
  39: { zona: 'Sociales', descripcion: 'Rama colgando sobre la entrada del pabellón.', ejemplar: { codigo: 'T-0218', especie: 'Molle', altura_m: 4 }, reportado_por: 'Luis P.', impacto: 'Medio' },
}

/** Requerimientos de las derivadas a tercerizado (Figma 394-9194). */
const REQUERIMIENTOS: Record<number, RequerimientoIncidencia> = {
  37: {
    codigo: 'REQ-2026-044',
    proveedor: 'Podas Altura Demo E.I.R.L.',
    tipo_atencion: 'Extraordinaria',
    pasos: [
      { nombre: 'Requerimiento', estado: 'Hecho', fecha: '2026-10-31' },
      { nombre: 'Orden de compra', estado: 'Hecho', fecha: '2026-10-31' },
      { nombre: 'Informe del proveedor', estado: 'EnCurso', fecha: null },
      { nombre: 'Conformidad', estado: 'Pendiente', fecha: null },
    ],
  },
}

/** Atención de las atendidas y cerradas (Figma 390-8008): INC-2026-031 sin evidencia, para ver que no se puede cerrar. */
function atencionSimulada(id: number, ahora: number): IncidenciaDetalle['atencion'] {
  const evidencias = [
    { id: 1, url: null },
    { id: 2, url: null },
  ]
  const hace = (horas: number) => new Date(ahora - horas * HORA).toISOString()
  if (id === 35) return { atendida_por: 'Luis P.', atendida_en: hace(1), encargo_codigo: 'ENC-2026-118', evidencias }
  if (id === 31) return { atendida_por: 'Luis P.', atendida_en: hace(1), encargo_codigo: null, evidencias: [] }
  if (id === 34) return { atendida_por: 'Marta R.', atendida_en: hace(100), encargo_codigo: 'ENC-2026-101', evidencias }
  return null
}

/** Historial de la incidencia según su estado, de lo más reciente a lo más antiguo (Figma 390-7811). */
function historialSimulado(incidencia: IncidenciaResumen): IncidenciaDetalle['historial'] {
  const registro = Date.parse(incidencia.fecha_registro)
  const despues = (minutos: number) => new Date(registro + minutos * 60_000).toISOString()
  const eventos = [{ texto: `Registrada · ${incidencia.id === 34 ? 'Ana Q.' : 'Personal de campo'}`, fecha_hora: incidencia.fecha_registro }]
  if (incidencia.estado === 'Registrada') return eventos
  eventos.unshift({ texto: 'Clasificada · Robert G.', fecha_hora: despues(15) })
  if (incidencia.estado === 'Clasificada' || incidencia.estado === 'Descartada') return eventos
  eventos.unshift({ texto: `Derivada · ${incidencia.via === 'Tercerizada' ? 'requerimiento' : 'encargo ENC-2026-101'}`, fecha_hora: despues(16) })
  if (incidencia.estado === 'Atendida' || incidencia.estado === 'Cerrada') eventos.unshift({ texto: 'Atendida · Sistema (encargo terminado)', fecha_hora: despues(140) })
  if (incidencia.estado === 'Cerrada') eventos.unshift({ texto: 'Cerrada · Robert G.', fecha_hora: despues(145) })
  return eventos
}

/** Encargos cancelados que obligan a derivar de nuevo (Figma 390-8582). */
const CANCELADOS: Record<number, { codigo: string; motivo: string }> = {
  32: { codigo: 'ENC-2026-118', motivo: 'la cuadrilla B no tiene escalera.' },
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
  return {
    ...resumen,
    ...detalle,
    foto_url: null,
    requerimiento: REQUERIMIENTOS[id] ?? null,
    encargo_cancelado: CANCELADOS[id] ?? null,
    atencion: atencionSimulada(id, ahora),
    cierre: id === 34 ? { minutos: 145, avisado_a: 'Ana Q.' } : null,
    historial: historialSimulado(resumen),
    ...cambios.get(id),
  }
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

const PROVEEDORES: ProveedorIncidencia[] = [
  { id: 7, razon_social: 'Podas Altura Demo E.I.R.L.', contratos: [{ id: 70, codigo: 'CT-DEMO-007', vigente: true, servicios: ['Poda en altura', 'Tala controlada'] }] },
  { id: 8, razon_social: 'Arbolistas del Perú', contratos: [] },
]

export function simularProveedores(signal?: AbortSignal): Promise<ProveedorIncidencia[]> {
  return responderSimulado(() => PROVEEDORES, { signal })
}

export function simularRequerimiento(id: number, cuerpo: NuevoRequerimiento): Promise<IncidenciaDetalle> {
  return responderSimulado(() => {
    const proveedor = PROVEEDORES.find((p) => p.id === cuerpo.proveedor_id)
    cambios.set(id, {
      ...cambios.get(id),
      estado: 'DerivadaTercerizada',
      via: 'Tercerizada',
      responsable: proveedor?.razon_social ?? null,
      encargo_cancelado: null,
      requerimiento: {
        codigo: 'REQ-2026-045',
        proveedor: proveedor?.razon_social ?? '',
        tipo_atencion: cuerpo.tipo_atencion,
        pasos: [
          { nombre: 'Requerimiento', estado: 'Hecho', fecha: new Date().toISOString().slice(0, 10) },
          { nombre: 'Orden de compra', estado: 'EnCurso', fecha: null },
          { nombre: 'Informe del proveedor', estado: 'Pendiente', fecha: null },
          { nombre: 'Conformidad', estado: 'Pendiente', fecha: null },
        ],
      },
    })
    const incidencia = incidenciaSimulada(id)
    if (!incidencia) throw errorNoEncontrado()
    return incidencia
  })
}

export function simularCerrar(id: number): Promise<IncidenciaDetalle> {
  return responderSimulado(() => {
    const actual = incidenciaSimulada(id)
    if (!actual) throw errorNoEncontrado()
    if (!actual.atencion?.evidencias.length) throw new ErrorApi(409, 'sin-evidencia', 'Para cerrar hace falta la evidencia.')
    const minutos = Math.round((Date.now() - Date.parse(actual.fecha_registro)) / 60_000)
    cambios.set(id, {
      ...cambios.get(id),
      estado: 'Cerrada',
      fecha_cierre: new Date().toISOString(),
      cierre: { minutos, avisado_a: actual.reportado_por },
      historial: [{ texto: 'Cerrada · Robert G.', fecha_hora: new Date().toISOString() }, ...(actual.historial ?? [])],
    })
    return incidenciaSimulada(id) ?? actual
  })
}

export function simularDevolver(id: number): Promise<IncidenciaDetalle> {
  return responderSimulado(() => {
    const actual = incidenciaSimulada(id)
    if (!actual) throw errorNoEncontrado()
    cambios.set(id, {
      ...cambios.get(id),
      estado: 'EnAtencion',
      historial: [{ texto: 'Devuelta a En atención · Robert G.', fecha_hora: new Date().toISOString() }, ...(actual.historial ?? [])],
    })
    return incidenciaSimulada(id) ?? actual
  })
}
