import { MapIcon } from 'lucide-react'
import { PERMISOS } from '@/config/permisosCore'
import type { SeccionRediseno } from '../tipos'
import { RUTA_MAPA } from './enlaces'

export const seccionMapa: SeccionRediseno = {
  id: 'mapa',
  etiqueta: 'Mapa',
  icono: MapIcon,
  ruta: RUTA_MAPA,
  permisos: [PERMISOS.consultarInventario],
  pestanas: [],
  movil: [],
  enCabecera: true,
}
