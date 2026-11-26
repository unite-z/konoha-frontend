/**
 * Arrastre con puntero para los encargos del calendario semanal (RD-34). El encargo sigue al puntero con `transform`
 * (sin re-render por movimiento: 60 fps) y, al soltar, encaja en la celda con un muelle corto; con «reducir
 * movimiento» el encaje es directo. Las celdas se reconocen por `data-dia` y `data-cuadrilla`.
 */
import { useCallback, useRef, useState, type MouseEvent, type PointerEvent as EventoPuntero } from 'react'
import { reducirMovimiento } from '@/rediseno/base/movimiento'

const UMBRAL_PX = 4
const SELECTOR_CELDA = '[data-dia][data-cuadrilla]'
const MUELLE = 'transform var(--movimiento-normal) var(--curva-muelle)'

export interface Soltado {
  id: number
  dia: string
  cuadrillaId: number
  diaOrigen: string
}

interface Celda {
  elemento: HTMLElement
  dia: string
  cuadrillaId: number
}

interface Sesion {
  id: number
  puntero: number
  x: number
  y: number
  origen: Celda | null
  arrastrando: boolean
}

function celdaBajo(x: number, y: number): Celda | null {
  if (typeof document.elementsFromPoint !== 'function') return null
  for (const e of document.elementsFromPoint(x, y)) {
    const elemento = e.closest<HTMLElement>(SELECTOR_CELDA)
    if (elemento?.dataset.dia)
      return { elemento, dia: elemento.dataset.dia, cuadrillaId: Number(elemento.dataset.cuadrilla) }
  }
  return null
}

export interface PropsArrastre {
  onPointerDown: (e: EventoPuntero<HTMLElement>) => void
  onPointerMove: (e: EventoPuntero<HTMLElement>) => void
  onPointerUp: (e: EventoPuntero<HTMLElement>) => void
  onPointerCancel: (e: EventoPuntero<HTMLElement>) => void
  onClickCapture: (e: MouseEvent<HTMLElement>) => void
}

export function useArrastre({ activo, onSoltar }: { activo: boolean; onSoltar: (soltado: Soltado) => void }) {
  const elementos = useRef(new Map<number, HTMLElement>())
  const sesion = useRef<Sesion | null>(null)
  const recienArrastrado = useRef(false)
  const [arrastrando, setArrastrando] = useState<number | null>(null)

  const registrar = useCallback(
    (id: number) => (elemento: HTMLElement | null) => {
      if (elemento) elementos.current.set(id, elemento)
      else elementos.current.delete(id)
    },
    [],
  )

  const mover = useCallback((id: number, dx: number, dy: number, animado: boolean) => {
    const elemento = elementos.current.get(id)
    if (!elemento) return
    elemento.style.transition = animado && !reducirMovimiento() ? MUELLE : 'none'
    elemento.style.transform = dx === 0 && dy === 0 ? '' : `translate3d(${dx}px, ${dy}px, 0)`
  }, [])

  /** Devuelve los encargos a su sitio: con muelle tras cancelar, de golpe cuando los datos ya cambiaron. */
  const restablecer = useCallback(
    (animado: boolean) => {
      for (const id of elementos.current.keys()) mover(id, 0, 0, animado)
    },
    [mover],
  )

  function alBajar(id: number) {
    return (e: EventoPuntero<HTMLElement>) => {
      if (!activo || e.button !== 0 || sesion.current) return
      sesion.current = {
        id,
        puntero: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        origen: celdaBajo(e.clientX, e.clientY),
        arrastrando: false,
      }
    }
  }

  function alMover(id: number) {
    return (e: EventoPuntero<HTMLElement>) => {
      const s = sesion.current
      if (!s || s.id !== id || s.puntero !== e.pointerId) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (!s.arrastrando) {
        if (Math.hypot(dx, dy) < UMBRAL_PX) return
        s.arrastrando = true
        e.currentTarget.setPointerCapture?.(e.pointerId)
        setArrastrando(id)
      }
      mover(id, dx, dy, false)
    }
  }

  function terminar(id: number, e: EventoPuntero<HTMLElement>, cancelado: boolean) {
    const s = sesion.current
    if (!s || s.id !== id || s.puntero !== e.pointerId) return
    sesion.current = null
    if (!s.arrastrando) return
    recienArrastrado.current = true
    window.setTimeout(() => {
      recienArrastrado.current = false
    }, 0)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    setArrastrando(null)
    const destino = cancelado ? null : celdaBajo(e.clientX, e.clientY)
    if (!destino || !s.origen) {
      mover(id, 0, 0, true)
      return
    }
    // Encaja en la celda: el encargo se desplaza lo que separa su celda de origen de la de destino.
    const a = s.origen.elemento.getBoundingClientRect()
    const b = destino.elemento.getBoundingClientRect()
    mover(id, b.left - a.left, b.top - a.top, true)
    onSoltar({ id, dia: destino.dia, cuadrillaId: destino.cuadrillaId, diaOrigen: s.origen.dia })
  }

  const propsDe = (id: number): PropsArrastre => ({
    onPointerDown: alBajar(id),
    onPointerMove: alMover(id),
    onPointerUp: (e) => terminar(id, e, false),
    onPointerCancel: (e) => terminar(id, e, true),
    // Tras arrastrar, el clic que sigue al soltar no abre el panel.
    onClickCapture: (e) => {
      if (!recienArrastrado.current) return
      e.preventDefault()
      e.stopPropagation()
    },
  })

  return { registrar, propsDe, restablecer, arrastrando }
}
