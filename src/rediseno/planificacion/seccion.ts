import { CalendarDays } from 'lucide-react'
import { PERMISOS } from '@/config/permisosCore'
import type { SeccionRediseno } from '../tipos'
import { RUTA_PLANIFICACION } from './enlaces'

export const seccionPlanificacion: SeccionRediseno = {
  id: 'planificacion',
  etiqueta: 'Planificación',
  icono: CalendarDays,
  ruta: RUTA_PLANIFICACION,
  permisos: [PERMISOS.consultarPlanificacion],
  pestanas: [],
  movil: [],
  enCabecera: true,
}
