/**
 * Lógica pura de la bandeja de incidencias (AV-283): pestañas por grupo de estado, presentación de estado,
 * severidad y vía, y tiempo abierta. Se prueba en `bandeja.test.ts`.
 */
import type { TonoEstado } from '@/components/ui/Estado'
import type { EstadoIncidencia, IncidenciaResumen, SeveridadIncidencia, ViaIncidencia } from '@/types/incidencias'

export type PestanaBandeja = 'todas' | 'abiertas' | 'enProceso' | 'cerradas'

const GRUPO: Record<EstadoIncidencia, Exclude<PestanaBandeja, 'todas'>> = {
  Registrada: 'abiertas',
  Clasificada: 'abiertas',
  DerivadaInterna: 'enProceso',
  DerivadaTercerizada: 'enProceso',
  EnAtencion: 'enProceso',
  Atendida: 'enProceso',
  Cerrada: 'cerradas',
  Descartada: 'cerradas',
}

export const PESTANAS_BANDEJA: { valor: PestanaBandeja; texto: string }[] = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'abiertas', texto: 'Abiertas' },
  { valor: 'enProceso', texto: 'En proceso' },
  { valor: 'cerradas', texto: 'Cerradas' },
]

export function incidenciasDePestana(incidencias: IncidenciaResumen[], pestana: PestanaBandeja): IncidenciaResumen[] {
  return pestana === 'todas' ? incidencias : incidencias.filter((i) => GRUPO[i.estado] === pestana)
}

export function contadoresBandeja(incidencias: IncidenciaResumen[]): Record<PestanaBandeja, number> {
  return {
    todas: incidencias.length,
    abiertas: incidenciasDePestana(incidencias, 'abiertas').length,
    enProceso: incidenciasDePestana(incidencias, 'enProceso').length,
    cerradas: incidenciasDePestana(incidencias, 'cerradas').length,
  }
}

export const ESTADO_INCIDENCIA: Record<EstadoIncidencia, { texto: string; tono: TonoEstado }> = {
  Registrada: { texto: 'Registrada', tono: 'neutro' },
  Clasificada: { texto: 'Clasificada', tono: 'info' },
  DerivadaInterna: { texto: 'Derivada · interna', tono: 'info' },
  DerivadaTercerizada: { texto: 'Derivada · tercerizada', tono: 'info' },
  EnAtencion: { texto: 'En atención', tono: 'acento' },
  Atendida: { texto: 'Atendida', tono: 'aviso' },
  Cerrada: { texto: 'Cerrada', tono: 'exito' },
  Descartada: { texto: 'Descartada', tono: 'neutro' },
}

export const SEVERIDAD_INCIDENCIA: Record<SeveridadIncidencia, { texto: string; tono: TonoEstado }> = {
  Baja: { texto: 'Baja', tono: 'neutro' },
  Media: { texto: 'Media', tono: 'aviso' },
  Alta: { texto: 'Alta', tono: 'error' },
}

export const VIA_INCIDENCIA: Record<ViaIncidencia, string> = { PersonalPropio: 'Personal propio', Tercerizada: 'Proveedor' }

/** Horas enteras abierta: hasta el cierre o, si sigue abierta, hasta ahora. */
export function horasAbierta(incidencia: IncidenciaResumen, ahora: number): number {
  const fin = incidencia.fecha_cierre ? Date.parse(incidencia.fecha_cierre) : ahora
  return Math.max(0, Math.floor((fin - Date.parse(incidencia.fecha_registro)) / 3_600_000))
}

/** «2 h» hasta dos días; después, «3 días». */
export function textoTiempoAbierta(horas: number): string {
  if (horas < 48) return `${horas} h`
  const dias = Math.floor(horas / 24)
  return `${dias} días`
}

/** RN-019: una sencilla del personal propio sin atender pasa el plazo objetivo a las 24 h. */
export function superaObjetivo(incidencia: IncidenciaResumen, horas: number): boolean {
  const pendiente = !['Atendida', 'Cerrada', 'Descartada'].includes(incidencia.estado)
  return incidencia.tipo_sencilla && incidencia.via !== 'Tercerizada' && pendiente && horas > 24
}

/**
 * Nivel de la alerta de plazo de una sencilla del personal propio (RN-019, AV-280): pasa el objetivo a las 24 h,
 * está cerca del máximo desde las 40 h (faltan 8 o menos para las 48) y vence a las 48 h.
 */
export type NivelPlazo = 'SuperaObjetivo' | 'CercaMaximo' | 'Vencida'

export const NIVEL_PLAZO: Record<NivelPlazo, { texto: string; tono: TonoEstado }> = {
  SuperaObjetivo: { texto: 'Supera el objetivo', tono: 'aviso' },
  CercaMaximo: { texto: 'Cerca del máximo', tono: 'error' },
  Vencida: { texto: 'Vencida', tono: 'error' },
}

export function nivelPlazo(incidencia: IncidenciaResumen, horas: number): NivelPlazo | null {
  if (!superaObjetivo(incidencia, horas)) return null
  if (horas > 48) return 'Vencida'
  if (horas >= 40) return 'CercaMaximo'
  return 'SuperaObjetivo'
}

export interface AlertaPlazo {
  incidencia: IncidenciaResumen
  horas: number
  nivel: NivelPlazo
}

/** Alertas de la tarjeta «Plazo de incidencias sencillas», de la más reciente a la más antigua (Figma 388-7027). */
export function alertasPlazo(incidencias: IncidenciaResumen[], ahora: number): AlertaPlazo[] {
  return incidencias
    .map((incidencia) => {
      const horas = horasAbierta(incidencia, ahora)
      const nivel = nivelPlazo(incidencia, horas)
      return nivel ? { incidencia, horas, nivel } : null
    })
    .filter((alerta): alerta is AlertaPlazo => alerta !== null)
    .sort((a, b) => a.horas - b.horas)
}

/** «Hojarasca en exceso · Patio de Letras · 31 h · Luis P.» */
export function textoAlertaPlazo(alerta: AlertaPlazo): string {
  const { incidencia, horas } = alerta
  return [incidencia.tipo, incidencia.espacio, `${horas} h`, incidencia.responsable].filter(Boolean).join(' · ')
}
