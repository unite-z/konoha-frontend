/**
 * Proveedor de la sesión de MOD-01.
 *
 * - Al montar consulta `GET auth/sesion/`: 401 significa que no hay sesión.
 * - Sin conexión (RF-T-012, AV-226): si este dispositivo ya tenía una sesión comprobada, estado `sinConexion` con su
 *   instantánea (sin credenciales) para consultar lo descargado y registrar en la cola; al volver la red se comprueba
 *   de nuevo. Sin instantánea, estado `error`.
 * - Si cualquier petición de MOD-01 responde 401, la sesión se da por perdida y el guardián lleva al
 *   ingreso (CU-MOD01-006 2b).
 * - Los cambios de rol llegan solos: el servidor revalida en cada petición y `recargar` relee los permisos.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { aErrorApi, esCancelacion } from '../services/api/cliente'
import { alPerderSesion } from '../services/api/clienteCore'
import { cerrarSesionCore, iniciarSesion, obtenerSesion } from '../services/api/core'
import type { Credenciales, SesionCore } from '../types/core'
import { olvidarDatos } from '@/sincronizacion/datosDescargados'
import { ContextoSesion, type EstadoSesion, type ValorSesion } from './ContextoSesion'
import { borrarInstantanea, guardarInstantanea, leerInstantanea } from './instantaneaSesion'

/** Activa: se guarda la instantánea para la próxima vez que se abra sin conexión. */
function activa(sesion: SesionCore): EstadoSesion {
  void guardarInstantanea(sesion)
  return { tipo: 'activa', sesion }
}

/** Estado tras un fallo al comprobar la sesión. */
async function trasFallo(causa: unknown): Promise<EstadoSesion> {
  const error = aErrorApi(causa)
  if (error.estado === 401) {
    void borrarInstantanea()
    return { tipo: 'anonima' }
  }
  if (error.estado === 0) {
    const sesion = await leerInstantanea()
    if (sesion) return { tipo: 'sinConexion', sesion }
  }
  return { tipo: 'error', error }
}

export default function ProveedorSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>({ tipo: 'verificando' })
  // Evita que una comprobación tardía pise un ingreso o un cierre posterior.
  const generacion = useRef(0)

  useEffect(() => {
    const actual = ++generacion.current
    const controlador = new AbortController()
    obtenerSesion(controlador.signal)
      .then((sesion) => {
        if (actual === generacion.current) setEstado(activa(sesion))
      })
      .catch(async (causa: unknown) => {
        if (esCancelacion(causa) || actual !== generacion.current) return
        const siguiente = await trasFallo(causa)
        if (actual === generacion.current) setEstado(siguiente)
      })
    return () => controlador.abort()
  }, [])

  useEffect(() => {
    // Solo cambia una sesión activa: la comprobación inicial resuelve su propio 401.
    alPerderSesion(() => {
      void borrarInstantanea()
      setEstado((previo) =>
        previo.tipo === 'activa' || previo.tipo === 'sinConexion' ? { tipo: 'anonima', motivo: 'perdida' } : previo,
      )
    })
    return () => alPerderSesion(null)
  }, [])

  const ingresar = useCallback(async (credenciales: Credenciales) => {
    const sesion = await iniciarSesion(credenciales)
    generacion.current++
    setEstado(activa(sesion))
    return sesion
  }, [])

  const cerrarSesion = useCallback(async () => {
    try {
      await cerrarSesionCore()
    } finally {
      // Lo descargado es de este usuario: no se deja en el dispositivo. La cola se conserva (se envía al volver a
      // iniciar sesión con la misma cuenta).
      await Promise.all([borrarInstantanea(), olvidarDatos()])
      generacion.current++
      setEstado({ tipo: 'anonima', motivo: 'cerrada' })
    }
  }, [])

  const recargar = useCallback(async () => {
    const actual = ++generacion.current
    try {
      const sesion = await obtenerSesion()
      if (actual === generacion.current) setEstado(activa(sesion))
    } catch (causa) {
      if (actual !== generacion.current) return
      const siguiente = await trasFallo(causa)
      if (actual === generacion.current) setEstado(siguiente)
    }
  }, [])

  // Al volver la red con la sesión de la instantánea, se comprueba con el servidor.
  const sinConexion = estado.tipo === 'sinConexion'
  useEffect(() => {
    if (!sinConexion) return
    const alVolver = () => void recargar()
    window.addEventListener('online', alVolver)
    return () => window.removeEventListener('online', alVolver)
  }, [sinConexion, recargar])

  const valor = useMemo<ValorSesion>(
    () => ({ estado, ingresar, cerrarSesion, recargar }),
    [estado, ingresar, cerrarSesion, recargar],
  )
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
