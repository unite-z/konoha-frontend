import type { LucideIcon } from 'lucide-react'

/** Pestaña interna de una sección; `ruta` sale del `enlaces.ts` del módulo. */
export interface PestanaRediseno {
  etiqueta: string
  ruta: string
}

/** Entrada de la barra inferior del móvil. */
export interface EntradaMovilRediseno {
  etiqueta: string
  icono: LucideIcon
  ruta: string
}

/** Lo que cada módulo declara en su `seccion.ts` y reúne `registro.ts`. */
export interface SeccionRediseno {
  id: string
  etiqueta: string
  icono: LucideIcon
  /** Ruta de entrada de la sección (con prefijo). */
  ruta: string
  /** Se muestra a quien tenga alguno de estos códigos de permiso; vacío, a cualquier sesión. */
  permisos: readonly string[]
  pestanas: readonly PestanaRediseno[]
  movil: readonly EntradaMovilRediseno[]
  /** `false` en cuenta y campo: no son secciones de la cabecera. */
  enCabecera: boolean
  /** `true` en la sección de campo: quien tiene el inicio en campo ve sus entradas `movil` y «Más» en la barra inferior. */
  inicioEnCampo?: boolean
}
