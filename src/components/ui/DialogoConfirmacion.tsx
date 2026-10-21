/**
 * DialogoConfirmacion: Guía de Estilo Web, sección 5.10.
 *
 * Para acciones con efecto formal o irreversible. Título con la acción, la consecuencia en una frase y dos
 * botones: «Cancelar» (secundario) y la acción con su nombre (primario o destructivo).
 *
 * Usa `<dialog>` nativo con `showModal()`: el resto de la página queda inerte, así que el foco no sale del
 * diálogo; Esc lo cierra y, al cerrarse, el foco vuelve al botón que lo abrió.
 * `children` permite añadir un campo (por ejemplo, el motivo del rechazo).
 */
import { useEffect, useId, useRef, type ReactNode } from 'react'
import Boton from './Boton'
import estilos from './DialogoConfirmacion.module.css'

export interface DialogoConfirmacionProps {
  abierto: boolean
  titulo: string
  /** Consecuencia de la acción, en una frase. */
  consecuencia: string
  /** Nombre de la acción (etiqueta del botón de confirmar). */
  textoConfirmar: string
  variante?: 'primario' | 'destructivo'
  cargando?: boolean
  onConfirmar: () => void
  onCancelar: () => void
  children?: ReactNode
}

export default function DialogoConfirmacion({
  abierto,
  titulo,
  consecuencia,
  textoConfirmar,
  variante = 'primario',
  cargando = false,
  onConfirmar,
  onCancelar,
  children,
}: DialogoConfirmacionProps) {
  const referencia = useRef<HTMLDialogElement>(null)
  const origenFoco = useRef<HTMLElement | null>(null)
  const idTitulo = useId()
  const idConsecuencia = useId()

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
    // Al cerrarse (también con Esc), el foco vuelve al botón que lo abrió.
    const alCerrar = () => {
      origenFoco.current?.focus()
      origenFoco.current = null
    }
    dialogo.addEventListener('close', alCerrar)
    return () => dialogo.removeEventListener('close', alCerrar)
  }, [])

  return (
    <dialog
      ref={referencia}
      className={estilos.dialogo}
      aria-labelledby={idTitulo}
      aria-describedby={idConsecuencia}
      onCancel={(evento) => {
        // Esc: se cierra salvo que la acción esté en curso.
        evento.preventDefault()
        if (!cargando) onCancelar()
      }}
    >
      <h2 id={idTitulo} className={estilos.titulo}>
        {titulo}
      </h2>
      <p id={idConsecuencia} className={estilos.consecuencia}>
        {consecuencia}
      </p>
      {children && <div className={estilos.contenido}>{children}</div>}
      <div className={estilos.acciones}>
        <Boton variante="secundario" onClick={onCancelar} deshabilitado={cargando}>
          Cancelar
        </Boton>
        <Boton variante={variante} onClick={onConfirmar} cargando={cargando}>
          {textoConfirmar}
        </Boton>
      </div>
    </dialog>
  )
}
