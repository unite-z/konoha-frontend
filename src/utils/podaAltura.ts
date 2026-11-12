/** Textos de la poda de altura a demanda (AV-312, RF-POD-005). */
import type { MotivoPodaAltura } from '@/types/intervencionesPoda'

export const TEXTO_MOTIVO_PODA_ALTURA: Record<MotivoPodaAltura, string> = {
  Riesgo: 'Riesgo',
  Obstruccion: 'Obstrucción',
  PlantaMuerta: 'Planta muerta',
  Reduccion: 'Reducción de tamaño o de ramas',
}
