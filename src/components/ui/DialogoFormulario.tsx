/**
 * DialogoFormulario: formulario en un diálogo modal (Guía Web 5.10 y 5.3).
 *
 * - `<dialog>` nativo con `showModal()`: el resto de la página queda inerte; Esc cierra.
 * - Al abrir, el foco va al primer campo; al cerrar, vuelve al botón que lo abrió (o al contenido principal si
 *   ese botón ya no existe, por ejemplo porque la acción cambió el estado).
 * - Con cambios sin guardar, cerrar pide confirmar el descarte dentro del mismo diálogo.
 * - Mientras envía no se puede cerrar ni volver a enviar (el botón primario queda en «cargando»).
 * - `error`: aviso sobre el formulario (errores del servidor que no son de un campo).
 * - `ancho="estrecho"` (440 de Figma): formularios de un solo campo, como «Registrar motivo» (373-5658).
 * - `ancho="medio"` (520 de Figma) y `conCierre`: formularios cortos con X de cierre, como «Registrar interrupción»
 *   (347-1342).
 * - `ancho="lateral"`: panel a la derecha a toda la altura («Formulario en panel lateral», DESIGN.md 5), con el cuerpo
 *   desplazable y las acciones abajo.
 * - `ancho="hoja"`: «Hoja inferior» del móvil (Figma 375-6772 y 375-6817): en móvil sale desde abajo a todo el ancho,
 *   con el asa arriba y los dos botones en una fila; en escritorio es un diálogo estrecho.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import AvisoEnLinea from './AvisoEnLinea'
import Boton from './Boton'
import { LeyendaObligatorio } from './CampoFormulario'
import animacion from './AnimacionDialogo.module.css'
import estilos from './DialogoFormulario.module.css'
import { useCierreAnimado } from './useCierreAnimado'

export interface DialogoFormularioProps {
  abierto: boolean
  titulo: string
  /** Contexto breve bajo el título. */
  descripcion?: ReactNode
  /** Junto al título, por ejemplo un `Estado` («Fuera de frecuencia» en «Programar ciclo», Figma 372-5523). */
  junto?: ReactNode
  /** Nombre de la acción (botón primario). */
  textoConfirmar: string
  /** Texto del botón secundario: «Cancelar» por defecto o «Volver» cuando el diálogo es una acción sobre el registro. */
  textoCancelar?: string
  enviando?: boolean
  /** Hay datos escritos que se perderían al cerrar. */
  hayCambios?: boolean
  /** Error general del envío (por ejemplo, el `detalle` del back-end). */
  error?: { titulo: string; detalle: string } | null
  ancho?: 'estrecho' | 'medio' | 'normal' | 'amplio' | 'lateral' | 'hoja'
  /** X de cierre en la cabecera también en un diálogo centrado (el lateral la lleva siempre). */
  conCierre?: boolean
  /** Con `hoja`: los botones a todo el ancho, el principal arriba («Ya hay una incidencia abierta», Figma 391-8469). */
  accionesApiladas?: boolean
  /**
   * Acción propia del botón secundario («Reportar igualmente»), distinta de cerrar: Esc y la X siguen llamando a
   * `onCerrar`.
   */
  onCancelar?: () => void
  /** Muestra la leyenda «* Campo obligatorio». */
  conObligatorios?: boolean
  /** Botón principal deshabilitado (por ejemplo, sin cambios o con errores a la vista, como en Figma). */
  envioDeshabilitado?: boolean
  onEnviar: () => void
  onCerrar: () => void
  /** Si se indica, mientras envía se ofrece interrumpir el envío (por ejemplo, una subida larga). */
  onCancelarEnvio?: () => void
  children: ReactNode
}

export default function DialogoFormulario({
  abierto,
  titulo,
  descripcion,
  junto,
  textoConfirmar,
  enviando = false,
  hayCambios = false,
  error,
  textoCancelar = 'Cancelar',
  ancho = 'normal',
  conCierre = false,
  accionesApiladas = false,
  onCancelar,
  conObligatorios = true,
  envioDeshabilitado = false,
  onEnviar,
  onCerrar,
  onCancelarEnvio,
  children,
}: DialogoFormularioProps) {
  const referencia = useRef<HTMLDialogElement>(null)
  const origenFoco = useRef<HTMLElement | null>(null)
  const idTitulo = useId()
  const idDescripcion = useId()
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false)
  const { saliendo, cerrar } = useCierreAnimado(referencia, abierto, onCerrar)

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
    else cerrar()
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando || envioDeshabilitado) return
    setConfirmandoDescarte(false)
    onEnviar()
  }

  return (
    <dialog
      ref={referencia}
      className={[
        estilos.dialogo,
        ancho === 'normal' ? '' : estilos[ancho],
        ancho === 'lateral' ? animacion.lateral : ancho === 'hoja' ? animacion.hoja : animacion.centrado,
        saliendo ? animacion.saliendo : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={idTitulo}
      aria-describedby={descripcion ? idDescripcion : undefined}
      onCancel={(evento) => {
        evento.preventDefault()
        pedirCierre()
      }}
    >
      <form className={estilos.formulario} onSubmit={enviar} noValidate aria-busy={enviando || undefined}>
        {ancho === 'hoja' && <span className={estilos.asa} aria-hidden="true" />}
        <div className={estilos.cabecera}>
          <div className={estilos.textosCabecera}>
            <div className={estilos.lineaTitulo}>
              <h2 id={idTitulo} className={estilos.titulo}>
                {titulo}
              </h2>
              {junto}
            </div>
            {descripcion && (
              <div id={idDescripcion} className={estilos.descripcion}>
                {descripcion}
              </div>
            )}
          </div>
          {(ancho === 'lateral' || conCierre) && (
            <Boton variante="fantasma" compacto icono="x" onClick={pedirCierre} deshabilitado={enviando}>
              <span className="sr-only">Cerrar</span>
            </Boton>
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
              <Boton variante="destructivo" onClick={cerrar}>
                Descartar cambios
              </Boton>
            </div>
          </div>
        ) : (
          <div className={`${estilos.acciones} ${accionesApiladas ? estilos.apiladas : ''}`}>
            {enviando && onCancelarEnvio ? (
              <Boton variante="secundario" onClick={onCancelarEnvio}>
                Cancelar envío
              </Boton>
            ) : (
              <Boton variante="secundario" onClick={onCancelar ?? pedirCierre} deshabilitado={enviando} className={estilos.cancelar}>
                {textoCancelar}
              </Boton>
            )}
            <Boton type="submit" cargando={enviando} deshabilitado={envioDeshabilitado}>
              {textoConfirmar}
            </Boton>
          </div>
        )}
      </form>
    </dialog>
  )
}
