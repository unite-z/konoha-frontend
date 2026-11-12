import type { EntradaEncargo } from '../types/operacionCampo'
import { tiene, type Permisos } from '../config/permisosSesion'

/** Gestionar cuadrillas, encargos y verificar actividades: `CAM.CUADRILLA.GESTIONAR` (AV-382, por permiso). */
export function esJefeCampo(permisos: Permisos): boolean { return tiene(permisos, 'CAM.CUADRILLA.GESTIONAR') }
/** Registrar en el parte de la propia cuadrilla: `CAM.PARTE.REGISTRAR`. */
export function puedeRegistrarParte(permisos: Permisos): boolean { return tiene(permisos, 'CAM.PARTE.REGISTRAR') }
/** Avanzar el estado de los encargos propios (capataz responsable): `PLA.ENCARGO.ACTUALIZAR_ESTADO`, como el backend. */
export function puedeCambiarEstadoEncargo(permisos: Permisos): boolean { return tiene(permisos, 'PLA.ENCARGO.ACTUALIZAR_ESTADO') }
export function puedeRegistrarCampo(permisos: Permisos): boolean { return esJefeCampo(permisos) || puedeRegistrarParte(permisos) }
export { hoyLima } from './instanteLima'
export function sumarDiasCampo(fecha: string, dias: number): string {
  const date = new Date(`${fecha}T12:00:00Z`)
  if(Number.isNaN(date.valueOf())) return ''
  date.setUTCDate(date.getUTCDate()+dias)
  return date.toISOString().slice(0,10)
}
export function validarEncargoCampo(body: EntradaEncargo): Record<string,string> {
  const errors: Record<string,string> = {}
  if(!body.cuadrilla_id) errors.cuadrilla_id = 'Selecciona una cuadrilla'
  if(!body.tipo_actividad_id) errors.tipo_actividad_id = 'Selecciona una actividad'
  if(!body.area_verde_id) errors.area_verde_id = 'Selecciona un espacio'
  if(!body.descripcion.trim()) errors.descripcion = 'Describe el encargo'
  const fechas = body.periodicidad === 'Directo'
    ? (['plazo_previsto'] as const)
    : (['fecha_reunion', 'fecha_inicio', 'fecha_fin', 'plazo_previsto'] as const)
  for (const field of fechas) {
    const valor = body[field]
    if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) {
      errors[field] = 'Indica una fecha válida'
    }
  }
  if (body.periodicidad === 'Directo') {
    if (!errors.plazo_previsto && body.plazo_previsto < body.fecha_inicio) {
      errors.plazo_previsto = 'El plazo no puede ser anterior al inicio del encargo'
    }
    return errors
  }
  if(!errors.fecha_inicio && !errors.fecha_fin) {
    const days = (Date.parse(body.fecha_fin)-Date.parse(body.fecha_inicio))/86400000+1
    const max = body.periodicidad==='Semanal'?7:14
    if(days<1||days>max) errors.fecha_fin = `El periodo debe tener entre 1 y ${max} días`
  }
  if(body.plazo_previsto<body.fecha_inicio || body.plazo_previsto>body.fecha_fin) errors.plazo_previsto = 'El plazo debe estar dentro del periodo'
  if(body.fecha_reunion && body.fecha_reunion>body.fecha_fin) errors.fecha_reunion = 'La reunión no puede ser posterior al periodo'
  return errors
}
