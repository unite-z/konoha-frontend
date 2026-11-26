/**
 * VentanaFlotante (RD-09): ventana de vidrio sobre el mapa que se abre sin cerrar el `PanelLateral` (el panel queda
 * debajo, inerte mientras la ventana está abierta). `<dialog>` modal: el foco queda atrapado, Esc cierra y el foco vuelve
 * al elemento que la abrió. Puede ir dentro de los `children` del panel: el panel no reacciona a sus teclas.
 * Reutiliza `AnimacionDialogo` y `useCierreAnimado` (con «reducir movimiento», sin animación y cierre inmediato).
 */
import { useEffect, useId, useRef, type ReactNode } from 'react'
import Boton from '@/design-system/Boton'
import animacion from '@/design-system/AnimacionDialogo.module.css'
import { useCierreAnimado } from '@/design-system/useCierreAnimado'
import estilos from './VentanaFlotante.module.css'

export interface VentanaFlotanteProps {
  abierto: boolean
  titulo: string
  descripcion?: ReactNode
  onCerrar: () => void
  children: ReactNode
}

export default function VentanaFlotante({ abierto, titulo, descripcion, onCerrar, children }: VentanaFlotanteProps) {
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
      origenFoco.current = null
      if (origen?.isConnected) origen.focus()
    }
    dialogo.addEventListener('close', restaurarFoco)
    // Si el módulo la desmonta abierta, el foco también vuelve al origen.
    return () => {
      dialogo.removeEventListener('close', restaurarFoco)
      if (dialogo.open) dialogo.close()
      restaurarFoco()
    }
  }, [])

  return (
    // Excepción al sistema (AV-351): ventana de vidrio propia del rediseño; reutiliza la animación y el cierre del diálogo.
    <dialog
      ref={referencia}
      className={[estilos.ventana, animacion.centrado, saliendo ? animacion.saliendo : ''].filter(Boolean).join(' ')}
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
          <Boton variante="fantasma" compacto icono="x" onClick={cerrar}>
            <span className="sr-only">Cerrar ventana</span>
          </Boton>
        </div>
        <div className={estilos.cuerpo}>{abierto && children}</div>
      </div>
    </dialog>
  )
}
