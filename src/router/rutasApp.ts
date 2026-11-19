/**
 * Rutas y migas de pan del MOD-06 «Reportes e indicadores».
 * Separadas de `rutas.tsx` para que el layout y las páginas las usen sin importaciones circulares.
 */
import type { Miga } from '../layouts/LayoutOficina/ContextoPagina'

const BASE = '/reportes-indicadores'

export const RUTAS = {
  reportes: `${BASE}/reportes`,
  cumplimientoCorte: `${BASE}/reportes/cumplimiento-corte`, // RF-REP-002
  distribucionPersonal: `${BASE}/reportes/distribucion-personal`, // RF-REP-004
  atencionesEspacioSector: `${BASE}/reportes/atenciones-espacio-sector`, // RF-REP-006
  asistenciaIa: `${BASE}/asistencia-ia`,
  extraccionReportes: `${BASE}/asistencia-ia/extraccion-reportes`, // RF-IA-001
  priorizacionIa: `${BASE}/asistencia-ia/priorizacion`, // RN-IA-002
  inconsistenciasIa: `${BASE}/asistencia-ia/inconsistencias`, // RF-IA-002
  cronogramaIa: `${BASE}/asistencia-ia/cronograma`, // RF-IA-003
  estimacionRecursos: `${BASE}/asistencia-ia/estimacion-recursos`, // RF-IA-004
  clasificacionIncidencias: `${BASE}/asistencia-ia/clasificacion-incidencias`, // RF-IA-005
  evidenciaFitosanitaria: `${BASE}/asistencia-ia/evidencia-fitosanitaria`, // RF-IA-006
  panel: `${BASE}/panel`, // RF-REP-001
  mapaAtenciones: `${BASE}/mapa-atenciones`, // RF-REP-007
  materialVegetal: `${BASE}/reportes/material-vegetal`, // RF-REP-005
  reporteServicioTercerizado: `${BASE}/reportes/servicio-tercerizado`, // RF-REP-008
  exportaciones: `${BASE}/exportaciones`, // RF-REP-009
  programadoEjecutado: `${BASE}/reportes/programado-ejecutado`, // RF-REP-010
} as const

/** Detalle de un indicador del panel (RF-REP-001, criterio 3). */
export function rutaDetalleIndicador(clave: string): string {
  return `${RUTAS.panel}/${encodeURIComponent(clave)}`
}

/** Prefijo de todas las rutas del módulo (para marcar el menú de primer nivel). */
export const PREFIJO_MODULO = BASE

/** Ruta de la ficha de revisión de una propuesta de IA (RF-IA-001). */
export function rutaRevisionExtraccion(id: number | string): string {
  return `${RUTAS.extraccionReportes}/${id}`
}

/** Ruta de la revisión de una propuesta de prioridades de IA (RN-IA-002). */
export function rutaRevisionPriorizacion(id: number | string): string {
  return `${RUTAS.priorizacionIa}/${id}`
}

/** Ruta del detalle de un hallazgo de inconsistencia (RF-IA-002). */
export function rutaRevisionInconsistencia(id: number | string): string {
  return `${RUTAS.inconsistenciasIa}/${id}`
}

/** Ruta de la revisión de una propuesta de cronograma (RF-IA-003). */
export function rutaRevisionCronograma(id: number | string): string {
  return `${RUTAS.cronogramaIa}/${id}`
}

/** Ruta de la revisión de una estimación de recursos (RF-IA-004). */
export function rutaRevisionEstimacion(id: number | string): string {
  return `${RUTAS.estimacionRecursos}/${id}`
}

/** Ruta de la revisión de una clasificación de incidencia (RF-IA-005). */
export function rutaRevisionClasificacion(id: number | string): string {
  return `${RUTAS.clasificacionIncidencias}/${id}`
}

/** Ruta de la revisión de un análisis de evidencia fitosanitaria (RF-IA-006). */
export function rutaRevisionEvidencia(id: number | string): string {
  return `${RUTAS.evidenciaFitosanitaria}/${id}`
}

/** Niveles de migas reutilizados por las páginas (Guía Web 4.2). */
export const MIGAS = {
  reportesIndicadores: { texto: 'Reportes e indicadores', ruta: RUTAS.reportes },
  reportes: { texto: 'Reportes', ruta: RUTAS.reportes },
  asistenciaIa: { texto: 'Asistencia IA', ruta: RUTAS.asistenciaIa },
  extraccionReportes: { texto: 'Extracción de informes de proveedores', ruta: RUTAS.extraccionReportes },
  priorizacionIa: { texto: 'Prioridades de atención', ruta: RUTAS.priorizacionIa },
  inconsistenciasIa: { texto: 'Revisión de inconsistencias', ruta: RUTAS.inconsistenciasIa },
  cronogramaIa: { texto: 'Planificación asistida', ruta: RUTAS.cronogramaIa },
  estimacionRecursos: { texto: 'Estimación de recursos', ruta: RUTAS.estimacionRecursos },
  clasificacionIncidencias: { texto: 'Clasificación de incidencias', ruta: RUTAS.clasificacionIncidencias },
  evidenciaFitosanitaria: { texto: 'Evidencia fitosanitaria', ruta: RUTAS.evidenciaFitosanitaria },
  panel: { texto: 'Panel', ruta: RUTAS.panel },
  mapaAtenciones: { texto: 'Mapa de atenciones', ruta: RUTAS.mapaAtenciones },
} satisfies Record<string, Miga>

const BASE_INVENTARIO = '/areas-verdes'

export const RUTAS_INVENTARIO = {
  areasVerdes: BASE_INVENTARIO,
  mapa: `${BASE_INVENTARIO}/mapa`,
  nuevaArea: `${BASE_INVENTARIO}/nueva`,
  coberturas: `${BASE_INVENTARIO}/coberturas`,
  catalogos: `${BASE_INVENTARIO}/catalogos`,
  ejemplares: `${BASE_INVENTARIO}/ejemplares`,
  campanasPoda: `${BASE_INVENTARIO}/campanas-poda`,
  nuevaCampanaPoda: `${BASE_INVENTARIO}/campanas-poda/nueva`,
  podaAltura: `${BASE_INVENTARIO}/poda-altura`,
  fichaTecnica: `${BASE_INVENTARIO}/ejemplares/ficha-tecnica`, // RF-INV-005
  rutaCorte: `${BASE_INVENTARIO}/ruta-corte`, // RF-INV-004
} as const

export function rutaCampanaPoda(id: number): string {
  return `${RUTAS_INVENTARIO.campanasPoda}/${id}`
}

export function rutaEditarAreaVerde(id: number): string {
  return `${BASE_INVENTARIO}/${id}/editar`
}

export function rutaMapaAreaVerde(id: number): string {
  return `${RUTAS_INVENTARIO.mapa}?area=${id}`
}

export function rutaRegistrarPoda(campanaId: number): string {
  return `${rutaCampanaPoda(campanaId)}/registrar`
}

export function rutaEspeciesCampana(campanaId: number): string {
  return `${rutaCampanaPoda(campanaId)}/especies`
}

export function rutaRendimientoCampana(campanaId: number): string {
  return `${rutaCampanaPoda(campanaId)}/rendimiento`
}

export function rutaIntervencionPoda(id: number): string {
  return `${BASE_INVENTARIO}/intervenciones-poda/${id}`
}

/** Ficha técnica y evaluación del ejemplar (AV-133). */
export function rutaFichaTecnicaEjemplar(ejemplarId: number): string {
  return `${RUTAS_INVENTARIO.ejemplares}/${ejemplarId}/ficha-tecnica`
}

export function rutaEditarCampanaPoda(id: number): string {
  return `${rutaCampanaPoda(id)}/editar`
}

export function esRutaInventario(ruta: string): boolean {
  return ruta === BASE_INVENTARIO || ruta.startsWith(`${BASE_INVENTARIO}/`)
}

export const MIGAS_INVENTARIO = {
  areasVerdes: { texto: 'Áreas verdes', ruta: RUTAS_INVENTARIO.areasVerdes },
  mapa: { texto: 'Mapa del campus', ruta: RUTAS_INVENTARIO.mapa },
  nuevaArea: { texto: 'Registrar área', ruta: RUTAS_INVENTARIO.nuevaArea },
  coberturas: { texto: 'Coberturas vegetales', ruta: RUTAS_INVENTARIO.coberturas },
  catalogos: { texto: 'Catálogos y sectores', ruta: RUTAS_INVENTARIO.catalogos },
  campanasPoda: { texto: 'Campañas de poda', ruta: RUTAS_INVENTARIO.campanasPoda },
  podaAltura: { texto: 'Poda a demanda', ruta: RUTAS_INVENTARIO.podaAltura },
  ejemplares: { texto: 'Ejemplares y especies', ruta: RUTAS_INVENTARIO.ejemplares },
} satisfies Record<string, Miga>

// --- MOD-05 «Servicios tercerizados» ---------------------------------------------------------------------

const BASE_TERCERIZADOS = '/servicios-tercerizados'

/** Prefijo de las rutas de MOD-05 (menú, cabecera y sesión). */
export const PREFIJO_TERCERIZADOS = BASE_TERCERIZADOS

export const RUTAS_TERCERIZADOS = {
  atenciones: `${BASE_TERCERIZADOS}/atenciones`,
  nuevaAtencion: `${BASE_TERCERIZADOS}/atenciones/nueva`, // RF-SER-003
  proveedoresContratos: `${BASE_TERCERIZADOS}/proveedores-contratos`, // RF-SER-001 y RF-SER-002
  nuevoProveedor: `${BASE_TERCERIZADOS}/proveedores-contratos/proveedores/nuevo`, // RF-SER-001
  nuevoContrato: `${BASE_TERCERIZADOS}/proveedores-contratos/contratos/nuevo`, // RF-SER-002
  controlFitosanitario: `${BASE_TERCERIZADOS}/control-fitosanitario`, // RF-INV-011
  marcarEjemplar: `${BASE_TERCERIZADOS}/control-fitosanitario/marcar`, // RF-INV-011
  planFitosanitario: `${BASE_TERCERIZADOS}/control-fitosanitario/plan`, // RF-FIT-001
  productosAgronomicos: `${BASE_TERCERIZADOS}/productos-agronomicos`, // RF-FIT-003
  nuevoProductoAgronomico: `${BASE_TERCERIZADOS}/productos-agronomicos/nuevo`, // RF-FIT-003
  observacionesPlagas: `${BASE_TERCERIZADOS}/control-fitosanitario/observaciones`, // RF-FIT-005
  nuevaObservacionPlaga: `${BASE_TERCERIZADOS}/control-fitosanitario/observaciones/nueva`, // RF-FIT-005
} as const

/** Ficha de una atención tercerizada. */
export function rutaDetalleAtencion(id: number | string): string {
  return `${RUTAS_TERCERIZADOS.atenciones}/${id}`
}

/** Ficha de un proveedor. */
export function rutaDetalleProveedor(id: number | string): string {
  return `${RUTAS_TERCERIZADOS.proveedoresContratos}/proveedores/${id}`
}

/** Edición de un proveedor (solo jefe de sección). */
export function rutaEditarProveedor(id: number | string): string {
  return `${rutaDetalleProveedor(id)}/editar`
}

/** Ficha de un contrato. */
export function rutaDetalleContrato(id: number | string): string {
  return `${RUTAS_TERCERIZADOS.proveedoresContratos}/contratos/${id}`
}

/** Edición de un contrato (solo jefe de sección). */
export function rutaEditarContrato(id: number | string): string {
  return `${rutaDetalleContrato(id)}/editar`
}

/** Ficha de un producto agronómico. */
export function rutaDetalleProductoAgronomico(id: number | string): string {
  return `${RUTAS_TERCERIZADOS.productosAgronomicos}/${id}`
}

/** Edición de un producto agronómico (solo jefe de sección). */
export function rutaEditarProductoAgronomico(id: number | string): string {
  return `${rutaDetalleProductoAgronomico(id)}/editar`
}

/** Ficha de un ejemplar marcado con atención especial (RF-INV-011 y RF-FIT-006). */
export function rutaDetalleAtencionEspecial(id: number | string): string {
  return `${RUTAS_TERCERIZADOS.controlFitosanitario}/${id}`
}

/** Programar una aplicación adicional del ejemplar marcado (RF-FIT-006, solo jefe de sección). */
export function rutaProgramarAplicacionAdicional(id: number | string): string {
  return `${rutaDetalleAtencionEspecial(id)}/aplicaciones/nueva`
}

/** Ficha de una observación de plaga (RF-FIT-005, solo lectura). */
export function rutaDetalleObservacionPlaga(id: number | string): string {
  return `${RUTAS_TERCERIZADOS.observacionesPlagas}/${id}`
}

/** `true` si la ruta pertenece a MOD-05. */
export function esRutaTercerizados(ruta: string): boolean {
  return ruta === BASE_TERCERIZADOS || ruta.startsWith(`${BASE_TERCERIZADOS}/`)
}

// --- MOD-03 «Planificación» (comparte la sesión de MOD-05) ------------------------------------------------

const BASE_PLANIFICACION = '/planificacion'

/** Prefijo de las rutas de MOD-03 (menú, cabecera y sesión). */
export const PREFIJO_PLANIFICACION = BASE_PLANIFICACION

/** Secciones del rediseño de MOD-03 (AV-265): Resumen, Calendario, Ciclos (AV-269) y Configuración. */
export const RUTAS_PLANIFICACION = {
  resumen: `${BASE_PLANIFICACION}/resumen`, // RF-PLA-008 y 009
  calendario: `${BASE_PLANIFICACION}/calendario`, // HU-MOD03-003 y 005, RF-PLA-003 y 007
  ciclos: `${BASE_PLANIFICACION}/ciclos`, // RF-PLA-004 y CU-007 (AV-269)
  configuracion: `${BASE_PLANIFICACION}/configuracion`, // HU-MOD03-001 y 002 (AV-268)
} as const

/** Rutas anteriores al rediseño: redirigen a su sección nueva para no romper enlaces guardados. */
export const RUTAS_PLANIFICACION_ANTIGUAS = {
  servicios: `${BASE_PLANIFICACION}/servicios-periodicos`,
  restricciones: `${BASE_PLANIFICACION}/calendario-restricciones`,
} as const

// --- MOD-03 · el capataz en el móvil (AV-271): su ruta del día y el calendario de su cuadrilla ------------

const BASE_CORTE = '/corte'

export const PREFIJO_CORTE = BASE_CORTE

export const RUTAS_CORTE = {
  rutaDeHoy: `${BASE_CORTE}/ruta-de-hoy`, // RF-COR-002, HU-011 y CU-011
  calendario: `${BASE_CORTE}/calendario`, // RF-PLA-007 (solo lectura)
} as const

export const MIGAS_CORTE = {
  corte: { texto: 'Corte de césped', ruta: RUTAS_CORTE.rutaDeHoy },
} satisfies Record<string, Miga>

const BASE_INCIDENCIAS = '/incidencias'

/** MOD-03 · incidencias (AV-283 y siguientes). */
export const PREFIJO_INCIDENCIAS = BASE_INCIDENCIAS

export const RUTAS_INCIDENCIAS = {
  bandeja: BASE_INCIDENCIAS, // HU-024 y HU-027 (AV-283)
}

/** MOD-03 · incidencias de quien las reporta, en el móvil (AV-282): cualquier usuario con sesión. */
export const RUTAS_MIS_INCIDENCIAS = {
  lista: '/mis-incidencias', // HU-024 (seguimiento propio)
  reportar: '/mis-incidencias?reportar=', // HU-020 y CU-020: el formulario se abre sobre la lista
} as const

/** Seguimiento de una incidencia propia (AV-282). */
export function rutaMiIncidencia(id: number | string): string {
  return `${RUTAS_MIS_INCIDENCIAS.lista}/${id}`
}

/** Detalle de una incidencia (AV-284). */
export function rutaIncidencia(id: number): string {
  return `${RUTAS_INCIDENCIAS.bandeja}/${id}`
}

export const MIGAS_INCIDENCIAS = {
  incidencias: { texto: 'Incidencias', ruta: RUTAS_INCIDENCIAS.bandeja },
} satisfies Record<string, Miga>

/** Detalle de un ciclo (AV-269). */
export function rutaCiclo(id: number): string {
  return `${RUTAS_PLANIFICACION.ciclos}/${id}`
}

/** `true` si la ruta pertenece a MOD-03. */
export function esRutaPlanificacion(ruta: string): boolean {
  return ruta === BASE_PLANIFICACION || ruta.startsWith(`${BASE_PLANIFICACION}/`)
}

export const MIGAS_PLANIFICACION = {
  planificacion: { texto: 'Planificación', ruta: RUTAS_PLANIFICACION.resumen },
  ciclos: { texto: 'Ciclos', ruta: RUTAS_PLANIFICACION.ciclos },
} satisfies Record<string, Miga>

export const MIGAS_TERCERIZADOS = {
  serviciosTercerizados: { texto: 'Servicios tercerizados', ruta: RUTAS_TERCERIZADOS.atenciones },
  atenciones: { texto: 'Atenciones', ruta: RUTAS_TERCERIZADOS.atenciones },
  proveedoresContratos: { texto: 'Proveedores y contratos', ruta: RUTAS_TERCERIZADOS.proveedoresContratos },
  controlFitosanitario: { texto: 'Control fitosanitario', ruta: RUTAS_TERCERIZADOS.controlFitosanitario },
  productosAgronomicos: { texto: 'Productos agronómicos', ruta: RUTAS_TERCERIZADOS.productosAgronomicos },
  observacionesPlagas: { texto: 'Observaciones de plagas', ruta: RUTAS_TERCERIZADOS.observacionesPlagas },
} satisfies Record<string, Miga>

// --- MOD-01 «Core y seguridad» -------------------------------------------------------------------------

const BASE_USUARIOS = '/usuarios-roles'

export const RUTAS_CORE = {
  ingreso: '/ingreso', // RF-T-001
  cambiarContrasena: '/cambiar-contrasena', // HU-MOD01-003
  usuarios: `${BASE_USUARIOS}/usuarios`, // RF-T-002 y RF-T-003
  accesos: `${BASE_USUARIOS}/accesos`, // CU-MOD01-007
  importacion: `${BASE_USUARIOS}/importacion`, // RF-T-009
  rolesPermisos: `${BASE_USUARIOS}/roles`, // AV-381: solo el superadministrador
  repositorio: '/repositorio', // RF-T-010
  pendientes: '/pendientes', // RF-T-012: lo que falta por sincronizar desde este dispositivo
  configuracion: '/configuracion', // AV-397: panel de módulos de configuración
  configuracionApariencia: '/configuracion/apariencia', // AV-389: cualquier sesión
  configuracionIa: '/configuracion/inteligencia-artificial', // AV-395: IA.PROPUESTA.VALIDAR
  configuracionUsoIa: '/configuracion/uso-ia', // AV-396: IA.PROPUESTA.VALIDAR
} as const

/** Prefijo de «Usuarios y roles» (menú). */
export const PREFIJO_USUARIOS = BASE_USUARIOS

export function rutaDetalleUsuario(id: number | string): string {
  return `${RUTAS_CORE.usuarios}/${id}`
}

export const MIGAS_CORE = {
  usuariosRoles: { texto: 'Usuarios y roles', ruta: RUTAS_CORE.usuarios },
  usuarios: { texto: 'Usuarios', ruta: RUTAS_CORE.usuarios },
  repositorio: { texto: 'Repositorio', ruta: RUTAS_CORE.repositorio },
} satisfies Record<string, Miga>

/**
 * Destino seguro tras iniciar sesión: cualquier ruta interna salvo el ingreso y el cambio de contraseña
 * (evita redirecciones abiertas con `?volver=`). Si no es válido, `null`: se va al inicio del rol.
 */
export function destinoTrasIngresoCore(volver: string | null | undefined): string | null {
  if (!volver || !volver.startsWith('/') || volver.startsWith('//') || volver.includes('\\')) return null
  if ([...volver].some((caracter) => caracter.charCodeAt(0) < 0x20)) return null
  const ruta = volver.split(/[?#]/)[0]
  if (ruta === RUTAS_CORE.ingreso || ruta === RUTAS_CORE.cambiarContrasena) return null
  return volver
}

/** Ruta de ingreso de MOD-01 que vuelve a `destino`. */
export function rutaIngresoCore(destino?: string): string {
  const seguro = destinoTrasIngresoCore(destino)
  return seguro && seguro !== '/' ? `${RUTAS_CORE.ingreso}?volver=${encodeURIComponent(seguro)}` : RUTAS_CORE.ingreso
}
