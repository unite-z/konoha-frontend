/** Ids de los campos del asistente, para llevar el foco al primer error y enlazar el resumen de errores. */
import type { ErroresPaso1 } from '../../../utils/nuevaAtencion'

export const IDS_PASO1: Record<keyof ErroresPaso1, string> = {
  contrato: 'nueva-contrato',
  descripcion: 'nueva-descripcion',
  origen: 'nueva-origen-Demanda',
  unidad: 'nueva-unidad',
  unidadProvisional: 'nueva-unidad-provisional',
}

/** Mensaje «selecciona al menos un espacio o ejemplar» del paso 2. */
export const ID_LISTA_SELECCIONADOS = 'nueva-seleccionados'
