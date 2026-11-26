import { Truck } from 'lucide-react'
import { PERMISOS } from '@/config/permisosCore'
import type { SeccionRediseno } from '../tipos'
import { RUTA_PROVEEDORES } from './enlaces'

export const seccionProveedores: SeccionRediseno = {
  id: 'proveedores',
  etiqueta: 'Proveedores',
  icono: Truck,
  ruta: RUTA_PROVEEDORES,
  permisos: [PERMISOS.registrarAtencion, PERMISOS.consultarContratos],
  pestanas: [],
  movil: [],
  enCabecera: true,
}
