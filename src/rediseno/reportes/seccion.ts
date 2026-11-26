import { ChartColumn } from 'lucide-react'
import { PERMISOS } from '@/config/permisosCore'
import type { SeccionRediseno } from '../tipos'
import { RUTA_REPORTES } from './enlaces'

export const seccionReportes: SeccionRediseno = {
  id: 'reportes',
  etiqueta: 'Reportes',
  icono: ChartColumn,
  ruta: RUTA_REPORTES,
  permisos: [PERMISOS.consultarIndicadores],
  pestanas: [],
  movil: [],
  enCabecera: true,
}
