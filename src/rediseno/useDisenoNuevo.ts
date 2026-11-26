/**
 * Preferencia «Diseño nuevo» (AV-420) con tres estados: sin elegir, encendido y apagado. «Sin elegir» equivale a
 * apagado hasta RD-78. Se guarda en este navegador y en la cuenta (`apariencia.diseno_nuevo`, AV-414) si el backend
 * lo admite. Manda lo elegido en este navegador; si no hay nada, lo de la cuenta; si tampoco, «sin elegir».
 */
import { useCallback, useContext, useSyncExternalStore } from 'react'
import { ContextoSesion } from '@/sesion/ContextoSesion'
import { guardarAparienciaCuenta } from '@/services/api/core'
import type { AparienciaCuenta } from '@/types/core'
import { leerApariencia } from '@/utils/apariencia'

export type EstadoDisenoNuevo = 'sinElegir' | 'encendido' | 'apagado'

export const CLAVE_DISENO_NUEVO = 'av:diseno-nuevo'

const oyentes = new Set<() => void>()
/** Tras un `PUT` con el campo que salió bien, el backend lo admite aunque la sesión cargada no lo traiga. */
let cuentaLoAdmite = false

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
  /** Lo que el `PUT auth/apariencia/` del tema y el acento añade para no borrar la preferencia de la cuenta. */
  camposCuenta: Pick<AparienciaCuenta, 'diseno_nuevo'>
}

export function useDisenoNuevo(): DisenoNuevo {
  const local = useSyncExternalStore(suscribir, leerDisenoNuevo, () => 'sinElegir' as const)
  // Sin proveedor de sesión (pruebas, pantallas sueltas) solo cuenta el navegador.
  const sesion = useContext(ContextoSesion)?.estado
  const cuenta = sesion && (sesion.tipo === 'activa' || sesion.tipo === 'sinConexion') ? sesion.sesion : null
  const apariencia = cuenta?.apariencia
  // AV-414 trae la clave aunque valga `null`. Sin apariencia en la cuenta no se sabe: se intenta al elegir.
  const admite = cuentaLoAdmite || (apariencia != null && 'diseno_nuevo' in apariencia)
  const enCuenta = admite ? apariencia?.diseno_nuevo : undefined
  const estado: EstadoDisenoNuevo =
    local !== 'sinElegir' ? local : enCuenta === true ? 'encendido' : enCuenta === false ? 'apagado' : 'sinElegir'
  const intentar = cuenta !== null && (admite || apariencia == null)

  const elegir = useCallback(
    async (encendido: boolean) => {
      guardarDisenoNuevo(encendido)
      if (!intentar) return // el backend aún no trae el campo
      await guardarAparienciaCuenta({ ...leerApariencia(), diseno_nuevo: encendido })
      cuentaLoAdmite = true
    },
    [intentar],
  )

  const camposCuenta = admite ? { diseno_nuevo: estado === 'sinElegir' ? null : estado === 'encendido' } : {}
  return { estado, encendido: estado === 'encendido', elegir, camposCuenta }
}

/** Solo para pruebas: olvida lo aprendido del backend. */
export function reiniciarDisenoNuevoCuenta() {
  cuentaLoAdmite = false
}
