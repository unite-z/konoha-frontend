import type { LucideIcon } from 'lucide-react'
import { Ellipsis } from 'lucide-react'
import { rutaCuenta } from '../../cuenta/enlaces'
import type { SeccionRediseno } from '../../tipos'

export interface EntradaBarra {
  clave: string
  etiqueta: string
  icono: LucideIcon
  ruta: string
}

/** Máximo de entradas de la barra inferior de quien no tiene el inicio en campo. */
export const MAXIMO_ENTRADAS = 5

// Misma regla que `InicioRol` (N-06): registra su parte y no verifica los de otros.
const REGISTRAR_PARTE = 'CAM.PARTE.REGISTRAR'
const VERIFICAR_PARTE = 'CAM.PARTE.VERIFICAR'

/**
 * Entradas de la única barra inferior móvil. Quien tiene el inicio en campo ve las entradas `movil` de la sección
 * marcada `inicioEnCampo` y «Más» (hacia Cuenta); el resto, sus secciones de cabecera permitidas (como mucho 5).
 * `visibles` son las secciones que los permisos dejan ver (`seccionesVisibles`).
 */
export function entradasBarraInferior(visibles: readonly SeccionRediseno[], permisos: readonly string[]): EntradaBarra[] {
  const campo = visibles.find((s) => s.inicioEnCampo)
  if (campo && permisos.includes(REGISTRAR_PARTE) && !permisos.includes(VERIFICAR_PARTE)) {
    const propias = campo.movil.map((e) => ({ clave: e.ruta, ...e }))
    return [...propias, { clave: 'mas', etiqueta: 'Más', icono: Ellipsis, ruta: rutaCuenta() }]
  }
  return visibles
    .filter((s) => s.enCabecera)
    .slice(0, MAXIMO_ENTRADAS)
    .map((s) => ({ clave: s.id, etiqueta: s.etiqueta, icono: s.icono, ruta: s.ruta }))
}
