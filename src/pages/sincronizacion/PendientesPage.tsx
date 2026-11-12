// RF-T-012 · Operación sin conexión y sincronización común (AV-226)
/**
 * Lo que este dispositivo tiene por enviar: qué es, cuándo se registró y en qué estado está. Las rechazadas muestran el
 * motivo y solo desaparecen si el usuario las descarta (`pwa-offline.md`: nunca se borran solas).
 */
import { useState } from 'react'
import AccionFila, { AccionesFila } from '@/design-system/AccionFila'
import Boton from '@/components/ui/Boton'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import Estado from '@/components/ui/Estado'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { useEnLinea } from '@/hooks/useEnLinea'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { descartar, porSincronizar, reintentar, useCola, vaciarCola, type Pendiente } from '@/sincronizacion/cola'
import { formatearFechaHora } from '@/utils/formato'
import estilos from './Pendientes.module.css'

const TITULO = 'Pendientes de sincronizar'

function estadoDe(p: Pendiente, usuarioId: number | null) {
  if (p.usuario_id !== usuarioId)
    return <Estado tono="neutro" texto="De otro usuario" ayuda="Se enviará cuando esa persona inicie sesión" />
  if (p.estado === 'rechazada') return <Estado tono="error" texto="Rechazada" />
  if (p.estado === 'enviando') return <Estado tono="info" texto="Enviando" />
  return <Estado tono="aviso" texto="Pendiente" />
}

export default function PendientesPage() {
  usePaginaActual(TITULO, [{ texto: TITULO }])
  const cola = useCola()
  const enLinea = useEnLinea()
  const sesion = useSesionActiva()
  const usuarioId = sesion?.usuario.id ?? null
  const [porDescartar, setPorDescartar] = useState<Pendiente | null>(null)
  const filas = porSincronizar(cola)

  const columnas: ColumnaTabla<Pendiente>[] = [
    { clave: 'descripcion', titulo: 'Operación', multilinea: true },
    { clave: 'creado_en', titulo: 'Registrada', render: (p) => formatearFechaHora(p.creado_en) },
    { clave: 'estado', titulo: 'Estado', render: (p) => estadoDe(p, usuarioId) },
    { clave: 'error', titulo: 'Detalle', multilinea: true, render: (p) => p.error ?? '—' },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      tituloOculto: true,
      render: (p) =>
        p.estado === 'rechazada' && p.usuario_id === usuarioId ? (
          <AccionesFila>
            <AccionFila
              icono="refresh"
              nombre="Reintentar"
              etiqueta={`Reintentar ${p.descripcion}`}
              onClick={() => void reintentar(p.id).then(() => (usuarioId === null ? undefined : vaciarCola(usuarioId)))}
            />
            <AccionFila
              icono="trash"
              nombre="Descartar"
              etiqueta={`Descartar ${p.descripcion}`}
              tono="peligro"
              onClick={() => setPorDescartar(p)}
            />
          </AccionesFila>
        ) : null,
    },
  ]

  return (
    <div className={estilos.pagina}>
      <TablaDatos
        titulo={TITULO}
        columnas={columnas}
        filas={filas}
        claveFila={(p) => p.id}
        vacio={{
          icono: 'circle-check',
          titulo: 'Todo está sincronizado',
          descripcion: 'No queda nada por enviar desde este dispositivo.',
        }}
        estado={filas.length === 0 ? 'vacio' : 'exito'}
      />
      {enLinea && usuarioId !== null && filas.some((p) => p.estado === 'pendiente') && (
        <div>
          <Boton variante="secundario" onClick={() => void vaciarCola(usuarioId)} cargando={cola.enviando}>
            Enviar ahora
          </Boton>
        </div>
      )}
      <DialogoConfirmacion
        abierto={porDescartar !== null}
        titulo="¿Descartar esta operación?"
        consecuencia={`«${porDescartar?.descripcion ?? ''}» no se enviará y se borrará de este dispositivo, junto con lo que dependa de ella. No se puede deshacer.`}
        textoConfirmar="Descartar"
        variante="destructivo"
        onConfirmar={() => {
          if (porDescartar) void descartar(porDescartar.id)
          setPorDescartar(null)
        }}
        onCancelar={() => setPorDescartar(null)}
      />
    </div>
  )
}
