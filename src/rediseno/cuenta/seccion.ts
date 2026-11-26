import { User } from 'lucide-react'
import type { SeccionRediseno } from '../tipos'
import { RUTA_CUENTA } from './enlaces'

export const seccionCuenta: SeccionRediseno = {
  id: 'cuenta',
  etiqueta: 'Cuenta',
  icono: User,
  ruta: RUTA_CUENTA,
  permisos: [],
  pestanas: [],
  movil: [],
  enCabecera: false,
}
