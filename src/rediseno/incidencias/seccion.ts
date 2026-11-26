import { TriangleAlert } from 'lucide-react'
import { PERMISOS } from '@/config/permisosCore'
import type { SeccionRediseno } from '../tipos'
import { RUTA_INCIDENCIAS } from './enlaces'

export const seccionIncidencias: SeccionRediseno = {
  id: 'incidencias',
  etiqueta: 'Incidencias',
  icono: TriangleAlert,
  ruta: RUTA_INCIDENCIAS,
  permisos: [PERMISOS.consultarPlanificacion, PERMISOS.registrarIncidencia],
  pestanas: [],
  movil: [],
  enCabecera: true,
}
