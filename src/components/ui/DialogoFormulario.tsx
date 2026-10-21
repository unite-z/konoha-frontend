/**
 * DialogoFormulario: formulario en un diálogo modal (Guía Web 5.10 y 5.3).
 *
 * - `<dialog>` nativo con `showModal()`: el resto de la página queda inerte; Esc cierra.
 * - Al abrir, el foco va al primer campo; al cerrar, vuelve al botón que lo abrió (o al contenido principal si
 *   ese botón ya no existe, por ejemplo porque la acción cambió el estado).
 * - Con cambios sin guardar, cerrar pide confirmar el descarte dentro del mismo diálogo.
 * - Mientras envía no se puede cerrar ni volver a enviar (el botón primario queda en «cargando»).
 * - `error`: aviso sobre el formulario (errores del servidor que no son de un campo).
 */
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import AvisoEnLinea from './AvisoEnLinea'
import Boton from './Boton'
import { LeyendaObligatorio } from './CampoFormulario'
import estilos from './DialogoFormulario.module.css'

export interface DialogoFormularioProps {
  abierto: boolean
  titulo: string
  /** Contexto breve bajo el título. */
  descripcion?: ReactNode
  /** Nombre de la acción (botón primario). */
  textoConfirmar: string
  enviando?: boolean
  /** Hay datos escritos que se perderían al cerrar. */
  hayCambios?: boolean
  /** Error general del envío (por ejemplo, el `detalle` del back-end). */
  error?: { titulo: string; detalle: string } | null
  ancho?: 'normal' | 'amplio'
  /** Muestra la leyenda «* Campo obligatorio». */
  conObligatorios?: boolean
  onEnviar: () => void
  onCerrar: () => void
  children: ReactNode
}

export default function DialogoFormulario({
  abierto,
  titulo,
  descripcion,
  textoConfirmar,
  enviando = false,
  hayCambios = false,
  error,
  ancho = 'normal',
  conObligatorios = true,
  onEnviar,
  onCerrar,
  children,
}: DialogoFormularioProps) {
  const referencia = useRef<HTMLDialogElement>(null)
  const origenFoco = useRef<HTMLElement | null>(null)
  const idTitulo = useId()
  const idDescripcion = useId()
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false)

  // Al cerrarse el diálogo se olvida la confirmación pendiente (ajuste durante el render).
  const [abiertoPrevio, setAbiertoPrevio] = useState(abierto)
  if (abiertoPrevio !== abierto) {
    setAbiertoPrevio(abierto)
    if (!abierto) setConfirmandoDescarte(false)
  }

  useEffect(() => {
    const dialogo = referencia.current
    if (!dialogo) return
    if (abierto && !dialogo.open) {
      origenFoco.current = document.activeElement as HTMLElement | null
      dialogo.showModal()
      dialogo.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea')?.focus()
    } else if (!abierto && dialogo.open) {
      dialogo.close()
    }
  }, [abierto])

  useEffect(() => {
    const dialogo = referencia.current
    if (!dialogo) return
    // Devuelve el foco una sola vez, tanto al cerrarse como al desmontarse abierto.
    const restaurarFoco = () => {
      const origen = origenFoco.current
      if (!origen) return
      origenFoco.current = null
      if (origen.isConnected) origen.focus()
      else document.getElementById('contenido')?.focus()
    }
    // El evento `close` llega en otra tarea: si el diálogo ya se volvió a abrir (doble montaje de StrictMode),
    // se ignora para no consumir el origen del foco de la apertura vigente.
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

  function pedirCierre() {
    if (enviando) return
    if (hayCambios && !confirmandoDescarte) setConfirmandoDescarte(true)
    else onCerrar()
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    setConfirmandoDescarte(false)
    onEnviar()
  }

  return (
    <dialog
      ref={referencia}
      className={`${estilos.dialogo} ${ancho === 'amplio' ? estilos.amplio : ''}`}
      aria-labelledby={idTitulo}
      aria-describedby={descripcion ? idDescripcion : undefined}
      onCancel={(evento) => {
        evento.preventDefault()
        pedirCierre()
      }}
    >
      <form className={estilos.formulario} onSubmit={enviar} noValidate aria-busy={enviando || undefined}>
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

        <div className={estilos.cuerpo}>
          {conObligatorios && <LeyendaObligatorio />}
          {error && (
            <AvisoEnLinea tono="error" titulo={error.titulo}>
              {error.detalle}
            </AvisoEnLinea>
          )}
          {children}
        </div>

        {confirmandoDescarte ? (
          <div className={estilos.descarte} role="alert">
            <p>Tienes cambios sin registrar. ¿Quieres descartarlos?</p>
            <div className={estilos.acciones}>
              <Boton variante="secundario" onClick={() => setConfirmandoDescarte(false)}>
                Seguir editando
              </Boton>
              <Boton variante="destructivo" onClick={onCerrar}>
                Descartar cambios
              </Boton>
            </div>
          </div>
        ) : (
          <div className={estilos.acciones}>
            <Boton variante="secundario" onClick={pedirCierre} deshabilitado={enviando}>
              Cancelar
            </Boton>
            <Boton type="submit" cargando={enviando}>
              {textoConfirmar}
            </Boton>
          </div>
        )}
      </form>
    </dialog>
  )
}
