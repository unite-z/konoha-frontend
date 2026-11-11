/**
 * Vacía la cola sin conexión (RF-T-012, AV-226) en todos los momentos de `docs/estandares/pwa-offline.md`:
 * al abrir la aplicación, al volver la red (`online`), al volver a primer plano (`visibilitychange`), cada minuto
 * mientras haya pendientes. Background Sync (solo Chrome en Android) queda como mejora futura: necesitaría repetir el
 * envío dentro del service worker, y la cola ya se vacía en cuanto se abre la aplicación con red.
 *
 * Solo envía con una sesión comprobada por el servidor (`activa`), nunca con la instantánea sin conexión, y solo lo que
 * registró ese mismo usuario. Tras un 401 la cola se detiene y se reanuda al volver a iniciar sesión.
 */
import { useEffect, type ReactNode } from 'react'
import { useSesion } from '@/sesion/ContextoSesion'
import { porSincronizar, recargarCola, reanudarCola, useCola, vaciarCola } from './cola'
import { fijarUsuarioDatos } from './datosDescargados'
import { registrarEjecutores } from './ejecutores'

const CADA_MINUTO_MS = 60_000

export default function ProveedorSincronizacion({ children }: { children: ReactNode }) {
  const { estado } = useSesion()
  const usuarioId = estado.tipo === 'activa' || estado.tipo === 'sinConexion' ? estado.sesion.usuario.id : null
  const comprobada = estado.tipo === 'activa'
  const cola = useCola()
  const hayPendientes = porSincronizar(cola).some((p) => p.estado === 'pendiente')

  useEffect(() => {
    registrarEjecutores()
    // Sin IndexedDB la aplicación sigue con conexión; las pantallas avisan si no pueden guardar sin red.
    recargarCola().catch(() => undefined)
  }, [])

  useEffect(() => {
    fijarUsuarioDatos(usuarioId)
  }, [usuarioId])

  useEffect(() => {
    if (!comprobada || usuarioId === null) return
    reanudarCola()
    const vaciar = () => {
      if (navigator.onLine) void vaciarCola(usuarioId)
    }
    const alVolverAPrimerPlano = () => {
      if (document.visibilityState !== 'visible') return
      recargarCola()
        .catch(() => undefined)
        .then(vaciar)
    }
    vaciar()
    window.addEventListener('online', vaciar)
    document.addEventListener('visibilitychange', alVolverAPrimerPlano)
    return () => {
      window.removeEventListener('online', vaciar)
      document.removeEventListener('visibilitychange', alVolverAPrimerPlano)
    }
  }, [comprobada, usuarioId])

  // Reintento periódico solo mientras queda algo por enviar.
  useEffect(() => {
    if (!comprobada || usuarioId === null || !hayPendientes) return
    const temporizador = window.setInterval(() => {
      if (navigator.onLine) void vaciarCola(usuarioId)
    }, CADA_MINUTO_MS)
    return () => window.clearInterval(temporizador)
  }, [comprobada, usuarioId, hayPendientes])

  return children
}

