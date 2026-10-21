/**
 * Valor que se actualiza `ms` milisegundos después del último cambio (búsquedas mientras se escribe:
 * evita una petición por tecla).
 */
import { useEffect, useState } from 'react'

export function useDemora<T>(valor: T, ms = 300): T {
  const [demorado, setDemorado] = useState(valor)
  useEffect(() => {
    const temporizador = window.setTimeout(() => setDemorado(valor), ms)
    return () => window.clearTimeout(temporizador)
  }, [valor, ms])
  return demorado
}
