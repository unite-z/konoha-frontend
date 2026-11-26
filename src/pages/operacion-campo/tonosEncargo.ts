import { type TonoEstado } from '@/design-system/Estado'
import type { EstadoEncargo } from '@/types/operacionCampo'

export const tonosEncargo: Record<EstadoEncargo, TonoEstado> = {
  'Por completar': 'neutro',
  'En curso': 'info',
  Completado: 'exito',
  Observado: 'aviso',
  Cancelado: 'error',
}
