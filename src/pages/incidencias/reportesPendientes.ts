/**
 * Incidencias reportadas sin conexión que esperan a enviarse (AV-282, Figma 394-9964). Las comparten «Reportar» y
 * «Mis incidencias» mientras la aplicación está abierta; la cola persistente en IndexedDB es la común de RF-T-012
 * (AV-226).
 */
import { useSyncExternalStore } from 'react'
import type { ReportePendiente } from '@/types/incidencias'

let pendientes: ReportePendiente[] = []
const avisos = new Set<() => void>()

function avisar() {
  for (const aviso of avisos) aviso()
}

export function anadirPendiente(reporte: ReportePendiente) {
  pendientes = [reporte, ...pendientes]
  avisar()
}

export function quitarPendiente(clave: string) {
  pendientes = pendientes.filter((p) => p.clave !== clave)
  avisar()
}

export function leerPendientes(): ReportePendiente[] {
  return pendientes
}

/** Solo para las pruebas. */
export function vaciarPendientes() {
  pendientes = []
  avisar()
}

export function usePendientes(): ReportePendiente[] {
  return useSyncExternalStore(
    (aviso) => {
      avisos.add(aviso)
      return () => avisos.delete(aviso)
    },
    () => pendientes,
    () => pendientes,
  )
}
