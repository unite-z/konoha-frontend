/**
 * Escena 3D del campus (AV-424). Se carga con `import()` desde MapaCampus.tsx: es el único fichero que importa Three.js,
 * así que todo el motor queda en un chunk diferido. Adaptada de `mapas-3d-pucp/isometrico/visor3d`.
 *
 * - Cámara ortográfica y render bajo demanda: solo se dibuja cuando algo cambia (vuelo, construcción, controles).
 * - Geometrías fusionadas por capa y árboles con `InstancedMesh`; solo aristas, con los colores de `--mapa-*`.
 * - Construcción inicial con shaders `crecer` y `aparecer` (≤ 1,85 s), saltable. Con `reducirMovimiento` no hay
 *   construcción y los vuelos son cortes.
 * - Ejes: los datos van en metros (x = este, y = norte) y la escena usa X = x, Z = -y, Y = arriba.
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import type { DatosCampus } from '@/types/campus3d'
import type { GruposAreas } from './areas'
import { leerPaleta, leerToken, type ClavePaleta } from './paleta'

export type VistaMapa = 'iso' | 'planta' | 'baja'

export interface OpcionesEscena {
  contenedor: HTMLElement
  datos: DatosCampus
  vista: VistaMapa
  /** Anima la construcción inicial (solo la primera carga de la sesión). */
  animar: boolean
  reducirMovimiento: boolean
  claseEtiqueta: string
  /** Índice del área principal pulsada en `datos.areas`, o `null` si se pulsó fuera de las áreas. */
  alSeleccionar: (indice: number | null) => void
  /** Partes de cada área de varios polígonos (`agruparAreas`). */
  grupos: GruposAreas
}

/** Áreas (posiciones en `datos.areas`, cualquier parte) que se colorean con un token CSS (`--color-success`…). */
export interface GrupoColor {
  indices: readonly number[]
  token: string
}

/** Huella dibujada encima del campus base: un anillo por polígono, en metros (listas planas [x0, y0, x1, y1, …]). */
export interface GeometriaViva {
  id: string
  anillos: readonly number[][]
}

/** Función que retira un elemento anclado; `mover` lo lleva a otro punto (metros) sin quitarlo del DOM. */
export type Ancla = (() => void) & { mover: (x: number, y: number) => void }

export interface Escena {
  repintar: () => void
  /** Colorea áreas por token CSS sin regenerar el campus. Devuelve la función que quita la capa. */
  pintarAreas: (grupos: readonly GrupoColor[]) => () => void
  /**
   * Oculta áreas del campus base (posiciones en `datos.areas`): su borde, su clic y su marca. Si hay una geometría viva
   * con su id, la selección, el foco y los colores usan esa. Devuelve la función que las restituye.
   */
  ocultarAreas: (indices: readonly number[]) => () => void
  /**
   * Dibuja huellas nuevas o cambiadas; se eligen con clic como las del campus base (`alPulsar` recibe su id) y
   * `irAArea(id)` vuela a ellas y las marca. Devuelve la función que las quita.
   */
  dibujarGeometrias: (geometrias: readonly GeometriaViva[], alPulsar: (id: string) => void) => () => void
  /** Cuelga un elemento HTML de un punto (metros) sobre el suelo. Devuelve la función que lo retira. */
  anclar: (elemento: HTMLElement, x: number, y: number, alto?: number) => Ancla
  /** Metros de escena por píxel de pantalla con el zoom actual. */
  metrosPorPixel: () => number
  /** Avisa cuando el zoom o el tamaño cambian de forma apreciable. Devuelve la función que deja de avisar. */
  alCambiarCamara: (oyente: () => void) => () => void
  /** Punto del suelo (metros) bajo una posición de pantalla, o `null` si ahí no hay suelo. */
  suelo: (clientX: number, clientY: number) => { x: number; y: number } | null
  /** Punto del suelo (metros) que hay en el centro de la vista. */
  centro: () => { x: number; y: number }
  /** Mientras haya algún oyente, un toque en el suelo lo llama (en metros) y no elige áreas. Devuelve la baja. */
  alPulsarSuelo: (oyente: (punto: { x: number; y: number }) => void) => () => void
  /** Dibuja una polilínea (lista plana en metros) sobre el suelo, con relleno si va cerrada. Devuelve la función que la quita. */
  dibujarTrazo: (puntos: readonly number[], cerrado: boolean, token: string) => () => void
  /** Vuela a un punto (metros), acercando por `factor`. */
  enfocar: (x: number, y: number, factor?: number) => void
  irAVista: (vista: VistaMapa) => void
  /**
   * Vuela al área (posición en `datos.areas`, o id de una geometría viva: si aún no está dibujada, vuela al dibujarla);
   * con `null` deshace el vuelo y vuelve a donde estaba la cámara.
   */
  irAArea: (destino: number | string | null) => void
  /** Marca el área con foco de teclado, sin mover la cámara. */
  resaltar: (indice: number | null) => void
  desplazar: (dx: number, dy: number) => void
  acercar: (factor: number) => void
  saltarConstruccion: () => void
  /** Pausa el dibujo (el mapa sigue en memoria). */
  pausar: (pausada: boolean) => void
  destruir: () => void
}

interface EstadoCamara {
  cx: number
  cz: number
  az: number
  el: number
  z: number
}

interface Vuelo {
  desde: EstadoCamara
  hasta: EstadoCamara
  t0: number
  ms: number
  curva: (t: number) => number
}

const ALTO = 820
/** Ancho mínimo visible (m): en pantallas estrechas (móvil en vertical) el campus cabe entero a lo ancho. */
const ANCHO_MINIMO = 1000
const RADIO_CAMARA = 1500
const CONSTRUCCION_S = 1.85
const SUBIR_S = 0.7
const RADIO_OLEADA = 900
const VISTAS: Record<VistaMapa, { az: number; el: number; z: number }> = {
  iso: { az: Math.PI * 0.18, el: 0.62, z: 0.9 },
  planta: { az: 0, el: 0.001, z: 0.9 },
  baja: { az: Math.PI * 0.35, el: 1.3, z: 3 },
}
const CORTAS: Record<string, string> = {
  'Biblioteca Central Luis Jaime Cisneros': 'Biblioteca Central',
  'Complejo De Innovación Académica': 'CIA',
  'Facultad de Psicología': 'Psicología',
  'Sección Ingeniería Civil': 'Ingeniería Civil',
  Tinkuy: 'Tinkuy',
  'Pabellón A': 'Pabellón A',
  Admisión: 'Admisión',
  'Cafetería de Letras': 'Cafetería de Letras',
}

const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const salida = (t: number) => 1 - Math.pow(1 - t, 4)

/** Une geometrías (Three devuelve `null` con una lista vacía). */
function unir(lista: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return (lista.length ? mergeGeometries(lista) : null) ?? new THREE.BufferGeometry()
}

function forma(p: number[]): THREE.Shape {
  const s = new THREE.Shape()
  for (let i = 0; i < p.length; i += 2) {
    if (i === 0) s.moveTo(p[i], p[i + 1])
    else s.lineTo(p[i], p[i + 1])
  }
  return s
}

function plano(p: number[], y: number): THREE.BufferGeometry {
  const g = new THREE.ShapeGeometry(forma(p))
  g.rotateX(-Math.PI / 2)
  g.translate(0, y, 0)
  return g
}

function segmentos(lista: number[][], y: number, cerrar: boolean): THREE.BufferGeometry {
  const v: number[] = []
  for (const p of lista) {
    const n = p.length / 2
    for (let i = 0; i < n - (cerrar ? 0 : 1); i++) {
      const j = (i + 1) % n
      v.push(p[2 * i], y, -p[2 * i + 1], p[2 * j], y, -p[2 * j + 1])
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
  return g
}

function conAtributo(g: THREE.BufferGeometry, nombre: string, valor: number): THREE.BufferGeometry {
  const n = g.attributes.position.count
  g.setAttribute(nombre, new THREE.Float32BufferAttribute(new Float32Array(n).fill(valor), 1))
  return g
}

function cajaDe(p: number[]): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (let i = 0; i < p.length; i += 2) {
    x0 = Math.min(x0, p[i])
    x1 = Math.max(x1, p[i])
    y0 = Math.min(y0, p[i + 1])
    y1 = Math.max(y1, p[i + 1])
  }
  return { x0, x1, y0, y1 }
}

export function crearEscena(opciones: OpcionesEscena): Escena {
  const { contenedor, datos, reducirMovimiento, grupos } = opciones
  const partesDe = (indice: number) => grupos.partes.get(grupos.principal[indice]) ?? [indice]
  const cortes = reducirMovimiento
  let construido = !opciones.animar || reducirMovimiento
  const tamano = () => ({ ancho: Math.max(1, contenedor.clientWidth), alto: Math.max(1, contenedor.clientHeight) })
  const aspecto = () => {
    const { ancho, alto } = tamano()
    return ancho / alto
  }
  /** Alto visible de la escena con zoom 1; la escala lleva el zoom de las áreas al mismo encuadre en cualquier pantalla. */
  const altoVisible = () => Math.max(ALTO, ANCHO_MINIMO / aspecto())
  const escala = () => altoVisible() / ALTO

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(tamano().ancho, tamano().alto)
  contenedor.appendChild(renderer.domElement)
  const capaEtiquetas = new CSS2DRenderer()
  capaEtiquetas.setSize(tamano().ancho, tamano().alto)
  Object.assign(capaEtiquetas.domElement.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    transition: 'opacity 500ms ease',
    opacity: construido ? '1' : '0',
  })
  contenedor.appendChild(capaEtiquetas.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000)
  scene.add(new THREE.AmbientLight(0xffffff, 1.9))
  const sol = new THREE.DirectionalLight(0xffffff, 1.3)
  sol.position.set(-300, 500, 200)
  scene.add(sol)

  // --- paleta: cada color registrado se repinta al cambiar de tema
  const pintables: Array<[THREE.Color, ClavePaleta]> = []
  const pintar = <M extends { color: THREE.Color }>(material: M, clave: ClavePaleta): M => {
    pintables.push([material.color, clave])
    return material
  }
  /** Colores de las capas externas: se leen de un token CSS y se repintan igual que la paleta. */
  const pintablesToken: Array<[THREE.Color, string]> = []
  const despintar = (material: { color: THREE.Color }) => {
    for (const lista of [pintables, pintablesToken] as Array<Array<[THREE.Color, unknown]>>) {
      for (let i = lista.length - 1; i >= 0; i--) if (lista[i][0] === material.color) lista.splice(i, 1)
    }
  }
  function repintar() {
    const paleta = leerPaleta()
    for (const [color, clave] of pintables) if (paleta[clave]) color.set(paleta[clave])
    for (const [color, token] of pintablesToken) {
      const valor = leerToken(token)
      if (valor) color.set(valor)
    }
    if (paleta.fondo) renderer.setClearColor(paleta.fondo)
    pedir()
  }

  // --- animación de construcción: un reloj común y materiales que crecen o aparecen según su retardo
  const uT = { value: construido ? 99 : 0 }
  const crecer = <M extends THREE.Material>(mat: M, clave: string): M => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uT = uT
      sh.vertexShader =
        'uniform float uT;\nattribute float retardo;\nattribute float base;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
 float k = clamp((uT - retardo) / ${SUBIR_S.toFixed(2)}, 0.0, 1.0); k = 1.0 - pow(1.0 - k, 3.0);
 transformed.y = base + (transformed.y - base) * max(k, 0.0005);`,
        )
    }
    mat.customProgramCacheKey = () => `crecer-${clave}`
    return mat
  }
  const aparecer = <M extends THREE.Material>(mat: M, clave: string): M => {
    mat.transparent = true
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uT = uT
      sh.vertexShader =
        'uniform float uT;\nattribute float retardo;\nvarying float vA;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n float k = clamp((uT - retardo) / 0.5, 0.0, 1.0); vA = k; transformed.y += (1.0 - k) * (1.0 - k) * 14.0;',
        )
      sh.fragmentShader =
        'varying float vA;\n' +
        sh.fragmentShader.replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec4 diffuseColor = vec4( diffuse, opacity * vA );',
        )
    }
    mat.customProgramCacheKey = () => `aparecer-${clave}`
    return mat
  }
  let cxC = 0
  let cyC = 0
  for (let i = 0; i < datos.campus.length; i += 2) {
    cxC += datos.campus[i]
    cyC += datos.campus[i + 1]
  }
  const nVertices = Math.max(1, datos.campus.length / 2)
  cxC /= nVertices
  cyC /= nVertices
  const retardoDe = (x: number, y: number, desde: number, hasta: number) =>
    desde + Math.min(1, Math.hypot(x - cxC, y - cyC) / RADIO_OLEADA) * (hasta - desde)

  const fundibles: THREE.Material[] = []
  const fundir = <M extends THREE.Material>(mat: M, final = 1): M => {
    mat.transparent = true
    mat.userData.final = final
    mat.opacity = construido ? final : 0
    fundibles.push(mat)
    return mat
  }
  const tinta = (opacidad = 1) => fundir(pintar(new THREE.LineBasicMaterial(), 'tinta'), opacidad)
  const suelo = (clave: ClavePaleta, capa: number) =>
    fundir(
      pintar(
        new THREE.MeshBasicMaterial({ polygonOffset: true, polygonOffsetFactor: -capa, polygonOffsetUnits: -capa }),
        clave,
      ),
    )

  // --- suelo: isla del campus, césped, canchas, vías
  scene.add(new THREE.Mesh(plano(datos.campus, 0), suelo('isla', 0)))
  scene.add(new THREE.LineSegments(segmentos([datos.campus], 0.05, true), tinta()))
  scene.add(new THREE.Mesh(unir(datos.cesped.map((p) => plano(p, 0))), suelo('cesped', 1)))
  scene.add(new THREE.LineSegments(segmentos(datos.canchas, 0.1, true), tinta(0.55)))
  scene.add(new THREE.LineSegments(segmentos(datos.vias, 0.1, false), tinta(0.35)))
  scene.add(new THREE.LineSegments(segmentos(datos.senderos, 0.1, false), tinta(0.18)))

  // --- áreas verdes: una malla invisible para elegir (con índice por vértice) y una para los bordes
  const mallaAreas = new THREE.Mesh(
    unir(
      datos.areas.map((a, i) => {
        const g = plano(a.p, 0.12)
        return conAtributo(g, 'area', i)
      }),
    ),
    new THREE.MeshBasicMaterial({ visible: false }),
  )
  scene.add(mallaAreas)
  const ocultaciones = new Set<ReadonlySet<number>>()
  const estaOculta = (indice: number) => [...ocultaciones].some((c) => c.has(indice))
  /** Geometrías vivas dibujadas (id → anillos): sustituyen a las áreas ocultas con el mismo id. */
  const vivas = new Map<string, readonly number[][]>()
  /** Huellas con las que se marca o colorea un destino: las vivas si el área está oculta o es nueva. */
  const huellasDe = (destino: number | string): readonly number[][] => {
    if (typeof destino === 'string') return vivas.get(destino) ?? []
    if (!estaOculta(destino)) return partesDe(destino).map((i) => datos.areas[i].p)
    return vivas.get(datos.areas[destino].id) ?? []
  }
  const construirBordes = () =>
    unir(
      datos.areas.flatMap((a, i) =>
        estaOculta(i)
          ? []
          : [conAtributo(segmentos([a.p], 0.15, true), 'retardo', retardoDe(a.p[0], a.p[1], 0.25, 1.0))],
      ),
    )
  const mallaBordes = new THREE.LineSegments(
    construirBordes(),
    aparecer(pintar(new THREE.LineBasicMaterial(), 'verde'), 'areas'),
  )
  scene.add(mallaBordes)
  const marcaMaterial = (opacidad: number) =>
    pintar(
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: opacidad,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      }),
      'sel',
    )
  const seleccion = new THREE.Mesh(new THREE.BufferGeometry(), marcaMaterial(0.85))
  const foco = new THREE.Mesh(new THREE.BufferGeometry(), marcaMaterial(0.5))
  scene.add(seleccion, foco)

  // --- edificios: una sola malla y un solo conjunto de aristas
  const geosEdificio: THREE.BufferGeometry[] = []
  const geosArista: THREE.BufferGeometry[] = []
  for (const e of datos.edificios) {
    const g = new THREE.ExtrudeGeometry(forma(e.p), { depth: Math.max(0.5, e.h - e.b), bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    g.translate(0, e.b, 0)
    const r = retardoDe(e.p[0], e.p[1], 0.45, 1.1)
    const aristas = new THREE.EdgesGeometry(g, 25)
    geosEdificio.push(conAtributo(conAtributo(g, 'retardo', r), 'base', e.b))
    geosArista.push(conAtributo(conAtributo(aristas, 'retardo', r), 'base', e.b))
  }
  const muros = pintar(
    new THREE.MeshLambertMaterial({ polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    'pared',
  )
  scene.add(new THREE.Mesh(unir(geosEdificio), crecer(muros, 'muros')))
  scene.add(new THREE.LineSegments(unir(geosArista), crecer(pintar(new THREE.LineBasicMaterial(), 'tinta'), 'aristas')))

  // --- árboles: instanciados (tres llamadas de dibujo para todos)
  const nArboles = datos.arboles.length
  const esfera = new THREE.IcosahedronGeometry(1, 1)
  const copa = new THREE.InstancedMesh(
    esfera,
    pintar(new THREE.MeshLambertMaterial({ flatShading: true }), 'arbol'),
    nArboles,
  )
  const contorno = new THREE.InstancedMesh(
    esfera,
    pintar(new THREE.MeshBasicMaterial({ side: THREE.BackSide }), 'verde'),
    nArboles,
  )
  const tronco = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.16, 1, 5).translate(0, 0.5, 0),
    pintar(new THREE.MeshBasicMaterial(), 'tinta'),
    nArboles,
  )
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const v = new THREE.Vector3()
  const s = new THREE.Vector3()
  const retardoArbol = datos.arboles.map(([x, y]) => retardoDe(x, y, 0.8, 1.35))
  function colocarArboles(t: number) {
    datos.arboles.forEach(([x, y, alto, fuste, radio], i) => {
      let k = Math.min(1, Math.max(0, (t - retardoArbol[i]) / 0.45))
      k = k === 1 ? 1 : 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2) // brota con un pequeño rebote
      const kk = Math.max(0.0001, k)
      const r = Math.max(1, radio)
      const f = Math.max(1, Math.min(fuste, alto - r))
      const y0 = (f + r * 0.8) * Math.min(1, kk)
      m4.compose(v.set(x, y0, -y), q, s.set(r * kk, r * 0.85 * kk, r * kk))
      copa.setMatrixAt(i, m4)
      m4.compose(v.set(x, y0, -y), q, s.set(r * 1.07 * kk, r * 0.85 * 1.07 * kk, r * 1.07 * kk))
      contorno.setMatrixAt(i, m4)
      m4.compose(v.set(x, 0, -y), q, s.set(1, (f + r * 0.3) * Math.min(1, kk), 1))
      tronco.setMatrixAt(i, m4)
    })
    copa.instanceMatrix.needsUpdate = true
    contorno.instanceMatrix.needsUpdate = true
    tronco.instanceMatrix.needsUpdate = true
  }
  colocarArboles(uT.value)
  scene.add(tronco, contorno, copa)

  // --- etiquetas de edificios
  for (const [nombre, x, y] of datos.etiquetas) {
    const texto = CORTAS[nombre]
    if (!texto) continue
    const el = document.createElement('div')
    el.className = opciones.claseEtiqueta
    el.textContent = texto
    const objeto = new CSS2DObject(el)
    objeto.position.set(x, 26, -y)
    scene.add(objeto)
  }

  // --- cámara y controles
  const controles = new OrbitControls(camera, renderer.domElement)
  controles.enableDamping = true
  controles.dampingFactor = 0.08
  controles.minZoom = 0.6
  controles.maxZoom = 12 * escala()
  controles.maxPolarAngle = Math.PI * 0.47
  controles.screenSpacePanning = true

  function estadoCamara(): EstadoCamara {
    const d = camera.position.clone().sub(controles.target)
    return {
      cx: controles.target.x,
      cz: controles.target.z,
      az: Math.atan2(d.x, d.z),
      el: Math.acos(Math.min(1, d.y / d.length())),
      z: camera.zoom,
    }
  }
  function ponerCamara(w: EstadoCamara) {
    camera.position.set(
      w.cx + RADIO_CAMARA * Math.sin(w.el) * Math.sin(w.az),
      RADIO_CAMARA * Math.cos(w.el),
      w.cz + RADIO_CAMARA * Math.sin(w.el) * Math.cos(w.az),
    )
    controles.target.set(w.cx, 0, w.cz)
    camera.zoom = w.z
    camera.updateProjectionMatrix()
  }

  let vuelo: Vuelo | null = null
  let destruida = false
  let pausada = false
  let pendiente = false
  let marco = 0
  function pedir() {
    if (pendiente || destruida || pausada) return
    pendiente = true
    marco = requestAnimationFrame(dibujar)
  }
  function volar(destino: EstadoCamara, ms = 750, curva = suave) {
    const desde = estadoCamara()
    const giro = Math.atan2(Math.sin(destino.az - desde.az), Math.cos(destino.az - desde.az)) // por el lado corto
    const hasta = { ...destino, az: desde.az + giro }
    if (cortes) {
      vuelo = null
      ponerCamara(hasta)
      controles.update()
      pedir()
      return
    }
    vuelo = { desde, hasta, t0: performance.now(), ms, curva }
    controles.enableDamping = false
    pedir()
  }
  function pasoVuelo(ahora: number): boolean {
    if (!vuelo) return false
    const t = Math.min(1, (ahora - vuelo.t0) / vuelo.ms)
    const k = vuelo.curva(t)
    const { desde: a, hasta: b } = vuelo
    ponerCamara({
      cx: a.cx + (b.cx - a.cx) * k,
      cz: a.cz + (b.cz - a.cz) * k,
      az: a.az + (b.az - a.az) * k,
      el: a.el + (b.el - a.el) * k,
      // el zoom va en escala logarítmica para que acercarse y alejarse se sientan iguales
      z: Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * k),
    })
    if (t >= 1) {
      vuelo = null
      controles.enableDamping = true
    }
    return true
  }
  const vistaDe = (nombre: VistaMapa): EstadoCamara => ({ cx: 0, cz: 0, ...VISTAS[nombre] })

  // --- dibujar solo cuando hace falta
  let t0Construccion: number | null = null
  function terminarConstruccion() {
    if (construido) return
    construido = true
    quitarSalto()
    uT.value = 99
    colocarArboles(99)
    for (const m of fundibles) m.opacity = m.userData.final as number
    capaEtiquetas.domElement.style.opacity = '1'
    if (vuelo) {
      ponerCamara(vuelo.hasta)
      vuelo = null
      controles.enableDamping = true
    }
    pedir()
  }
  function dibujar(ahora: number) {
    pendiente = false
    if (destruida || pausada) return
    let sigue = false
    if (!construido) {
      t0Construccion ??= ahora
      uT.value = (ahora - t0Construccion) / 1000
      const kSuelo = Math.min(1, uT.value / 0.45)
      for (const m of fundibles) m.opacity = (m.userData.final as number) * kSuelo
      colocarArboles(uT.value)
      if (uT.value >= CONSTRUCCION_S) terminarConstruccion()
      else sigue = true
    }
    if (pasoVuelo(ahora)) sigue = true
    if (controles.update()) sigue = true
    renderer.render(scene, camera)
    capaEtiquetas.render(scene, camera)
    if (Math.abs(camera.zoom / zoomAvisado - 1) > 0.02) avisarCamara()
    if (sigue) pedir()
  }
  controles.addEventListener('change', pedir)
  const oyentesCamara = new Set<() => void>()
  let zoomAvisado = camera.zoom
  function avisarCamara() {
    zoomAvisado = camera.zoom
    for (const oyente of oyentesCamara) oyente()
  }

  function ajustarTamano() {
    const alto = altoVisible()
    camera.left = (-alto * aspecto()) / 2
    camera.right = (alto * aspecto()) / 2
    camera.top = alto / 2
    camera.bottom = -alto / 2
    camera.updateProjectionMatrix()
    controles.maxZoom = 12 * escala()
    renderer.setSize(tamano().ancho, tamano().alto)
    capaEtiquetas.setSize(tamano().ancho, tamano().alto)
    avisarCamara()
    pedir()
  }
  const observadorTamano = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(ajustarTamano)
  observadorTamano?.observe(contenedor)
  ajustarTamano()

  // --- clic en un área
  const rayo = new THREE.Raycaster()
  const puntero = new THREE.Vector2()
  const mallasVivas = new Set<THREE.Mesh>()
  let abajo: [number, number] | null = null
  let clicDeSalto = false
  const oyentesSuelo = new Set<(punto: { x: number; y: number }) => void>()
  const planoSuelo = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const impactoSuelo = new THREE.Vector3()
  /** Metros del suelo bajo el rayo ya apuntado (x = este, y = norte). */
  function sueloBajoRayo() {
    return rayo.ray.intersectPlane(planoSuelo, impactoSuelo) ? { x: impactoSuelo.x, y: -impactoSuelo.z } : null
  }
  function sueloEnPantalla(clientX: number, clientY: number) {
    const r = renderer.domElement.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return null
    puntero.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    camera.updateMatrixWorld()
    rayo.setFromCamera(puntero, camera)
    return sueloBajoRayo()
  }
  const alBajar = (e: PointerEvent) => {
    // El clic que salta la construcción no elige un área.
    abajo = clicDeSalto ? null : [e.clientX, e.clientY]
    clicDeSalto = false
  }
  const alSubir = (e: PointerEvent) => {
    if (!abajo || Math.hypot(e.clientX - abajo[0], e.clientY - abajo[1]) > 4) return
    const r = renderer.domElement.getBoundingClientRect()
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    rayo.setFromCamera(puntero, camera)
    if (oyentesSuelo.size > 0) {
      const punto = sueloBajoRayo()
      if (punto) for (const oyente of oyentesSuelo) oyente(punto)
      return
    }
    const viva = rayo.intersectObjects([...mallasVivas])[0]
    if (viva?.face) {
      const malla = viva.object as THREE.Mesh
      const alPulsar = malla.userData.alPulsar as (id: string) => void
      const ids = malla.userData.ids as string[]
      alPulsar(ids[malla.geometry.attributes.area.getX(viva.face.a)])
      return
    }
    const cara = rayo
      .intersectObject(mallaAreas)
      .find((impacto) => impacto.face && !estaOculta(mallaAreas.geometry.attributes.area.getX(impacto.face.a)))?.face
    opciones.alSeleccionar(cara ? grupos.principal[mallaAreas.geometry.attributes.area.getX(cara.a)] : null)
  }
  renderer.domElement.addEventListener('pointerdown', alBajar)
  renderer.domElement.addEventListener('pointerup', alSubir)

  // --- vistas y áreas
  let antesDelArea: EstadoCamara | null = null
  let destinoSeleccion: number | string | null = null
  let destinoFoco: number | null = null
  /** Capas de `pintarAreas` vivas: se rehacen si cambian las áreas ocultas. */
  const capasColor = new Set<{ indices: readonly number[]; malla: THREE.Mesh }>()
  const marcar = (malla: THREE.Mesh, destino: number | string | null) => {
    malla.geometry.dispose()
    malla.geometry = unir((destino === null ? [] : huellasDe(destino)).map((p) => plano(p, 0.2)))
  }
  /** Repinta marcas y colores cuando cambian las áreas ocultas o las geometrías vivas. */
  function rehacerSustituidas() {
    marcar(seleccion, destinoSeleccion)
    marcar(foco, destinoFoco)
    for (const capa of capasColor) {
      capa.malla.geometry.dispose()
      capa.malla.geometry = geometriaColor(capa.indices)
    }
    pedir()
  }
  function irAArea(destino: number | string | null) {
    const valido = typeof destino === 'string' || (destino !== null && destino >= 0 && destino < datos.areas.length)
    destinoSeleccion = valido ? destino : null
    marcar(seleccion, destinoSeleccion)
    const huellas = destinoSeleccion === null ? [] : huellasDe(destinoSeleccion)
    if (huellas.length === 0) {
      // Un id vivo que aún no se ha dibujado espera a `dibujarGeometrias`; si no, se deshace el vuelo.
      if (typeof destinoSeleccion === 'string') return
      if (antesDelArea) volar(antesDelArea, 800)
      antesDelArea = null
      pedir()
      return
    }
    antesDelArea ??= estadoCamara()
    const { x0, x1, y0, y1 } = cajaDe(huellas.flat())
    const tam = Math.max(x1 - x0, y1 - y0, 25)
    const ahora = estadoCamara()
    volar(
      {
        cx: (x0 + x1) / 2,
        cz: -(y0 + y1) / 2,
        az: ahora.az + 0.12,
        el: Math.min(ahora.el, 0.78),
        z: Math.min(9 * escala(), Math.max(1.8, altoVisible() / (tam * 3.2))),
      },
      900,
    )
  }

  // --- capas públicas (AV-426): colores, geometrías vivas y marcadores. Reciben los datos del módulo.
  function geometriaColor(indices: readonly number[]) {
    const ids = new Set<string>()
    const huellas = indices.flatMap((i) => {
      if (!estaOculta(i)) return [datos.areas[i].p]
      const id = datos.areas[i].id
      if (ids.has(id)) return []
      ids.add(id)
      return [...huellasDe(i)]
    })
    return unir(huellas.map((p) => plano(p, 0.16)))
  }

  function pintarAreas(grupoColores: readonly GrupoColor[]) {
    const capas = grupoColores
      .filter((g) => g.indices.length > 0)
      .map(({ indices, token }) => {
        const material = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        })
        pintablesToken.push([material.color, token])
        const capa = { indices, malla: new THREE.Mesh(geometriaColor(indices), material) }
        capasColor.add(capa)
        scene.add(capa.malla)
        return capa
      })
    repintar()
    return () => {
      for (const capa of capas) {
        capasColor.delete(capa)
        scene.remove(capa.malla)
        capa.malla.geometry.dispose()
        despintar(capa.malla.material as THREE.MeshBasicMaterial)
        ;(capa.malla.material as THREE.MeshBasicMaterial).dispose()
      }
      pedir()
    }
  }

  function ocultarAreas(indices: readonly number[]) {
    const conjunto = new Set(indices)
    ocultaciones.add(conjunto)
    const reconstruir = () => {
      mallaBordes.geometry.dispose()
      mallaBordes.geometry = construirBordes()
      rehacerSustituidas()
    }
    reconstruir()
    return () => {
      ocultaciones.delete(conjunto)
      reconstruir()
    }
  }

  function dibujarGeometrias(geometrias: readonly GeometriaViva[], alPulsar: (id: string) => void) {
    const anillos = geometrias.flatMap((g, i) => g.anillos.map((p) => ({ p, i })))
    const relleno = new THREE.Mesh(
      unir(anillos.map(({ p }) => plano(p, 0.13))),
      pintar(
        new THREE.MeshBasicMaterial({ polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
        'cesped',
      ),
    )
    const lineas = new THREE.LineSegments(
      segmentos(
        anillos.map(({ p }) => p),
        0.17,
        true,
      ),
      pintar(new THREE.LineBasicMaterial(), 'verde'),
    )
    const eleccion = new THREE.Mesh(
      unir(anillos.map(({ p, i }) => conAtributo(plano(p, 0.14), 'area', i))),
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    eleccion.userData = { alPulsar, ids: geometrias.map((g) => g.id) }
    scene.add(relleno, lineas, eleccion)
    mallasVivas.add(eleccion)
    for (const g of geometrias) vivas.set(g.id, g.anillos)
    repintar()
    rehacerSustituidas()
    // Si la vista ya pedía un área viva que no estaba dibujada, ahora sí se vuela a ella.
    if (typeof destinoSeleccion === 'string' && vivas.has(destinoSeleccion)) irAArea(destinoSeleccion)
    return () => {
      mallasVivas.delete(eleccion)
      for (const g of geometrias) if (vivas.get(g.id) === g.anillos) vivas.delete(g.id)
      for (const objeto of [relleno, lineas, eleccion]) {
        scene.remove(objeto)
        objeto.geometry.dispose()
        despintar(objeto.material as THREE.MeshBasicMaterial)
        ;(objeto.material as THREE.Material).dispose()
      }
      rehacerSustituidas()
    }
  }

  function dibujarTrazo(puntos: readonly number[], cerrado: boolean, token: string) {
    const p = [...puntos]
    const lineas = new THREE.LineSegments(
      segmentos([p], 0.3, cerrado),
      new THREE.LineBasicMaterial({ transparent: true, depthTest: false }),
    )
    const objetos: Array<THREE.Mesh | THREE.LineSegments> = [lineas]
    if (cerrado && p.length >= 6) {
      objetos.push(
        new THREE.Mesh(
          plano(p, 0.25),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.28, depthWrite: false, depthTest: false }),
        ),
      )
    }
    // Se redibuja con cada arrastre de un vértice: lee solo su token, no toda la paleta.
    const color = leerToken(token)
    for (const objeto of objetos) {
      const material = objeto.material as THREE.MeshBasicMaterial
      if (color) material.color.set(color)
      pintablesToken.push([material.color, token])
      objeto.renderOrder = 10
      scene.add(objeto)
    }
    pedir()
    return () => {
      for (const objeto of objetos) {
        scene.remove(objeto)
        objeto.geometry.dispose()
        despintar(objeto.material as THREE.MeshBasicMaterial)
        ;(objeto.material as THREE.Material).dispose()
      }
      pedir()
    }
  }

  function anclar(elemento: HTMLElement, x: number, y: number, alto = 3) {
    const objeto = new CSS2DObject(elemento)
    objeto.position.set(x, alto, -y)
    scene.add(objeto)
    pedir()
    const quitar = () => {
      scene.remove(objeto)
      elemento.remove()
      pedir()
    }
    return Object.assign(quitar, {
      mover: (nx: number, ny: number) => {
        objeto.position.set(nx, alto, -ny)
        pedir()
      },
    })
  }

  repintar()

  // --- salto de la construcción con clic, tecla o rueda
  const saltar = (e: Event) => {
    clicDeSalto = e.type === 'pointerdown' && e.target instanceof Node && contenedor.contains(e.target)
    terminarConstruccion()
  }
  function quitarSalto() {
    window.removeEventListener('pointerdown', saltar, { capture: true })
    window.removeEventListener('keydown', saltar, { capture: true })
    window.removeEventListener('wheel', saltar, { capture: true })
  }
  if (!construido) {
    window.addEventListener('pointerdown', saltar, { capture: true })
    window.addEventListener('keydown', saltar, { capture: true })
    window.addEventListener('wheel', saltar, { capture: true, passive: true })
  }

  // --- arranque: la cámara entra girando hacia la vista final
  const fin = vistaDe(opciones.vista)
  if (construido) ponerCamara(fin)
  else {
    ponerCamara({ ...fin, az: fin.az - 0.55, el: Math.min(1.1, fin.el + 0.25), z: fin.z * 0.62 })
    controles.update()
    volar(fin, CONSTRUCCION_S * 1000 + 250, salida)
  }
  controles.update()
  pedir()

  const v1 = new THREE.Vector3()
  const v2 = new THREE.Vector3()
  return {
    repintar,
    pintarAreas,
    ocultarAreas,
    dibujarGeometrias,
    anclar,
    suelo: sueloEnPantalla,
    centro: () => ({ x: controles.target.x, y: -controles.target.z }),
    alPulsarSuelo: (oyente) => {
      oyentesSuelo.add(oyente)
      return () => oyentesSuelo.delete(oyente)
    },
    dibujarTrazo,
    metrosPorPixel: () => (camera.top - camera.bottom) / camera.zoom / tamano().alto,
    alCambiarCamara: (oyente) => {
      oyentesCamara.add(oyente)
      return () => oyentesCamara.delete(oyente)
    },
    enfocar: (x, y, factor = 2) => {
      const ahora = estadoCamara()
      volar({ ...ahora, cx: x, cz: -y, z: Math.min(controles.maxZoom, ahora.z * factor) }, 600)
    },
    irAVista: (vista) => volar(vistaDe(vista)),
    irAArea,
    resaltar: (indice) => {
      destinoFoco = indice
      marcar(foco, indice)
      pedir()
    },
    desplazar: (dx, dy) => {
      camera.updateMatrixWorld()
      const paso = 60 / camera.zoom
      v1.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(dx * paso)
      v2.setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(dy * paso)
      v1.add(v2)
      camera.position.add(v1)
      controles.target.add(v1)
      controles.update()
      pedir()
    },
    acercar: (factor) => {
      camera.zoom = Math.min(controles.maxZoom, Math.max(controles.minZoom, camera.zoom * factor))
      camera.updateProjectionMatrix()
      pedir()
    },
    saltarConstruccion: terminarConstruccion,
    pausar: (valor) => {
      pausada = valor
      if (valor) {
        cancelAnimationFrame(marco)
        pendiente = false
      } else pedir()
    },
    destruir: () => {
      destruida = true
      cancelAnimationFrame(marco)
      observadorTamano?.disconnect()
      quitarSalto()
      renderer.domElement.removeEventListener('pointerdown', alBajar)
      renderer.domElement.removeEventListener('pointerup', alSubir)
      controles.dispose()
      scene.traverse((objeto) => {
        if (!(objeto instanceof THREE.Mesh || objeto instanceof THREE.LineSegments)) return
        objeto.geometry.dispose()
        const material: THREE.Material | THREE.Material[] = objeto.material
        for (const m of Array.isArray(material) ? material : [material]) m.dispose()
      })
      esfera.dispose()
      renderer.dispose()
      renderer.forceContextLoss() // libera el contexto WebGL: el navegador admite pocos a la vez
      renderer.domElement.remove()
      capaEtiquetas.domElement.remove()
    },
  }
}
