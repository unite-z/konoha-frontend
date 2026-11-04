/**
 * DialogoConfirmacion: componente «Diálogo · confirmación» del sistema de diseño de Figma (DESIGN.md, 4.1).
 *
 * Para acciones con efecto formal o irreversible. Título con la acción y su objeto («Cancelar CC-2026-11»),
 * la consecuencia en una frase y dos botones: «Volver» (secundario) y la acción con su nombre (primario o
 * destructivo). «Volver» evita confundir la salida con acciones como «Cancelar ciclo».
 *
 * Usa `<dialog>` nativo con `showModal()`: el resto de la página queda inerte, así que el foco no sale del
 * diálogo; Esc lo cierra y, al cerrarse, el foco vuelve al botón que lo abrió.
 * `children` permite añadir un campo (por ejemplo, el motivo del rechazo).
 */
import { useEffect, useId, useRef, type ReactNode } from 'react'
import Boton from './Boton'
import animacion from './AnimacionDialogo.module.css'
import estilos from './DialogoConfirmacion.module.css'
import { useCierreAnimado } from './useCierreAnimado'

export interface DialogoConfirmacionProps {
  abierto: boolean
  titulo: string
  /** Consecuencia de la acción, en una frase (sin ella, solo el título y el campo, como «Descartar», 394-8700). */
  consecuencia?: string
  /** Nombre de la acción (etiqueta del botón de confirmar). */
  textoConfirmar: string
  /** Etiqueta del botón que cierra sin hacer nada. */
  textoVolver?: string
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
  textoVolver = 'Volver',
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
  const { saliendo, cerrar } = useCierreAnimado(referencia, abierto, onCancelar)

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
      className={[estilos.dialogo, animacion.centrado, saliendo ? animacion.saliendo : ''].filter(Boolean).join(' ')}
      aria-labelledby={idTitulo}
      aria-describedby={consecuencia ? idConsecuencia : undefined}
      onCancel={(evento) => {
        // Esc: se cierra salvo que la acción esté en curso.
        evento.preventDefault()
        if (!cargando) cerrar()
      }}
    >
      <h2 id={idTitulo} className={estilos.titulo}>
        {titulo}
      </h2>
      {consecuencia && (
        <p id={idConsecuencia} className={estilos.consecuencia}>
          {consecuencia}
        </p>
      )}
      {children && <div className={estilos.contenido}>{children}</div>}
      <div className={estilos.acciones}>
        <Boton variante="secundario" onClick={cerrar} deshabilitado={cargando}>
          {textoVolver}
        </Boton>
        <Boton variante={variante} onClick={onConfirmar} cargando={cargando}>
          {textoConfirmar}
        </Boton>
      </div>
    </dialog>
  )
}
