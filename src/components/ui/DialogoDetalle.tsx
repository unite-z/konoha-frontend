/**
 * DialogoDetalle: «Diálogo · detalle» del sistema (DESIGN.md, 4.1). Modal de solo lectura con el mismo
 * comportamiento que DialogoFormulario: `<dialog>` nativo con `showModal()`, Esc cierra y el foco vuelve al
 * botón que lo abrió. En móvil ocupa toda la pantalla.
 *
 * `lateral`: panel a la derecha a toda la altura, con X de cierre y línea bajo la cabecera, como «Historial de
 * cambios» de Figma (367-3527). Entra y sale con la animación lateral.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react'
import Boton from './Boton'
import animacion from './AnimacionDialogo.module.css'
import estilos from './DialogoDetalle.module.css'
import { useCierreAnimado } from './useCierreAnimado'

export interface DialogoDetalleProps {
  abierto: boolean
  titulo: string
  /** Contexto breve bajo el título. */
  descripcion?: ReactNode
  onCerrar: () => void
  /** Panel lateral (Figma 367-3527) en lugar de diálogo centrado. */
  lateral?: boolean
  children: ReactNode
}

export default function DialogoDetalle({ abierto, titulo, descripcion, onCerrar, lateral = false, children }: DialogoDetalleProps) {
  const referencia = useRef<HTMLDialogElement>(null)
  const origenFoco = useRef<HTMLElement | null>(null)
  const idTitulo = useId()
  const idDescripcion = useId()
  const { saliendo, cerrar } = useCierreAnimado(referencia, abierto, onCerrar)

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
      className={[estilos.dialogo, lateral ? estilos.lateral : '', lateral ? animacion.lateral : animacion.centrado, saliendo ? animacion.saliendo : '']
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={idTitulo}
      aria-describedby={descripcion ? idDescripcion : undefined}
      onCancel={(evento) => {
        evento.preventDefault()
        cerrar()
      }}
    >
      <div className={estilos.marco}>
        <div className={estilos.cabecera}>
          <div>
            <h2 id={idTitulo} className={estilos.titulo}>
              {titulo}
            </h2>
            {descripcion && (
              <div id={idDescripcion} className={estilos.descripcion}>
                {descripcion}
              </div>
            )}
          </div>
          {lateral && (
            <Boton variante="fantasma" compacto icono="x" onClick={cerrar}>
              <span className="sr-only">Cerrar</span>
            </Boton>
          )}
        </div>
        <div className={estilos.cuerpo}>{abierto && children}</div>
        <div className={estilos.acciones}>
          <Boton variante="secundario" onClick={cerrar}>
            Cerrar
          </Boton>
        </div>
      </div>
    </dialog>
  )
}
