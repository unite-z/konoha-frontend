/**
 * PanelLateral (RD-09): panel de vidrio denso a la derecha del mapa, con cabecera, pestañas con lente, cuerpo con
 * scroll, pie de acciones y modo edición. En móvil (< 768 px) es una hoja inferior a pantalla completa.
 *
 * Su apertura la lleva la URL (`useParametroPanel`): el módulo pasa `abierto={valor !== null}` y `onCerrar={cerrar}`.
 * `historial` y `adjuntos` añaden las pestañas comunes «Historial» y «Adjuntos» sin código en el módulo; `children`
 * va siempre en el cuerpo, encima del contenido de la pestaña activa.
 * Esc con el foco en el panel lo cierra, salvo en modo edición (no se pierde lo escrito) o si viene de un `<dialog>`
 * abierto dentro. Al cerrar, el foco vuelve a quien lo abrió. En la hoja móvil (modal) el Tab no sale del panel.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import Adjuntos, { type AdjuntosProps } from '@/components/core/Adjuntos'
import HistorialCambios from '@/components/core/HistorialCambios'
import Boton from '@/design-system/Boton'
import type { EntidadRegistro } from '@/types/core'
import estilos from './PanelLateral.module.css'
import { useEsMovil } from './useEsMovil'

export interface PestanaPanel {
  valor: string
  texto: string
  contenido: ReactNode
}

export interface PanelLateralProps {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  subtitulo?: ReactNode
  /** Pestañas propias del módulo; sin ellas (ni secciones comunes) el cuerpo es `children`. */
  pestanas?: PestanaPanel[]
  /** Sección común «Historial» (`HistorialCambios`). */
  historial?: { entidad: EntidadRegistro; registroId: number }
  /** Sección común «Adjuntos» (`Adjuntos`, con su cola sin conexión). */
  adjuntos?: AdjuntosProps
  /** Acciones del pie (Guardar, Cancelar…). */
  pie?: ReactNode
  /** Modo edición: marca el panel, avisa en la cabecera y Esc deja de cerrarlo. */
  editando?: boolean
  /** Nombre de la transición de vista para el morph fila → panel. */
  viewTransitionName?: string
  children?: ReactNode
}

export default function PanelLateral(props: PanelLateralProps) {
  const { abierto, onCerrar, titulo, subtitulo, pestanas = [], historial, adjuntos } = props
  const { pie, editando = false, viewTransitionName, children } = props
  const esMovil = useEsMovil()
  const idTitulo = useId()
  const base = useId()
  const panel = useRef<HTMLElement>(null)
  const origenFoco = useRef<HTMLElement | null>(null)
  const botones = useRef<(HTMLButtonElement | null)[]>([])
  const [elegida, setElegida] = useState<string | null>(null)

  const todas: PestanaPanel[] = [
    ...pestanas,
    ...(historial ? [{ valor: 'historial', texto: 'Historial', contenido: <HistorialCambios {...historial} /> }] : []),
    ...(adjuntos ? [{ valor: 'adjuntos', texto: 'Adjuntos', contenido: <Adjuntos {...adjuntos} /> }] : []),
  ]
  const activa = todas.find((p) => p.valor === elegida) ?? todas[0]

  // Foco: entra al panel al abrirlo y vuelve al origen al cerrarlo.
  useEffect(() => {
    if (!abierto) return
    origenFoco.current = document.activeElement as HTMLElement | null
    panel.current?.focus()
    return () => {
      const origen = origenFoco.current
      origenFoco.current = null
      if (origen?.isConnected) origen.focus()
    }
  }, [abierto])

  if (!abierto) return null

  function tecladoPanel(evento: KeyboardEvent<HTMLElement>) {
    // Las teclas de un `<dialog>` abierto dentro (VentanaFlotante) son suyas: ni Esc cierra el panel ni su Tab se desvía.
    if ((evento.target as Element).closest('dialog')) return
    if (evento.key === 'Escape') {
      if (!editando && !evento.defaultPrevented) onCerrar()
      return
    }
    if (evento.key !== 'Tab' || !esMovil || !panel.current) return
    const enfocables = Array.from(
      panel.current.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]'),
    ).filter((e) => e.tabIndex >= 0 && !e.matches(':disabled'))
    if (enfocables.length === 0) return
    const primero = enfocables[0]
    const ultimo = enfocables[enfocables.length - 1]
    const activo = document.activeElement
    if (evento.shiftKey ? activo === primero || activo === panel.current : activo === ultimo) {
      evento.preventDefault()
      ;(evento.shiftKey ? ultimo : primero).focus()
    }
  }

  function tecladoPestana(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const paso = evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : 0
    if (paso === 0) return
    evento.preventDefault()
    const destino = (indice + paso + todas.length) % todas.length
    botones.current[destino]?.focus()
    setElegida(todas[destino].valor)
  }

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- el contenedor recoge Esc y Tab de sus controles (patrón de diálogo de WAI-ARIA)
    <aside
      ref={panel}
      tabIndex={-1}
      role={esMovil ? 'dialog' : 'complementary'}
      aria-modal={esMovil ? true : undefined}
      aria-labelledby={idTitulo}
      data-presentacion={esMovil ? 'hoja' : 'lateral'}
      data-editando={editando || undefined}
      className={estilos.panel}
      onKeyDown={tecladoPanel}
      // El módulo pasa `panel(id)` de base/movimiento para el morph fila → panel.
      style={viewTransitionName ? { viewTransitionName } : undefined} // estilo-calculado
    >
      <header className={estilos.cabecera}>
        <div className={estilos.titulos}>
          <h2 id={idTitulo} className={estilos.titulo}>
            {titulo}
          </h2>
          {(subtitulo || editando) && (
            <div className={estilos.subtitulo}>
              {editando && <span className={estilos.etiquetaEdicion}>Editando</span>} {subtitulo}
            </div>
          )}
        </div>
        <Boton variante="fantasma" compacto icono="x" onClick={onCerrar}>
          <span className="sr-only">Cerrar panel</span>
        </Boton>
      </header>

      {todas.length > 0 && (
        <div role="tablist" aria-label={`Secciones de ${titulo}`} className={estilos.pestanas}>
          {todas.map((p, indice) => (
            // Excepción al sistema (AV-351): pestaña con lente de vidrio, patrón tabs de WAI-ARIA.
            <button
              key={p.valor}
              ref={(e) => {
                botones.current[indice] = e
              }}
              type="button"
              role="tab"
              id={`${base}-${p.valor}`}
              aria-selected={p === activa}
              aria-controls={`${base}-cuerpo`}
              tabIndex={p === activa ? 0 : -1}
              className={`${estilos.pestana} ${p === activa ? estilos.lente : ''}`}
              onClick={() => setElegida(p.valor)}
              onKeyDown={(e) => tecladoPestana(e, indice)}
            >
              {p.texto}
            </button>
          ))}
        </div>
      )}

      <div
        id={`${base}-cuerpo`}
        role={todas.length > 0 ? 'tabpanel' : undefined}
        aria-labelledby={activa ? `${base}-${activa.valor}` : undefined}
        className={estilos.cuerpo}
      >
        {children}
        {activa?.contenido}
      </div>

      {pie && <footer className={estilos.pie}>{pie}</footer>}
    </aside>
  )
}
