import { useEffect, useState } from 'react'
import { reducirMovimiento } from '@/rediseno/base/movimiento'

const VUELO_POR_DEFECTO_MS = 760

/** Duración del vuelo de cámara: el token `--movimiento-vuelo`, con la misma cifra de respaldo si no se puede leer. */
function duracionDelVuelo(): number {
  if (typeof document === 'undefined') return VUELO_POR_DEFECTO_MS
  const valor = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--movimiento-vuelo'))
  return Number.isFinite(valor) && valor > 0 ? valor : VUELO_POR_DEFECTO_MS
}

/**
 * `true` cuando la cámara ya llegó al área abierta (`clave`): los marcadores brotan entonces y no durante el vuelo.
 * Con «reducir movimiento» el vuelo es un corte y la llegada es inmediata. Sin área (`null`), siempre `false`.
 */
export function useLlegadaCamara(clave: string | null): boolean {
  const [llegada, setLlegada] = useState<string | null>(null)
  useEffect(() => {
    if (clave === null || reducirMovimiento()) return
    const espera = setTimeout(() => setLlegada(clave), duracionDelVuelo())
    return () => clearTimeout(espera)
  }, [clave])
  // Con «reducir movimiento» el vuelo es un corte: no hay nada que esperar.
  return clave !== null && (llegada === clave || reducirMovimiento())
}
