/**
 * Fondo decorativo del inicio de sesión: una red de nodos que cruzan la pantalla despacio y se unen con
 * líneas que se desvanecen con la distancia. Al hacer clic en el fondo nace un nodo y desde él se propaga
 * una onda por las conexiones: cada nodo al que llega late. Pedido por Marcos igual que la referencia
 * (williamlin.io): mismo número de nodos, velocidades, grosores y colores.
 *
 * - Colores en `tokens.css` (`--web-nodos-*`), con su versión para el tema oscuro (`data-tema`).
 * - Las medidas son proporcionales a la diagonal de la pantalla, así que se ve igual en el móvil.
 * - Con «reducir movimiento» del sistema se pinta una sola vez, quieto y sin ondas.
 * - Es decoración (`aria-hidden`): no recibe el foco y la tarjeta queda por encima.
 */
import { useEffect, useRef } from 'react'
import estilos from './Acceso.module.css'

const NODOS = 69
/** Fracción de la diagonal a la que dos nodos se unen (y margen fuera de pantalla antes de reaparecer). */
const UNION = 0.15
/** Velocidad de un nodo, en fracción de la diagonal por milisegundo. */
const VELOCIDAD_MIN = 2e-5
/** Velocidad del frente de la onda, en fracción de la diagonal por milisegundo. */
const VELOCIDAD_ONDA = 9e-4
/** Largo del trazo de la onda, en fracción de la diagonal. */
const TRAZO_ONDA = 0.03

type Rgb = [number, number, number]

/** `#rrggbb` (o `#rgb`) a sus tres canales. */
function aRgb(hex: string): Rgb {
  const h = hex.replace('#', '')
  const largo = h.length === 3 ? h.split('').map((x) => x + x).join('') : h
  const n = Number.parseInt(largo, 16)
  return Number.isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Canales a `#rrggbb`. */
function aHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

interface Paleta {
  punto: Rgb
  onda: Rgb
  linea: string
  alfaLinea: number
  alfaOnda: number
}

interface Nodo {
  activo: boolean
  /** 0 → 1 mientras late; fuera de [0, 1) no late (negativo: aún no ha empezado). */
  latido: number
  /** Ondas que salen o llegan a este nodo: mientras tenga alguna, no desaparece. */
  enOnda: number
  x: number
  y: number
  vx: number
  vy: number
  tamano: number
}

interface Tramo {
  desde: number
  hasta: number
  avance: number
}

interface Onda {
  visitados: boolean[]
  tramos: Tramo[]
}

export default function FondoNodos() {
  const lienzo = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = lienzo.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const lienzoOk: HTMLCanvasElement = canvas
    const c: CanvasRenderingContext2D = ctx
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    let paleta: Paleta = { punto: [113, 113, 122], onda: [2, 132, 199], linea: '', alfaLinea: 0.55, alfaOnda: 0.9 }
    let ancho = 0
    let alto = 0
    let escala = 1
    let diagonal = 0
    let margen = 0
    let activos = 0
    const nodos: Nodo[] = []
    const ondas: Onda[] = []

    function leerColor() {
      const css = getComputedStyle(lienzoOk)
      const valor = (nombre: string) => css.getPropertyValue(nombre).trim()
      paleta = {
        punto: aRgb(valor('--web-nodos-punto')),
        onda: aRgb(valor('--web-nodos-onda')),
        linea: valor('--web-nodos-linea'),
        alfaLinea: Number(valor('--web-nodos-alfa-linea')) || 0.55,
        alfaOnda: Number(valor('--web-nodos-alfa-onda')) || 0.9,
      }
    }

    function darRumbo(n: Nodo, angulo: number) {
      n.tamano = 0.0012 + 0.001 * Math.random()
      const v = VELOCIDAD_MIN * (1 + Math.random())
      n.vx = v * Math.cos(angulo)
      n.vy = v * Math.sin(angulo)
    }

    function nuevoNodo(x?: number, y?: number): Nodo {
      const n: Nodo = { activo: true, latido: 1, enOnda: 0, x: 0, y: 0, vx: 0, vy: 0, tamano: 0 }
      darRumbo(n, 2 * Math.PI * Math.random())
      if (x !== undefined && y !== undefined) {
        n.x = x
        n.y = y
        n.latido = 0
      } else {
        n.x = -margen + (ancho + 2 * margen) * Math.random()
        n.y = -margen + (alto + 2 * margen) * Math.random()
        n.latido = -20 * Math.random()
      }
      activos++
      return n
    }

    /** Vuelve a entrar por un borde al azar, apuntando hacia dentro. */
    function reaparecer(n: Nodo) {
      n.activo = true
      n.latido = 1
      activos++
      let angulo = (1 / 6 + (2 * Math.random()) / 3) * Math.PI
      let p = 2 * (ancho + alto) * Math.random()
      if (p < ancho) {
        n.x = p
        n.y = -margen
      } else if ((p -= ancho) < alto) {
        angulo += Math.PI / 2
        n.x = ancho + margen
        n.y = p
      } else if ((p -= alto) < ancho) {
        angulo += Math.PI
        n.x = p
        n.y = alto + margen
      } else {
        p -= ancho
        angulo += (3 * Math.PI) / 2
        n.x = -margen
        n.y = p
      }
      darRumbo(n, angulo)
    }

    function moverNodo(n: Nodo, dt: number) {
      const fuera = n.x < -margen || n.x > ancho + margen || n.y < -margen || n.y > alto + margen
      if (n.activo && !n.enOnda && fuera) {
        n.activo = false
        activos--
      }
      if (!n.activo && activos < NODOS) reaparecer(n)
      if (!n.activo) return
      n.latido = Math.min(n.latido + 0.005 * dt, 1)
      n.x += n.vx * diagonal * dt
      n.y += n.vy * diagonal * dt
    }

    function pintarNodo(n: Nodo) {
      if (!n.activo) return
      const pulso = n.latido >= 0 && n.latido < 1 ? Math.sin(Math.PI * Math.sqrt(n.latido)) : 0
      const radio = Math.max(n.tamano * diagonal, 1.25) + Math.max(0.0012 * diagonal, 1) * pulso
      const { punto, onda } = paleta
      c.fillStyle = aHex([0, 1, 2].map((k) => punto[k] + (onda[k] - punto[k]) * pulso) as Rgb)
      c.beginPath()
      c.arc(n.x, n.y, radio, 0, 2 * Math.PI)
      c.fill()
    }

    function visitar(onda: Onda, i: number) {
      if (onda.visitados[i]) return
      nodos[i].latido = 0
      onda.visitados[i] = true
      for (let j = 0; j < nodos.length; j++) {
        if (onda.visitados[j] || !nodos[j].activo) continue
        if (Math.hypot(nodos[i].x - nodos[j].x, nodos[i].y - nodos[j].y) > margen) continue
        onda.tramos.push({ desde: i, hasta: j, avance: 0 })
        nodos[i].enOnda++
        nodos[j].enOnda++
      }
    }

    function avanzarOnda(onda: Onda, dt: number) {
      while (onda.visitados.length < nodos.length) onda.visitados.push(false)
      const alcanzados: number[] = []
      for (let k = onda.tramos.length - 1; k >= 0; k--) {
        const t = onda.tramos[k]
        const largo = Math.hypot(nodos[t.desde].x - nodos[t.hasta].x, nodos[t.desde].y - nodos[t.hasta].y)
        t.avance += VELOCIDAD_ONDA * diagonal * dt
        if (t.avance >= largo) {
          onda.tramos.splice(k, 1)
          nodos[t.desde].enOnda--
          nodos[t.hasta].enOnda--
          alcanzados.push(t.hasta)
        }
      }
      alcanzados.forEach((i) => visitar(onda, i))
    }

    function pintarOnda(onda: Onda) {
      c.globalAlpha = paleta.alfaOnda
      c.strokeStyle = aHex(paleta.onda)
      c.lineWidth = Math.max(0.0006 * diagonal, 0.75)
      const trazo = TRAZO_ONDA * diagonal
      for (const t of onda.tramos) {
        const a = nodos[t.desde]
        const b = nodos[t.hasta]
        const largo = Math.hypot(a.x - b.x, a.y - b.y)
        const frente = ((t.avance / largo) * (largo + trazo)) / largo
        const cola = Math.max(frente - trazo / largo, 0)
        const punta = Math.min(frente, 1)
        c.beginPath()
        c.moveTo(a.x + (b.x - a.x) * cola, a.y + (b.y - a.y) * cola)
        c.lineTo(a.x + (b.x - a.x) * punta, a.y + (b.y - a.y) * punta)
        c.stroke()
      }
    }

    function pintar() {
      c.setTransform(escala, 0, 0, escala, 0, 0)
      c.clearRect(0, 0, ancho, alto)
      c.strokeStyle = paleta.linea
      c.lineWidth = Math.max(0.0006 * diagonal, 0.75)
      for (let i = 0; i < nodos.length; i++) {
        if (!nodos[i].activo) continue
        for (let j = 0; j < i; j++) {
          if (!nodos[j].activo) continue
          const d = Math.hypot(nodos[i].x - nodos[j].x, nodos[i].y - nodos[j].y)
          if (d >= margen) continue
          c.globalAlpha = paleta.alfaLinea * (1 - d / margen)
          c.beginPath()
          c.moveTo(nodos[i].x, nodos[i].y)
          c.lineTo(nodos[j].x, nodos[j].y)
          c.stroke()
        }
      }
      ondas.forEach(pintarOnda)
      c.globalAlpha = 1
      nodos.forEach(pintarNodo)
    }

    function ajustar() {
      const nuevaEscala = Math.min(window.devicePixelRatio || 1, 2)
      const w = lienzoOk.clientWidth
      const h = lienzoOk.clientHeight
      if (w === ancho && h === alto && nuevaEscala === escala && nodos.length) return
      ancho = w
      alto = h
      escala = nuevaEscala
      lienzoOk.width = Math.round(w * escala)
      lienzoOk.height = Math.round(h * escala)
      diagonal = Math.hypot(w, h)
      margen = UNION * diagonal
      if (!nodos.length && w && h) for (let i = 0; i < NODOS; i++) nodos.push(nuevoNodo())
    }

    let anterior: number | undefined
    let fotograma = 0
    function animar(ahora: number) {
      fotograma = requestAnimationFrame(animar)
      ajustar()
      const dt = anterior === undefined ? 0 : Math.min(ahora - anterior, 100)
      anterior = ahora
      nodos.forEach((n) => moverNodo(n, dt))
      // Los nodos que salieron solo se borran cuando no hay ondas, para no mover los índices de sus tramos.
      if (!ondas.length) for (let i = nodos.length - 1; i >= 0; i--) if (!nodos[i].activo) nodos.splice(i, 1)
      for (let k = ondas.length - 1; k >= 0; k--) {
        avanzarOnda(ondas[k], dt)
        if (!ondas[k].tramos.length) ondas.splice(k, 1)
      }
      pintar()
    }

    function alPulsar(evento: MouseEvent) {
      nodos.push(nuevoNodo(evento.offsetX, evento.offsetY))
      const onda: Onda = { visitados: Array<boolean>(nodos.length).fill(false), tramos: [] }
      visitar(onda, nodos.length - 1)
      ondas.push(onda)
    }

    leerColor()
    ajustar()
    // El tema oscuro se activa con `data-tema` en <html>: al cambiar, se releen los colores.
    const tema = new MutationObserver(() => {
      leerColor()
      if (quieto) pintar()
    })
    tema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] })
    if (quieto) {
      pintar()
      const observador = new ResizeObserver(() => {
        ajustar()
        pintar()
      })
      observador.observe(lienzoOk)
      return () => {
        observador.disconnect()
        tema.disconnect()
      }
    }
    lienzoOk.addEventListener('click', alPulsar)
    fotograma = requestAnimationFrame(animar)
    return () => {
      cancelAnimationFrame(fotograma)
      lienzoOk.removeEventListener('click', alPulsar)
      tema.disconnect()
    }
  }, [])

  return <canvas ref={lienzo} className={estilos.fondoNodos} aria-hidden="true" />
}
