/**
 * Registro del service worker y aviso de versión nueva (`pwa-offline.md`).
 *
 * - Solo en el build (en `npm run dev` no hay service worker).
 * - Con versión nueva solo se avisa: recarga quien pulsa «Recargar», así nunca se pierde un formulario a medias.
 * - La primera vez que la aplicación queda guardada para usarla sin red, también se dice.
 */
import { useEffect, useState } from 'react'
import { Workbox } from 'workbox-window'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'

let registro: Workbox | null = null

export default function AvisoNuevaVersion() {
  const [hayVersionNueva, setHayVersionNueva] = useState(false)
  const [listaSinConexion, setListaSinConexion] = useState(false)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator) || registro) return
    const wb = new Workbox('/sw.js', { scope: '/' })
    registro = wb
    wb.addEventListener('waiting', () => setHayVersionNueva(true))
    wb.addEventListener('installed', (evento) => {
      if (!evento.isUpdate) setListaSinConexion(true)
    })
    // Tras «Recargar», el service worker nuevo toma el control y se recarga una sola vez.
    wb.addEventListener('controlling', () => window.location.reload())
    wb.register().catch(() => undefined)
  }, [])

  if (hayVersionNueva) {
    return (
      <AvisoEnLinea tono="info" compacto accion={{ texto: 'Recargar', onClick: () => registro?.messageSkipWaiting() }}>
        Hay una versión nueva de la aplicación. Guarda lo que estés escribiendo y recarga.
      </AvisoEnLinea>
    )
  }
  if (listaSinConexion) {
    return (
      <AvisoEnLinea tono="exito" compacto accion={{ texto: 'Entendido', onClick: () => setListaSinConexion(false) }}>
        La aplicación ya funciona sin conexión en este dispositivo.
      </AvisoEnLinea>
    )
  }
  return null
}
