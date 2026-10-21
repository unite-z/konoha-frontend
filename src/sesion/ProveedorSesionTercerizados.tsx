/**
 * Proveedor de la sesión de MOD-05. Envuelve el layout para que la cabecera muestre el usuario real.
 *
 * - Al montar: si hay credenciales guardadas en la pestaña, las comprueba con `GET me/`.
 *   403 → se borran (contraseña cambiada, usuario dado de baja). Sin conexión → estado `error` (se conservan).
 * - `ingresar`: comprueba las credenciales con `GET me/` antes de guardarlas.
 * - `cerrarSesion`: las borra de la pestaña y del cliente.
 * Sin credenciales guardadas no se llama a la API (MOD-06 funciona aunque MOD-05 esté deshabilitado).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ErrorApi, aErrorApi, esCancelacion } from '../services/api/cliente'
import { cabeceraBasic, establecerAutorizacion } from '../services/api/clienteTercerizados'
import { obtenerUsuarioActual } from '../services/api/tercerizados'
import { borrarAutorizacion, guardarAutorizacion, leerAutorizacion } from './almacenSesion'
import {
  ContextoSesionTercerizados,
  type EstadoSesionTercerizados,
  type ValorSesionTercerizados,
} from './ContextoSesionTercerizados'

/** Mensaje de credenciales rechazadas (la API responde 403 sin distinguir la causa). */
export const MENSAJE_CREDENCIALES = 'Usuario o contraseña incorrectos, o usuario inactivo. Revísalos y vuelve a intentarlo'

export default function ProveedorSesionTercerizados({ children }: { children: ReactNode }) {
  // Credenciales guardadas al cargar la pestaña (se leen una sola vez).
  const [guardada] = useState(leerAutorizacion)
  const [estado, setEstado] = useState<EstadoSesionTercerizados>(() =>
    guardada ? { tipo: 'verificando' } : { tipo: 'sin-sesion' },
  )
  const [intento, setIntento] = useState(0)
  // Evita que una verificación tardía pise un ingreso o un cierre posterior.
  const generacion = useRef(0)

  useEffect(() => {
    const autorizacion = leerAutorizacion()
    if (!autorizacion || !guardada) return
    const actual = ++generacion.current
    const controlador = new AbortController()
    establecerAutorizacion(autorizacion)
    obtenerUsuarioActual({ autorizacion, signal: controlador.signal })
      .then((usuario) => {
        if (generacion.current === actual) setEstado({ tipo: 'activa', usuario })
      })
      .catch((causa: unknown) => {
        if (esCancelacion(causa) || generacion.current !== actual) return
        const error = aErrorApi(causa)
        if (error.estado === 403) {
          borrarAutorizacion()
          establecerAutorizacion(null)
          setEstado({ tipo: 'sin-sesion' })
        } else {
          setEstado({ tipo: 'error', error })
        }
      })
    return () => controlador.abort()
  }, [guardada, intento])

  const ingresar = useCallback(async (usuario: string, clave: string) => {
    const autorizacion = cabeceraBasic(usuario, clave)
    const actual = ++generacion.current
    try {
      const datos = await obtenerUsuarioActual({ autorizacion })
      if (generacion.current !== actual) throw new ErrorApi(0, null, 'Se inició otra operación de sesión. Vuelve a intentarlo')
      guardarAutorizacion(autorizacion)
      establecerAutorizacion(autorizacion)
      setEstado({ tipo: 'activa', usuario: datos })
      return datos
    } catch (causa) {
      const error = aErrorApi(causa)
      if (error.estado === 403) throw new ErrorApi(403, 'CredencialesInvalidas', MENSAJE_CREDENCIALES)
      throw error
    }
  }, [])

  const cerrarSesion = useCallback(() => {
    generacion.current++
    borrarAutorizacion()
    establecerAutorizacion(null)
    setEstado({ tipo: 'sin-sesion', cerrada: true })
  }, [])

  const reintentar = useCallback(() => {
    setEstado({ tipo: 'verificando' })
    setIntento((n) => n + 1)
  }, [])

  const valor = useMemo<ValorSesionTercerizados>(
    () => ({ estado, ingresar, cerrarSesion, reintentar }),
    [estado, ingresar, cerrarSesion, reintentar],
  )

  return <ContextoSesionTercerizados.Provider value={valor}>{children}</ContextoSesionTercerizados.Provider>
}
