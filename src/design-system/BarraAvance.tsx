/**
 * BarraAvance: barra horizontal de 8px usada en tarjetas y tablas (como en el panel ejecutivo del mockup).
 * Es el único gráfico que define la guía. Relleno verde, o rojo en estado de alerta.
 */
import estilos from './BarraAvance.module.css'

export interface BarraAvanceProps {
  valor: number
  maximo: number
  /** Nombre accesible de la barra (por ejemplo, «Días de ejecución frente al máximo»). */
  etiqueta: string
  /** Texto accesible del valor (por ejemplo, «5 de 4»). */
  textoValor?: string
  alerta?: boolean
}

export default function BarraAvance({ valor, maximo, etiqueta, textoValor, alerta = false }: BarraAvanceProps) {
  const porcentaje = maximo > 0 ? Math.min(100, Math.max(0, (valor / maximo) * 100)) : 0
  return (
    <div
      className={estilos.barra}
      role="progressbar"
      aria-label={etiqueta}
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuetext={textoValor}
    >
      <div
        className={`${estilos.relleno} ${alerta ? estilos.alerta : ''}`}
        style={{ width: `${porcentaje}%` }}
      />
    </div>
  )
}
