import type { EntradaEncargo, UsuarioCampo } from '../types/operacionCampo'

export function esJefeCampo(user: UsuarioCampo | null): boolean { return user?.rol === 'Jefe de sección' }
export function puedeRegistrarCampo(user: UsuarioCampo | null): boolean { return esJefeCampo(user) || user?.rol === 'Capataz' }
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
  for(const field of ['fecha_reunion','fecha_inicio','fecha_fin','plazo_previsto'] as const) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(body[field]) || Number.isNaN(Date.parse(body[field]))) errors[field] = 'Indica una fecha válida'
  }
  if(!errors.fecha_inicio && !errors.fecha_fin) {
    const days = (Date.parse(body.fecha_fin)-Date.parse(body.fecha_inicio))/86400000+1
    const max = body.periodicidad==='Semanal'?7:14
    if(days<1||days>max) errors.fecha_fin = `El periodo debe tener entre 1 y ${max} días`
  }
  if(body.plazo_previsto<body.fecha_inicio || body.plazo_previsto>body.fecha_fin) errors.plazo_previsto = 'El plazo debe estar dentro del periodo'
  if(body.fecha_reunion>body.fecha_fin) errors.fecha_reunion = 'La reunión no puede ser posterior al periodo'
  return errors
}
