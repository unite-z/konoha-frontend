import { solicitarTercerizados } from './clienteTercerizados'
import type {
  CambioFichaTecnica,
  EvaluacionEjemplar,
  FichaTecnicaEjemplar,
  NuevaEvaluacionEjemplar,
} from '@/types/fichaTecnica'

/** Ficha técnica y evaluación del ejemplar (AV-133, RF-INV-005). */
const BASE = '/api/v1/inventario'

export function obtenerFichaTecnica(ejemplarId: number, signal?: AbortSignal): Promise<FichaTecnicaEjemplar> {
  return solicitarTercerizados(`ejemplares/${ejemplarId}/ficha-tecnica/`, { signal, base: BASE })
}
export function cambiarFichaTecnica(ejemplarId: number, cambio: CambioFichaTecnica): Promise<FichaTecnicaEjemplar> {
  return solicitarTercerizados(`ejemplares/${ejemplarId}/ficha-tecnica/`, {
    metodo: 'PATCH',
    cuerpo: cambio,
    base: BASE,
  })
}
export function registrarEvaluacion(ejemplarId: number, entrada: NuevaEvaluacionEjemplar): Promise<EvaluacionEjemplar> {
  return solicitarTercerizados(`ejemplares/${ejemplarId}/evaluaciones/`, {
    metodo: 'POST',
    cuerpo: entrada,
    base: BASE,
  })
}
