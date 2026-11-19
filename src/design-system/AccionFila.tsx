/**
 * AccionFila (AV-390): acción de una fila de tabla como botón de solo icono, con una burbuja que dice qué hace al
 * pasar el cursor o al llegar con el teclado. Sustituye a los botones con texto («Ver», «Editar», «Descargar»…),
 * que alargaban las filas.
 *
 * - `nombre`: lo que pone la burbuja («Editar»). `etiqueta`: el nombre accesible, con el objeto de la fila
 *   («Editar Canteo»); por defecto, `nombre`. `descripcion`: una línea más en la burbuja, que se lee como
 *   descripción.
 * - La burbuja se sitúa con `position: fixed` sobre el botón (debajo si no cabe arriba), para que el contenedor con
 *   desplazamiento de la tabla no la recorte. Se cierra al salir el cursor, al perder el foco y con Escape.
 * - `tono="peligro"` para acciones destructivas (dar de baja, descartar). Deshabilitada: sigue recibiendo el foco
 *   para que la burbuja explique el motivo (`descripcion`).
 * - `AccionFilaEnlace` tiene el mismo aspecto, pero navega.
 */
import { useId, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref } from 'react'
import { Link, type LinkProps } from 'react-router'
import Icono, { type NombreIcono } from './Icono'
import estilos from './AccionFila.module.css'

interface PropsComunes {
  icono: NombreIcono
  /** Texto de la burbuja: la acción con verbo («Editar», «Ver en el mapa»). */
  nombre: string
  /** Nombre accesible con el objeto de la fila («Editar Canteo»). Por defecto, `nombre`. */
  etiqueta?: string
  /** Una línea más en la burbuja, para explicar la acción o por qué está deshabilitada. */
  descripcion?: string
  tono?: 'normal' | 'peligro'
}

export interface AccionFilaProps extends PropsComunes {
  onClick: (evento: MouseEvent<HTMLButtonElement>) => void
  deshabilitado?: boolean
  cargando?: boolean
}

export interface AccionFilaEnlaceProps extends PropsComunes, Omit<LinkProps, 'children' | 'className'> {}

/** Estado y eventos de la burbuja, comunes al botón y al enlace. */
function useBurbuja() {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const burbuja = useRef<HTMLSpanElement>(null)

  function mostrar(evento: { currentTarget: HTMLElement }) {
    const caja = evento.currentTarget.getBoundingClientRect()
    const nodo = burbuja.current
    if (nodo) {
      nodo.style.setProperty('--burbuja-x', `${caja.left + caja.width / 2}px`)
      nodo.style.setProperty('--burbuja-arriba', `${caja.top}px`)
      nodo.style.setProperty('--burbuja-abajo', `${caja.bottom}px`)
      // Sin sitio arriba (primera fila pegada al borde de la ventana): debajo del botón.
      nodo.dataset.debajo = caja.top < 64 ? 'si' : ''
    }
    setVisible(true)
  }
  const ocultar = () => setVisible(false)
  const eventos = {
    onMouseEnter: mostrar,
    onMouseLeave: ocultar,
    onFocus: mostrar,
    onBlur: ocultar,
    onKeyDown: (evento: KeyboardEvent<HTMLElement>) => {
      if (evento.key === 'Escape') ocultar()
    },
  }
  return { id, visible, burbuja, eventos }
}

function Burbuja({
  id,
  visible,
  nombre,
  descripcion,
  referencia,
}: {
  id: string
  visible: boolean
  nombre: string
  descripcion?: string
  referencia: Ref<HTMLSpanElement>
}) {
  return (
    <span ref={referencia} id={id} role="tooltip" className={estilos.burbuja} data-visible={visible || undefined}>
      <span className={estilos.nombre}>{nombre}</span>
      {descripcion && <span className={estilos.descripcion}>{descripcion}</span>}
    </span>
  )
}

function clases(tono: PropsComunes['tono']) {
  return [estilos.boton, tono === 'peligro' && estilos.peligro].filter(Boolean).join(' ')
}

export default function AccionFila({
  icono,
  nombre,
  etiqueta,
  descripcion,
  tono = 'normal',
  onClick,
  deshabilitado = false,
  cargando = false,
}: AccionFilaProps) {
  const { id, visible, burbuja, eventos } = useBurbuja()
  const bloqueado = deshabilitado || cargando
  return (
    <span className={estilos.accion}>
      <button
        type="button"
        className={clases(tono)}
        aria-label={etiqueta ?? nombre}
        aria-describedby={descripcion ? id : undefined}
        aria-disabled={deshabilitado || undefined}
        aria-busy={cargando || undefined}
        data-deshabilitado={deshabilitado || undefined}
        onClick={(evento) => {
          if (bloqueado) evento.preventDefault()
          else onClick(evento)
        }}
        {...eventos}
      >
        <Icono nombre={cargando ? 'loader' : icono} tamano="base" className={cargando ? estilos.girando : undefined} />
      </button>
      <Burbuja id={id} visible={visible} nombre={nombre} descripcion={descripcion} referencia={burbuja} />
    </span>
  )
}

export function AccionFilaEnlace({
  icono,
  nombre,
  etiqueta,
  descripcion,
  tono = 'normal',
  ...resto
}: AccionFilaEnlaceProps): ReactNode {
  const { id, visible, burbuja, eventos } = useBurbuja()
  return (
    <span className={estilos.accion}>
      <Link
        {...resto}
        className={clases(tono)}
        aria-label={etiqueta ?? nombre}
        aria-describedby={descripcion ? id : undefined}
        {...eventos}
      >
        <Icono nombre={icono} tamano="base" />
      </Link>
      <Burbuja id={id} visible={visible} nombre={nombre} descripcion={descripcion} referencia={burbuja} />
    </span>
  )
}

/** Varias acciones de una fila, juntas y alineadas a la derecha de su celda. */
export function AccionesFila({ children }: { children: ReactNode }) {
  return <span className={estilos.grupo}>{children}</span>
}
