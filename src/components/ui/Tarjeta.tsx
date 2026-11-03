/**
 * Tarjeta: contenedor de panel del sistema de diseño (DESIGN.md, 4.1). Figma la usa en todas las pantallas,
 * aunque aún no es componente allí (pedido a diseño en AV-356).
 *
 * Fondo de panel, borde neutro, radio lg y Sombra sm. Relleno `normal` (16px) o `amplio` (24px): el texto nunca
 * queda pegado al borde. Con `titulo` es una región con nombre (`section` + encabezado); `acciones` va a la
 * derecha del título. Sin título, `etiqueta` o `etiquetadaPor` la nombran como región. Sustituye a las
 * tarjetas que cada pantalla componía con su propio CSS.
 */
import { useId, type ReactNode } from 'react'
import estilos from './Tarjeta.module.css'

export interface TarjetaProps {
  /** Título (estilo Título tarjeta). Sin él, la tarjeta es un contenedor sin nombre. */
  titulo?: string
  /** Nivel del encabezado del título, según la jerarquía de la página. */
  nivel?: 2 | 3 | 4
  /** Texto bajo el título. */
  descripcion?: ReactNode
  /** Botones o enlaces a la derecha del título. */
  acciones?: ReactNode
  relleno?: 'normal' | 'amplio'
  /** Nombre accesible sin título visible: la tarjeta pasa a ser una región (`section` con `aria-label`). */
  etiqueta?: string
  /** Id del encabezado propio que nombra la región, cuando el título no es el estándar (`aria-labelledby`). */
  etiquetadaPor?: string
  className?: string
  children?: ReactNode
}

export default function Tarjeta({
  titulo,
  nivel = 2,
  descripcion,
  acciones,
  relleno = 'normal',
  etiqueta,
  etiquetadaPor,
  className,
  children,
}: TarjetaProps) {
  const idTitulo = useId()
  const clases = [estilos.tarjeta, estilos[relleno], className].filter(Boolean).join(' ')
  if (!titulo) {
    if (!etiqueta && !etiquetadaPor) return <div className={clases}>{children}</div>
    return (
      <section className={clases} aria-label={etiqueta} aria-labelledby={etiquetadaPor}>
        {children}
      </section>
    )
  }

  const Encabezado = (`h${nivel}` as const)
  return (
    <section className={clases} aria-labelledby={idTitulo}>
      <div className={estilos.cabecera}>
        <div className={estilos.textos}>
          <Encabezado id={idTitulo} className={estilos.titulo}>
            {titulo}
          </Encabezado>
          {descripcion && <p className={estilos.descripcion}>{descripcion}</p>}
        </div>
        {acciones && <div className={estilos.acciones}>{acciones}</div>}
      </div>
      {children}
    </section>
  )
}
