/**
 * Servicios del ciclo de corte de MOD-03 (AV-258 a AV-262). Base: `/api/v1/planificacion/ciclos/`.
 */
import type { FechaIso } from '@/types/comun'
import type { CalendarioCuadrilla, CicloCorte, InterrupcionCorte, JardinMaestro, JardinRuta, NuevaMarcaFueraDeRuta, LimpiezaCorte, NuevaInterrupcion, RespuestaRutaDeHoy, RutaCorte, ZonaAlternativa } from '@/types/corte'
import type { Programacion } from '@/types/planificacion'
import { solicitarPlanificacion } from './clientePlanificacion'

/** `GET ciclos/{programacion}/`: ruta con las marcas, interrupciones y limpiezas del corte. */
export function obtenerCicloCorte(ciclo: Programacion, signal?: AbortSignal) {
  return solicitarPlanificacion<CicloCorte>(`ciclos/${ciclo.id}/`, { signal })
}

/** `POST ciclos/{programacion}/limpiezas/` (AV-262): registra una jornada de limpieza; 409 si la ruta no está completa. */
export function registrarLimpieza(programacionId: number, fecha: FechaIso) {
  return solicitarPlanificacion<LimpiezaCorte>(`ciclos/${programacionId}/limpiezas/`, { metodo: 'POST', cuerpo: { fecha } })
}

/** `GET programaciones/{id}/zonas-alternativas/` (AV-258): zonas de la ruta con jardines pendientes y su aviso de hoy. */
export function listarZonasAlternativas(programacionId: number, signal?: AbortSignal) {
  return solicitarPlanificacion<ZonaAlternativa[]>(`programaciones/${programacionId}/zonas-alternativas/`, { signal })
}

/** `POST programaciones/{id}/interrupciones/` (AV-258, solo jefe): detiene el corte y lo traslada a otra zona. */
export function registrarInterrupcion(programacionId: number, cuerpo: NuevaInterrupcion) {
  return solicitarPlanificacion<InterrupcionCorte>(`programaciones/${programacionId}/interrupciones/`, { metodo: 'POST', cuerpo })
}

/** `GET servicios/{id}/ruta/` (AV-259): zonas de la ruta de MOD-02 para el corte y si va fuera de frecuencia. */
export function obtenerRutaCorte(servicioId: number, signal?: AbortSignal) {
  return solicitarPlanificacion<RutaCorte>(`servicios/${servicioId}/ruta/`, { signal })
}

/** `GET ruta-de-hoy/` (AV-260, capataz): el corte en curso de su cuadrilla con la ruta, o `ruta: null`. */
export function obtenerRutaDeHoy(signal?: AbortSignal) {
  return solicitarPlanificacion<RespuestaRutaDeHoy>('ruta-de-hoy/', { signal })
}

/**
 * `POST ciclos/{programacion}/jardines/{jardin}/marca/` (AV-260): marca el jardín como cortado con la hora real.
 * `clave` va en `Idempotency-Key` para que un reenvío no duplique la marca; 409 `ya-marcado` si lo marcó otro.
 */
export function marcarJardin(programacionId: number, jardinId: number, marcadoEn: string, clave: string) {
  return solicitarPlanificacion<JardinRuta>(`ciclos/${programacionId}/jardines/${jardinId}/marca/`, {
    metodo: 'POST',
    cuerpo: { marcado_en: marcadoEn },
    cabeceras: { 'Idempotency-Key': clave },
  })
}

/** `POST ciclos/{programacion}/jardines/{jardin}/observaciones/` (AV-260): observación sobre un jardín ya marcado. */
export function registrarObservacionJardin(programacionId: number, jardinId: number, texto: string) {
  return solicitarPlanificacion<{ id: number; texto: string }>(`ciclos/${programacionId}/jardines/${jardinId}/observaciones/`, {
    metodo: 'POST',
    cuerpo: { texto },
  })
}

/**
 * `GET calendario-cuadrilla/?desde&hasta` (AV-254, capataz): actividades de su cuadrilla y restricciones del periodo.
 */
export function obtenerCalendarioCuadrilla(desde: FechaIso, hasta: FechaIso, signal?: AbortSignal): Promise<CalendarioCuadrilla> {
  return solicitarPlanificacion<CalendarioCuadrilla>('calendario-cuadrilla/', { parametros: { desde, hasta }, signal })
}

/** `GET ruta-de-hoy/fuera-de-ruta/?q=` (AV-260): jardines del maestro que no están en la ruta de hoy, por código o nombre. */
export function buscarJardinesFueraDeRuta(q: string, signal?: AbortSignal) {
  return solicitarPlanificacion<{ count: number; results: JardinMaestro[] }>('ruta-de-hoy/fuera-de-ruta/', { parametros: { q }, signal })
}

/** `POST ciclos/{programacion}/fuera-de-ruta/` (AV-260): marca con nota obligatoria un jardín que no está en la ruta. */
export function marcarFueraDeRuta(programacionId: number, cuerpo: NuevaMarcaFueraDeRuta, clave: string) {
  return solicitarPlanificacion<{ id: number; jardin: JardinMaestro; nota: string; marcado_en: string }>(`ciclos/${programacionId}/fuera-de-ruta/`, {
    metodo: 'POST',
    cuerpo,
    cabeceras: { 'Idempotency-Key': clave },
  })
}
