/**
 * Apertura de un panel en la URL (`?area=12`): abrir añade una entrada al historial («Atrás» cierra y recargar
 * reabre). Con enlace directo (sin entrada propia), cerrar solo quita el parámetro.
 */
import { useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

export interface ParametroPanel {
  /** Valor del parámetro (identificador del elemento abierto) o `null` si el panel está cerrado. */
  valor: string | null
  abrir: (valor: string) => void
  cerrar: () => void
}

interface EstadoPanel {
  panelAbiertoPor?: string
}

export function useParametroPanel(nombre: string): ParametroPanel {
  const [parametros, setParametros] = useSearchParams()
  const navegar = useNavigate()
  const ubicacion = useLocation()

  const abrir = useCallback(
    (valor: string) => {
      const nuevos = new URLSearchParams(parametros)
      nuevos.set(nombre, valor)
      // Con el panel ya abierto (otra fila) se sustituye la entrada: «Cerrar» y «Atrás» vuelven a la vista sin panel.
      if (parametros.has(nombre)) setParametros(nuevos, { replace: true, state: ubicacion.state })
      else setParametros(nuevos, { state: { panelAbiertoPor: nombre } satisfies EstadoPanel })
    },
    [nombre, parametros, setParametros, ubicacion.state],
  )

  const cerrar = useCallback(() => {
    const estado = ubicacion.state as EstadoPanel | null
    if (estado?.panelAbiertoPor === nombre) {
      navegar(-1)
      return
    }
    const nuevos = new URLSearchParams(parametros)
    nuevos.delete(nombre)
    setParametros(nuevos, { replace: true })
  }, [nombre, navegar, parametros, setParametros, ubicacion.state])

  return { valor: parametros.get(nombre), abrir, cerrar }
}
