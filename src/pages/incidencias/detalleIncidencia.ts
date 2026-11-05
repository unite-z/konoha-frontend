/**
 * Lógica pura del detalle de incidencia (AV-284, Figma 388-7305 y 389-7300): textos de la ficha y vía sugerida.
 * Se prueba en `detalleIncidencia.test.ts`.
 */
import type { AtencionIncidencia, CapatazDisponible, EventoIncidencia, IncidenciaDetalle, ViaIncidencia } from '@/types/incidencias'
import { instanteALocalLima } from '@/utils/instanteLima'

/** Altura desde la que se sugiere el proveedor tercerizado (poda de altura, AV-276). */
export const ALTURA_TERCERIZADA_M = 5

/** Vía sugerida: un ejemplar de 5 m o más va al proveedor tercerizado; si no, al personal propio. */
export function viaSugerida(incidencia: IncidenciaDetalle): ViaIncidencia {
  const altura = incidencia.ejemplar?.altura_m ?? 0
  return altura >= ALTURA_TERCERIZADA_M ? 'Tercerizada' : 'PersonalPropio'
}

/** Descripción de la opción tercerizada: «Sugerido: árbol de 5 m o más (7 m)», solo si es la sugerida. */
export function descripcionTercerizada(incidencia: IncidenciaDetalle): string {
  const altura = incidencia.ejemplar?.altura_m
  return viaSugerida(incidencia) === 'Tercerizada' && altura ? `Sugerido: árbol de ${ALTURA_TERCERIZADA_M} m o más (${altura} m)` : 'Requerimiento a un proveedor'
}

/** «Jardín de la Biblioteca · Ciencias». */
export function textoUbicacion(incidencia: IncidenciaDetalle): string {
  return [incidencia.espacio, incidencia.zona].filter(Boolean).join(' · ')
}

/** «T-0412 · Ficus · 7 m», o `null` sin ejemplar. */
export function textoEjemplar(incidencia: IncidenciaDetalle): string | null {
  const e = incidencia.ejemplar
  if (!e) return null
  return [e.codigo, e.especie, e.altura_m !== null ? `${e.altura_m} m` : null].filter(Boolean).join(' · ')
}

const CANAL: Record<IncidenciaDetalle['canal'], string> = {
  App: 'app móvil',
  Web: 'web',
  Telefono: 'teléfono',
  WhatsApp: 'WhatsApp',
  Correo: 'correo',
  Presencial: 'en persona',
}

/** «Ana Q. · app móvil · hoy 09:20» (o «04/11 09:20» si no es de hoy). */
export function textoReporto(incidencia: IncidenciaDetalle, hoy: string): string {
  const local = instanteALocalLima(incidencia.fecha_registro) ?? incidencia.fecha_registro
  const fecha = local.slice(0, 10)
  const cuando = fecha === hoy ? `hoy ${local.slice(11, 16)}` : `${fecha.slice(8, 10)}/${fecha.slice(5, 7)} ${local.slice(11, 16)}`
  return [incidencia.reportado_por, CANAL[incidencia.canal], cuando].join(' · ')
}

/** `fecha` (AAAA-MM-DD) más `dias`. */
export function masDias(fecha: string, dias: number): string {
  const dia = new Date(`${fecha}T00:00:00Z`)
  dia.setUTCDate(dia.getUTCDate() + dias)
  return dia.toISOString().slice(0, 10)
}

/** «01/11». */
export function diaMes(fecha: string): string {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`
}

/** Capataces con hueco ese día (menos encargos que la capacidad de su cuadrilla). */
export function capatacesLibres(capataces: CapatazDisponible[]): CapatazDisponible[] {
  return capataces.filter((c) => !c.carga || c.carga.asignados < c.carga.capacidad)
}

/** «6 de 6». */
export function textoCarga(capataz: CapatazDisponible): string {
  return capataz.carga ? `${capataz.carga.asignados} de ${capataz.carga.capacidad}` : ''
}

/** Lo que va con el encargo (Figma 389-7502): la foto, la descripción y el ejemplar, si lo hay. */
export function incluyeEncargo(incidencia: IncidenciaDetalle): string[] {
  return ['Foto', 'Descripción', incidencia.ejemplar?.codigo].filter((x): x is string => Boolean(x))
}

/** «hoy 11:40» o «03/11 11:40». */
function cuando(instante: string, hoy: string): string {
  const local = instanteALocalLima(instante) ?? instante
  return local.slice(0, 10) === hoy ? `hoy ${local.slice(11, 16)}` : `${diaMes(local.slice(0, 10))} ${local.slice(11, 16)}`
}

/** «Atendida por Luis P. · hoy 11:40 · encargo ENC-2026-118» (Figma 390-8008). */
export function textoAtendida(atencion: AtencionIncidencia, hoy: string): string {
  return [`Atendida por ${atencion.atendida_por}`, cuando(atencion.atendida_en, hoy), atencion.encargo_codigo && `encargo ${atencion.encargo_codigo}`].filter(Boolean).join(' · ')
}

/** «2 h 25 min», «40 min» o «3 días 2 h». */
export function textoTiempoCierre(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas === 0) return `${resto} min`
  if (horas < 48) return resto ? `${horas} h ${resto} min` : `${horas} h`
  const dias = Math.floor(horas / 24)
  return horas % 24 ? `${dias} días ${horas % 24} h` : `${dias} días`
}

/**
 * Hora de cada evento del historial (Figma 390-7811): el más reciente con «hoy» si es de hoy y los demás del mismo
 * día solo con la hora; los de otro día, con la fecha.
 */
export function horasHistorial(eventos: EventoIncidencia[], hoy: string): string[] {
  return eventos.map((evento, indice) => {
    const texto = cuando(evento.fecha_hora, hoy)
    return indice > 0 && texto.startsWith('hoy ') ? texto.slice(4) : texto
  })
}

/** Fecha del informe del proveedor en MOD-05 si la incidencia se derivó y ya lo tiene (AV-278); `null` si no. */
export function informeDelProveedor(incidencia: IncidenciaDetalle): string | null {
  const paso = incidencia.requerimiento?.pasos.find((p) => p.nombre === 'Informe del proveedor')
  return paso?.estado === 'Hecho' ? paso.fecha : null
}
