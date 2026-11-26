import type { ComponentType } from 'react'
import Apariencia from './Apariencia'
import Cuenta from './Cuenta'
import Lectura from './Lectura'

/**
 * Una sección de Configuración. Cada ticket de Configuración añade la suya a `SECCIONES_CONFIGURACION` con sus
 * permisos por código; `ConfiguracionPage` solo enseña las que la sesión puede ver.
 */
export interface SeccionConfiguracion {
  /** Valor de `?seccion=` en la URL. */
  id: string
  etiqueta: string
  descripcion: string
  /** Se muestra a quien tenga alguno de estos códigos; vacío, a cualquier sesión. */
  permisos: readonly string[]
  Componente: ComponentType
}

export function seccionVisible(seccion: SeccionConfiguracion, permisos: readonly string[]): boolean {
  return seccion.permisos.length === 0 || seccion.permisos.some((p) => permisos.includes(p))
}

export const SECCIONES_CONFIGURACION: readonly SeccionConfiguracion[] = [
  {
    id: 'apariencia',
    etiqueta: 'Apariencia',
    descripcion: 'Tema, color de acento y diseño. Se guarda en tu cuenta.',
    permisos: [],
    Componente: Apariencia,
  },
  {
    id: 'cuenta',
    etiqueta: 'Cuenta',
    descripcion: 'Tu contraseña y tu sesión.',
    permisos: [],
    Componente: Cuenta,
  },
  // Lectura (P-16) va la última: es prescindible y no tiene requisito detrás.
  {
    id: 'lectura',
    etiqueta: 'Lectura',
    descripcion: 'Tamaño del texto en este navegador.',
    permisos: [],
    Componente: Lectura,
  },
]
