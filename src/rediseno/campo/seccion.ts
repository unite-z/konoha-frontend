import { ClipboardList } from 'lucide-react'
import { PERMISOS } from '@/config/permisosCore'
import type { SeccionRediseno } from '../tipos'
import { RUTA_CAMPO } from './enlaces'

export const seccionCampo: SeccionRediseno = {
  id: 'campo',
  etiqueta: 'Campo',
  icono: ClipboardList,
  ruta: RUTA_CAMPO,
  permisos: [PERMISOS.consultarCuadrillas],
  pestanas: [],
  movil: [],
  enCabecera: false,
  inicioEnCampo: true,
}
