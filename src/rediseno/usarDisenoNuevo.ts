/**
 * Preferencia «Diseño nuevo» (AV-420) con tres estados: sin elegir, encendido y apagado. «Sin elegir» equivale a
 * apagado hasta RD-78. Se guarda en este navegador y, si la sesión trae el campo `diseno_nuevo` (AV-414), también en
 * la cuenta. Manda lo elegido en este navegador; si no hay nada, lo de la cuenta; si tampoco, «sin elegir».
 */
import { useCallback, useContext, useSyncExternalStore } from 'react'
import { ContextoSesion } from '@/sesion/ContextoSesion'
import { guardarDisenoNuevoCuenta } from '@/services/api/core'
import { leerApariencia } from '@/utils/apariencia'

export type EstadoDisenoNuevo = 'sinElegir' | 'encendido' | 'apagado'

export const CLAVE_DISENO_NUEVO = 'av:diseno-nuevo'

const oyentes = new Set<() => void>()

function almacen(): Storage | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

/** Lo guardado en este navegador; si no se puede leer (modo privado), «sin elegir». */
export function leerDisenoNuevo(): EstadoDisenoNuevo {
  try {
    const valor = almacen()?.getItem(CLAVE_DISENO_NUEVO)
    return valor === '1' ? 'encendido' : valor === '0' ? 'apagado' : 'sinElegir'
  } catch {
    return 'sinElegir'
  }
}

export function guardarDisenoNuevo(encendido: boolean) {
  try {
    almacen()?.setItem(CLAVE_DISENO_NUEVO, encendido ? '1' : '0')
  } catch {
    // Sin almacenamiento: la elección vale solo hasta recargar.
  }
  oyentes.forEach((oyente) => oyente())
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  window.addEventListener('storage', oyente)
  return () => {
    oyentes.delete(oyente)
    window.removeEventListener('storage', oyente)
  }
}

export interface DisenoNuevo {
  estado: EstadoDisenoNuevo
  /** `true` solo con el interruptor encendido: «sin elegir» cuenta como apagado. */
  encendido: boolean
  /** Elige y guarda en el navegador. Rechaza si la cuenta no pudo guardarlo (el navegador ya lo tiene). */
  elegir: (encendido: boolean) => Promise<void>
}

export function useDisenoNuevo(): DisenoNuevo {
  const local = useSyncExternalStore(suscribir, leerDisenoNuevo, () => 'sinElegir' as const)
  // Sin proveedor de sesión (pruebas, pantallas sueltas) solo cuenta el navegador.
  const sesion = useContext(ContextoSesion)?.estado
  const cuenta = sesion && (sesion.tipo === 'activa' || sesion.tipo === 'sinConexion') ? sesion.sesion : null
  const enCuenta = cuenta?.diseno_nuevo
  const estado: EstadoDisenoNuevo =
    local !== 'sinElegir' ? local : enCuenta === true ? 'encendido' : enCuenta === false ? 'apagado' : 'sinElegir'

  const elegir = useCallback(
    async (encendido: boolean) => {
      guardarDisenoNuevo(encendido)
      if (enCuenta === undefined) return // el backend aún no trae el campo
      await guardarDisenoNuevoCuenta(leerApariencia(), encendido)
    },
    [enCuenta],
  )

  return { estado, encendido: estado === 'encendido', elegir }
}
