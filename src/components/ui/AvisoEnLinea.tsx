/**
 * AvisoEnLinea: Guía de Estilo Web, sección 5.10.
 *
 * Aviso dentro de la página con icono del tono, título, explicación y acción opcional (botón terciario).
 * Se anuncia con `role="status"` (o `role="alert"` en el tono `error`).
 */
import type { ReactNode } from 'react'
import Boton from './Boton'
import Icono from './Icono'
import { ICONO_TONO } from './tonos'
import estilos from './AvisoEnLinea.module.css'

export type TonoAviso = 'info' | 'exito' | 'advertencia' | 'error'

export interface AvisoEnLineaProps {
  tono: TonoAviso
  titulo?: string
  /** Explicación (texto o lista). */
  children?: ReactNode
  accion?: { texto: string; onClick: () => void }
}

export default function AvisoEnLinea({ tono, titulo, children, accion }: AvisoEnLineaProps) {
  return (
    <div className={`${estilos.aviso} ${estilos[tono]}`} role={tono === 'error' ? 'alert' : 'status'}>
      <span className={estilos.icono}>
        <Icono nombre={ICONO_TONO[tono]} />
      </span>
      <div className={estilos.cuerpo}>
        {titulo && <p className={estilos.titulo}>{titulo}</p>}
        {children && <div className={estilos.explicacion}>{children}</div>}
        {accion && (
          <div className={estilos.accion}>
            <Boton variante="terciario" compacto onClick={accion.onClick}>
              {accion.texto}
            </Boton>
          </div>
        )}
      </div>
    </div>
  )
}
