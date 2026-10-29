/**
 * Proveedor de la sesión de MOD-01.
 *
 * - Al montar consulta `GET auth/sesion/`: 401 significa que no hay sesión; sin conexión, estado `error`.
 * - Si cualquier petición de MOD-01 responde 401, la sesión se da por perdida y el guardián lleva al
 *   ingreso (CU-MOD01-006 2b).
 * - Los cambios de rol llegan solos: el servidor revalida en cada petición y `recargar` relee los permisos.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { aErrorApi, esCancelacion } from '../services/api/cliente'
import { alPerderSesion } from '../services/api/clienteCore'
import { cerrarSesionCore, iniciarSesion, obtenerSesion } from '../services/api/core'
import type { Credenciales } from '../types/core'
import { ContextoSesion, type EstadoSesion, type ValorSesion } from './ContextoSesion'

export default function ProveedorSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>({ tipo: 'verificando' })
  // Evita que una comprobación tardía pise un ingreso o un cierre posterior.
  const generacion = useRef(0)

  useEffect(() => {
    const actual = ++generacion.current
    const controlador = new AbortController()
    obtenerSesion(controlador.signal)
      .then((sesion) => {
        if (actual === generacion.current) setEstado({ tipo: 'activa', sesion })
      })
      .catch((causa: unknown) => {
        if (esCancelacion(causa) || actual !== generacion.current) return
        const error = aErrorApi(causa)
        setEstado(error.estado === 401 ? { tipo: 'anonima' } : { tipo: 'error', error })
      })
    return () => controlador.abort()
  }, [])

  useEffect(() => {
    // Solo cambia una sesión activa: la comprobación inicial resuelve su propio 401.
    alPerderSesion(() => {
      setEstado((previo) => (previo.tipo === 'activa' ? { tipo: 'anonima', motivo: 'perdida' } : previo))
    })
    return () => alPerderSesion(null)
  }, [])

  const ingresar = useCallback(async (credenciales: Credenciales) => {
    const sesion = await iniciarSesion(credenciales)
    generacion.current++
    setEstado({ tipo: 'activa', sesion })
    return sesion
  }, [])

  const cerrarSesion = useCallback(async () => {
    try {
      await cerrarSesionCore()
    } finally {
      generacion.current++
      setEstado({ tipo: 'anonima', motivo: 'cerrada' })
    }
  }, [])

  const recargar = useCallback(async () => {
    const actual = ++generacion.current
    try {
      const sesion = await obtenerSesion()
      if (actual === generacion.current) setEstado({ tipo: 'activa', sesion })
    } catch (causa) {
      if (actual !== generacion.current) return
      const error = aErrorApi(causa)
      setEstado(error.estado === 401 ? { tipo: 'anonima' } : { tipo: 'error', error })
    }
  }, [])

  const valor = useMemo<ValorSesion>(
    () => ({ estado, ingresar, cerrarSesion, recargar }),
    [estado, ingresar, cerrarSesion, recargar],
  )
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
