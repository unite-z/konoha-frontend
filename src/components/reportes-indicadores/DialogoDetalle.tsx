/**
 * DialogoDetalle: diálogo modal de solo lectura (Guía Web 5.10), con el mismo comportamiento que
 * DialogoFormulario: `<dialog>` nativo con `showModal()`, Esc cierra y el foco vuelve al botón que lo abrió.
 * En móvil ocupa toda la pantalla.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react'
import Boton from '../ui/Boton'
import estilos from './DialogoDetalle.module.css'

export interface DialogoDetalleProps {
  abierto: boolean
  titulo: string
  /** Contexto breve bajo el título. */
  descripcion?: ReactNode
  onCerrar: () => void
  children: ReactNode
}

export default function DialogoDetalle({ abierto, titulo, descripcion, onCerrar, children }: DialogoDetalleProps) {
  const referencia = useRef<HTMLDialogElement>(null)
  const origenFoco = useRef<HTMLElement | null>(null)
  const idTitulo = useId()
  const idDescripcion = useId()

  useEffect(() => {
    const dialogo = referencia.current
    if (!dialogo) return
    if (abierto && !dialogo.open) {
      origenFoco.current = document.activeElement as HTMLElement | null
      dialogo.showModal()
    } else if (!abierto && dialogo.open) {
      dialogo.close()
    }
  }, [abierto])

  useEffect(() => {
    const dialogo = referencia.current
    if (!dialogo) return
    const restaurarFoco = () => {
      const origen = origenFoco.current
      if (!origen) return
      origenFoco.current = null
      if (origen.isConnected) origen.focus()
      else document.getElementById('contenido')?.focus()
    }
    const alCerrar = () => {
      if (!dialogo.open) restaurarFoco()
    }
    dialogo.addEventListener('close', alCerrar)
    return () => {
      dialogo.removeEventListener('close', alCerrar)
      if (dialogo.open) dialogo.close()
      restaurarFoco()
    }
  }, [])

  return (
    <dialog
      ref={referencia}
      className={estilos.dialogo}
      aria-labelledby={idTitulo}
      aria-describedby={descripcion ? idDescripcion : undefined}
      onCancel={(evento) => {
        evento.preventDefault()
        onCerrar()
      }}
    >
      <div className={estilos.marco}>
        <div className={estilos.cabecera}>
          <h2 id={idTitulo} className={estilos.titulo}>
            {titulo}
          </h2>
          {descripcion && (
            <div id={idDescripcion} className={estilos.descripcion}>
              {descripcion}
            </div>
          )}
        </div>
        <div className={estilos.cuerpo}>{abierto && children}</div>
        <div className={estilos.acciones}>
          <Boton variante="secundario" onClick={onCerrar}>
            Cerrar
          </Boton>
        </div>
      </div>
    </dialog>
  )
}
