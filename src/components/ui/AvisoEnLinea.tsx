/**
 * AvisoEnLinea: componente «Aviso» del sistema de diseño de Figma (DESIGN.md, 4.1).
 *
 * Aviso dentro de la página con icono y título del color del tono, explicación y acción opcional (botón fantasma).
 * Se anuncia con `role="status"` (o `role="alert"` en el tono `error`).
 */
import type { ReactNode } from 'react'
import Boton from './Boton'
import Icono, { type NombreIcono } from './Icono'
import { ICONO_TONO } from './tonos'
import estilos from './AvisoEnLinea.module.css'

export type TonoAviso = 'info' | 'exito' | 'advertencia' | 'error'

export interface AvisoEnLineaProps {
  tono: TonoAviso
  titulo?: string
  /** Explicación (texto o lista). */
  children?: ReactNode
  accion?: { texto: string; onClick: () => void }
  /** Muestra una X para descartar el aviso sin sustituir su acción principal. */
  onCerrar?: () => void
  /** Icono propio en lugar del del tono (`wifi-off` en «Sin conexión», Figma 353-2396). */
  icono?: NombreIcono
  /** Banda de una línea: menos relleno y texto pequeño («Sin conexión · 2 marcas pendientes de enviar», 353-2396). */
  compacto?: boolean
}

export default function AvisoEnLinea({
  tono,
  titulo,
  children,
  accion,
  onCerrar,
  icono,
  compacto = false,
}: AvisoEnLineaProps) {
  return (
    <div
      className={`${estilos.aviso} ${estilos[tono]} ${compacto ? estilos.compacto : ''}`}
      role={tono === 'error' ? 'alert' : 'status'}
    >
      <span className={estilos.icono}>
        <Icono nombre={icono ?? ICONO_TONO[tono]} tamano="base" />
      </span>
      <div className={estilos.cuerpo}>
        {titulo && <p className={estilos.titulo}>{titulo}</p>}
        {children && <div className={estilos.explicacion}>{children}</div>}
        {accion && (
          <div className={estilos.accion}>
            <Boton variante="fantasma" compacto onClick={accion.onClick}>
              {accion.texto}
            </Boton>
          </div>
        )}
      </div>
      {onCerrar && (
        <button type="button" className={estilos.cerrar} aria-label="Cerrar aviso" onClick={onCerrar}>
          <Icono nombre="x" tamano="base" />
        </button>
      )}
    </div>
  )
}
