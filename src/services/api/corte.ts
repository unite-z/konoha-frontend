/**
 * Servicios del ciclo de corte de MOD-03 (AV-258 a AV-262). Base: `/api/v1/planificacion/ciclos/`.
 * El backend aún no existe: con `VITE_DATOS_SIMULADOS=true` responden los datos simulados (D9).
 */
import { DATOS_SIMULADOS } from '@/config/datosSimulados'
import type { FechaIso } from '@/types/comun'
import type { CicloCorte, InterrupcionCorte, JardinRuta, LimpiezaCorte, NuevaInterrupcion, RespuestaRutaDeHoy, RutaCorte, ZonaAlternativa } from '@/types/corte'
import type { Programacion } from '@/types/planificacion'
import { solicitarPlanificacion } from './clientePlanificacion'

/** `GET ciclos/{programacion}/`: ruta con las marcas, interrupciones y limpiezas del corte. */
export async function obtenerCicloCorte(ciclo: Programacion, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularObtenerCicloCorte } = await import('../simulados/corte')
    return simularObtenerCicloCorte(ciclo, signal)
  }
  return solicitarPlanificacion<CicloCorte>(`ciclos/${ciclo.id}/`, { signal })
}

/** `POST ciclos/{programacion}/limpiezas/` (AV-262): registra una jornada de limpieza; 409 si la ruta no está completa. */
export async function registrarLimpieza(programacionId: number, fecha: FechaIso) {
  if (DATOS_SIMULADOS) {
    const { simularRegistrarLimpieza } = await import('../simulados/corte')
    return simularRegistrarLimpieza(fecha)
  }
  return solicitarPlanificacion<LimpiezaCorte>(`ciclos/${programacionId}/limpiezas/`, { metodo: 'POST', cuerpo: { fecha } })
}

/** `GET programaciones/{id}/zonas-alternativas/` (AV-258): zonas de la ruta con jardines pendientes y su aviso de hoy. */
export async function listarZonasAlternativas(programacionId: number, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularZonasAlternativas } = await import('../simulados/corte')
    return simularZonasAlternativas(signal)
  }
  return solicitarPlanificacion<ZonaAlternativa[]>(`programaciones/${programacionId}/zonas-alternativas/`, { signal })
}

/** `POST programaciones/{id}/interrupciones/` (AV-258, solo jefe): detiene el corte y lo traslada a otra zona. */
export async function registrarInterrupcion(programacionId: number, cuerpo: NuevaInterrupcion) {
  if (DATOS_SIMULADOS) {
    const { simularRegistrarInterrupcion } = await import('../simulados/corte')
    return simularRegistrarInterrupcion(cuerpo)
  }
  return solicitarPlanificacion<InterrupcionCorte>(`programaciones/${programacionId}/interrupciones/`, { metodo: 'POST', cuerpo })
}

/** `GET servicios/{id}/ruta/` (AV-259): zonas de la ruta de MOD-02 para el corte y si va fuera de frecuencia. */
export async function obtenerRutaCorte(servicioId: number, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularRutaCorte } = await import('../simulados/corte')
    return simularRutaCorte(signal)
  }
  return solicitarPlanificacion<RutaCorte>(`servicios/${servicioId}/ruta/`, { signal })
}

/** `GET ruta-de-hoy/` (AV-260, capataz): el corte en curso de su cuadrilla con la ruta, o `ruta: null`. */
export async function obtenerRutaDeHoy(signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularRutaDeHoy } = await import('../simulados/corte')
    return simularRutaDeHoy(signal)
  }
  return solicitarPlanificacion<RespuestaRutaDeHoy>('ruta-de-hoy/', { signal })
}

/**
 * `POST ciclos/{programacion}/jardines/{jardin}/marca/` (AV-260): marca el jardín como cortado con la hora real.
 * `clave` va en `Idempotency-Key` para que un reenvío no duplique la marca; 409 `ya-marcado` si lo marcó otro.
 */
export async function marcarJardin(programacionId: number, jardinId: number, marcadoEn: string, clave: string) {
  if (DATOS_SIMULADOS) {
    const { simularMarcarJardin } = await import('../simulados/corte')
    return simularMarcarJardin(jardinId, marcadoEn)
  }
  return solicitarPlanificacion<JardinRuta>(`ciclos/${programacionId}/jardines/${jardinId}/marca/`, {
    metodo: 'POST',
    cuerpo: { marcado_en: marcadoEn },
    cabeceras: { 'Idempotency-Key': clave },
  })
}

/** `POST ciclos/{programacion}/jardines/{jardin}/observaciones/` (AV-260): observación sobre un jardín ya marcado. */
export async function registrarObservacionJardin(programacionId: number, jardinId: number, texto: string) {
  if (DATOS_SIMULADOS) {
    const { simularObservacionJardin } = await import('../simulados/corte')
    return simularObservacionJardin(texto)
  }
  return solicitarPlanificacion<{ id: number; texto: string }>(`ciclos/${programacionId}/jardines/${jardinId}/observaciones/`, {
    metodo: 'POST',
    cuerpo: { texto },
  })
}
