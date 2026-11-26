import type { CategoriaAfectacion } from '@/types/evidenciaFitosanitariaIa'

/** Lo que decide cada elemento: la hipótesis (con su categoría y nombre) o «No es posible concluir» (todo nulo). */
export interface ValorEvidencia {
  clave: string | null
  categoria: CategoriaAfectacion | null
  nombre: string | null
  plaga_id: number | null
}

export const ID_NO_CONCLUYENTE = 'no-concluyente'
export const TITULO_NO_CONCLUYENTE = 'No es posible concluir'
