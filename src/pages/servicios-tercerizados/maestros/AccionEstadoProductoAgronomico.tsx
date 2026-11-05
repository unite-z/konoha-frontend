// RF-FIT-003 · Habilitar o inhabilitar un producto agronómico
/**
 * Botón de la ficha del producto. Inhabilitar pide confirmación y explica la consecuencia (no se puede
 * aplicar en atenciones nuevas; lo registrado se conserva); habilitar es inmediato. La ficha se actualiza
 * con el producto que devuelve el servidor, nunca con un resultado supuesto.
 */
import { useRef, useState } from 'react'
import Boton from '@/components/ui/Boton'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import { aErrorApi } from '@/services/api/cliente'
import { cambiarEstadoProductoAgronomico } from '@/services/api/maestrosTercerizados'
import type { ProductoAgronomico } from '@/types/maestrosTercerizados'

export interface AccionEstadoProductoAgronomicoProps {
  producto: ProductoAgronomico
  onCambiado: (producto: ProductoAgronomico) => void
  /** Mensaje para mostrar cuando el servidor no pudo cambiar el estado. */
  onFallo: (mensaje: string) => void
}

export default function AccionEstadoProductoAgronomico({ producto, onCambiado, onFallo }: AccionEstadoProductoAgronomicoProps) {
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const enCurso = useRef(false)

  async function aplicar(activo: boolean) {
    if (enCurso.current) return
    enCurso.current = true
    setEnviando(true)
    try {
      onCambiado(await cambiarEstadoProductoAgronomico(producto.id, activo))
      setConfirmando(false)
    } catch (causa) {
      const error = aErrorApi(causa)
      onFallo(
        error.estado === 403
          ? 'Tu usuario no puede cambiar el estado de los productos. Si cambiaron tus roles, vuelve a ingresar.'
          : error.detalle,
      )
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  if (producto.activo)
    return (
      <>
        <Boton variante="secundario" onClick={() => setConfirmando(true)}>
          Inhabilitar
        </Boton>
        <DialogoConfirmacion
          abierto={confirmando}
          titulo={`Inhabilitar «${producto.nombre}»`}
          consecuencia="No se podrá aplicar en atenciones nuevas. Lo ya registrado se conserva."
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
