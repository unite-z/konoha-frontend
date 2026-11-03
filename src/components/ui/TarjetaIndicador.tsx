/**
 * TarjetaIndicador: componente «Indicador» del sistema de diseño de Figma (DESIGN.md, 4.1).
 *
 * Anatomía: etiqueta, valor principal, unidad y contexto, insignia de estado opcional, barra de avance
 * opcional y enlace opcional al detalle.
 *
 * Estados:
 * - `normal`;
 * - `alerta`: borde de error y, obligatoriamente, un `Estado` con la causa (nunca solo el color);
 * - `sinDatos`: el valor se sustituye por «Sin datos» y el motivo. Nunca se muestra un cero;
 * - `cargando`: esqueleto sin animación.
 *
 * Se agrupan en filas de 3 a 4 tarjetas con `FilaTarjetas`.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import Badge, { type BadgeProps } from './Badge'
import BarraAvance, { type BarraAvanceProps } from './BarraAvance'
import Icono from './Icono'
import estilos from './TarjetaIndicador.module.css'

export type EstadoTarjeta = 'normal' | 'alerta' | 'sinDatos' | 'cargando'

export interface TarjetaIndicadorProps {
  etiqueta: string
  /** Valor principal ya formateado. */
  valor?: ReactNode
  unidad?: string
  /** Texto de contexto bajo el valor. */
  contexto?: ReactNode
  /** Estado del indicador (se pinta como `Estado`). Obligatorio en estado `alerta`. */
  insignia?: BadgeProps
  avance?: BarraAvanceProps
  enlace?: { texto: string; a: string }
  estado?: EstadoTarjeta
  /** Motivo por el que no hay datos (estado `sinDatos`). */
  motivoSinDatos?: string
}

/** Texto que sustituye al valor cuando no hay datos. */
const TEXTO_SIN_DATOS = 'Sin datos'

export default function TarjetaIndicador({
  etiqueta,
  valor,
  unidad,
  contexto,
  insignia,
  avance,
  enlace,
  estado = 'normal',
  motivoSinDatos,
}: TarjetaIndicadorProps) {
  if (estado === 'cargando') {
    return (
      <div className={estilos.tarjeta} aria-busy="true">
        <p className={estilos.etiqueta}>{etiqueta}</p>
        <div className={`${estilos.esqueleto} ${estilos.esqueletoValor}`} />
        <div className={`${estilos.esqueleto} ${estilos.esqueletoContexto}`} />
      </div>
    )
  }

  const sinDatos = estado === 'sinDatos'
  return (
    <div className={`${estilos.tarjeta} ${estado === 'alerta' ? estilos.alerta : ''}`}>
      <p className={estilos.etiqueta}>{etiqueta}</p>
      {sinDatos ? (
        <>
          <p className={`${estilos.valor} ${estilos.sinDatos}`}>{TEXTO_SIN_DATOS}</p>
          {motivoSinDatos && <p className={estilos.contexto}>{motivoSinDatos}</p>}
        </>
      ) : (
        <>
          <p className={`${estilos.valor} cifra`}>
            {valor}
            {unidad && <span className={estilos.unidad}> {unidad}</span>}
          </p>
          {contexto && <p className={estilos.contexto}>{contexto}</p>}
        </>
      )}
      {insignia && (
        <div className={estilos.insignia}>
          <Badge {...insignia} />
        </div>
      )}
      {avance && !sinDatos && <BarraAvance {...avance} />}
      {enlace && (
        <Link to={enlace.a} className={estilos.enlace}>
          {enlace.texto}
          <Icono nombre="chevron-right" tamano="base" />
        </Link>
      )}
    </div>
  )
}

/** Fila de 3 a 4 tarjetas de indicador. */
export function FilaTarjetas({ children, etiqueta }: { children: ReactNode; etiqueta?: string }) {
  return (
    <div className={estilos.fila} role={etiqueta ? 'group' : undefined} aria-label={etiqueta}>
      {children}
    </div>
  )
}
