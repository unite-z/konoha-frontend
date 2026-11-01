/**
 * TarjetaFiltro: una TarjetaIndicador que también es un filtro. Un botón transparente cubre la tarjeta
 * (`aria-pressed`); activa, la tarjeta se marca con fondo y anillo verdes.
 */
import type { ReactNode } from 'react'
import estilos from './TarjetaFiltro.module.css'

export interface TarjetaFiltroProps {
  activo: boolean
  /** Nombre accesible del botón (por ejemplo, «Filtrar por personal propio»). */
  etiqueta: string
  onAlternar: () => void
  /** La TarjetaIndicador. */
  children: ReactNode
}

export default function TarjetaFiltro({ activo, etiqueta, onAlternar, children }: TarjetaFiltroProps) {
  return (
    <div className={`${estilos.tarjeta} ${activo ? estilos.activa : ''}`}>
      {children}
      <button type="button" className={estilos.boton} aria-pressed={activo} aria-label={etiqueta} onClick={onAlternar} />
    </div>
  )
}
