// RF-SER-001 · Habilitar o inhabilitar un proveedor
/**
 * Botón de la ficha del proveedor. Inhabilitar pide confirmación y explica la consecuencia (no admite contratos
 * ni atenciones nuevos; lo registrado se conserva); habilitar es inmediato. La ficha se actualiza con el
 * proveedor que devuelve el servidor, nunca con un resultado supuesto.
 */
import { useRef, useState } from 'react'
import Boton from '@/components/ui/Boton'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import { aErrorApi } from '@/services/api/cliente'
import { cambiarEstadoProveedor } from '@/services/api/maestrosTercerizados'
import type { ProveedorMaestro } from '@/types/maestrosTercerizados'

export interface AccionEstadoProveedorProps {
  proveedor: ProveedorMaestro
  onCambiado: (proveedor: ProveedorMaestro) => void
  /** Mensaje para mostrar cuando el servidor no pudo cambiar el estado. */
  onFallo: (mensaje: string) => void
}

export default function AccionEstadoProveedor({ proveedor, onCambiado, onFallo }: AccionEstadoProveedorProps) {
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const enCurso = useRef(false)

  async function aplicar(activo: boolean) {
    if (enCurso.current) return
    enCurso.current = true
    setEnviando(true)
    try {
      onCambiado(await cambiarEstadoProveedor(proveedor.id, activo))
      setConfirmando(false)
    } catch (causa) {
      const error = aErrorApi(causa)
      onFallo(
        error.estado === 403
          ? 'Tu usuario no puede cambiar el estado de los proveedores. Si cambiaron tus roles, vuelve a ingresar.'
          : error.detalle,
      )
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  if (proveedor.activo)
    return (
      <>
        <Boton variante="secundario" onClick={() => setConfirmando(true)}>
          Inhabilitar
        </Boton>
        <DialogoConfirmacion
          abierto={confirmando}
          titulo={`Inhabilitar «${proveedor.razon_social}»`}
          consecuencia="No se podrán registrar contratos ni atenciones nuevos con este proveedor. Lo ya registrado se conserva."
          textoConfirmar="Inhabilitar"
          variante="destructivo"
          cargando={enviando}
          onConfirmar={() => void aplicar(false)}
          onCancelar={() => setConfirmando(false)}
        />
      </>
    )

  return (
    <Boton variante="primario" cargando={enviando} onClick={() => void aplicar(true)}>
      Habilitar
    </Boton>
  )
}
