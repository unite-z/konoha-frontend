/**
 * Banda de una línea con lo que falta por sincronizar (RF-T-012, AV-226). `pwa-offline.md`: la interfaz muestra
 * siempre cuántas operaciones faltan, para que quien usa iPhone sepa que tiene que abrir la app con conexión.
 *
 * Va en `LayoutOficina`, encima del contenido de cualquier pantalla. Sin pendientes ni conexión perdida, no ocupa sitio.
 */
import { useNavigate } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import { useEnLinea } from '@/hooks/useEnLinea'
import { RUTAS_CORE } from '@/router/rutasApp'
import { useSesion } from '@/sesion/ContextoSesion'
import { porSincronizar, useCola } from '@/sincronizacion/cola'

function textoPendientes(n: number): string {
  return n === 1 ? '1 operación pendiente de enviar' : `${n} operaciones pendientes de enviar`
}

export default function IndicadorSincronizacion() {
  const cola = useCola()
  const enLinea = useEnLinea()
  const { estado } = useSesion()
  const navegar = useNavigate()
  const lista = porSincronizar(cola)
  const rechazadas = lista.filter((p) => p.estado === 'rechazada').length
  const pendientes = lista.length - rechazadas
  const revisar = { texto: 'Revisar', onClick: () => navegar(RUTAS_CORE.pendientes) }

  if (rechazadas > 0) {
    return (
      <AvisoEnLinea tono="error" compacto accion={revisar}>
        {rechazadas === 1 ? '1 operación no se pudo enviar' : `${rechazadas} operaciones no se pudieron enviar`}
      </AvisoEnLinea>
    )
  }
  if (!enLinea || estado.tipo === 'sinConexion') {
    return (
      <AvisoEnLinea tono="advertencia" icono="wifi-off" compacto accion={pendientes > 0 ? revisar : undefined}>
        {pendientes > 0 ? `Sin conexión · ${textoPendientes(pendientes)}` : 'Sin conexión · lo que registres se enviará al volver'}
      </AvisoEnLinea>
    )
  }
  if (cola.pausada === 'sesion' && pendientes > 0) {
    return (
      <AvisoEnLinea tono="advertencia" compacto>
        {`Sesión cerrada · ${textoPendientes(pendientes)}: se enviarán al volver a iniciar sesión`}
      </AvisoEnLinea>
    )
  }
  if (pendientes > 0) {
    return (
      <AvisoEnLinea tono="info" compacto accion={revisar}>
        {cola.enviando ? `Enviando · ${textoPendientes(pendientes)}` : textoPendientes(pendientes)}
      </AvisoEnLinea>
    )
  }
  return null
}
