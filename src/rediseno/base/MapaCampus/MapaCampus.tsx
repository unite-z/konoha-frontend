/**
 * MapaCampus (AV-424): mapa 3D del campus con Three.js. Este fichero es el envoltorio ligero: carga los datos con el
 * servicio `campus3d`, decide si hay WebGL y solo entonces hace `import()` de `escena.ts` (el chunk con Three.js).
 *
 * - Una sola parada de tabulación (el lienzo, con `aria-label`). Con el foco: flechas = área activa, Intro la abre,
 *   Mayús+flechas desplazan, + y − acercan, Esc la cierra. La lista alternativa (oculta a la vista) tiene un botón por
 *   área para lectores de pantalla; sin WebGL esa lista se ve entera, con un aviso.
 * - Controlado desde fuera: `areaSeleccionada` (id o posición) y `vista` mueven la cámara; el clic o el teclado llaman a
 *   `onSeleccionarArea` (con `null` si se pulsa fuera de las áreas o Esc).
 * - Construcción inicial una vez por sesión (`sessionStorage`), sin ella con `prefers-reduced-motion` (y vuelos = cortes).
 * - Colores de `--mapa-*` en tiempo de ejecución; un cambio de `data-tema` repinta el mapa.
 * - El escenario persistente del layout (AV-426) lo monta una sola vez; `activo={false}` pausa el dibujo. Las capas
 *   públicas (`CapaColores`, `CapaMarcadores`, `CapaGeometrias`) leen la escena de `onEscena` vía `ContextoMapa`.
 */
import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import Boton from '@/design-system/Boton'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoVacio from '@/design-system/EstadoVacio'
import type { AreaCampus, DatosCampus } from '@/types/campus3d'
import type { Escena, VistaMapa } from './escena'
import estilos from './MapaCampus.module.css'
import { agruparAreas, CLAVE_CONSTRUCCION, indiceDeArea, nombreDeArea } from './areas'
import { observarTema } from './paleta'
import { useCampus } from './useCampus'
import { hayWebGL } from './webgl'

const VISTAS: readonly string[] = ['iso', 'planta', 'baja']

export interface MapaCampusRef {
  /** Vuela a un área (objeto, id o posición) o a una vista. No llama a `onSeleccionarArea`. */
  volarA: (destino: AreaCampus | string | number | VistaMapa) => void
  /** Deshace el último vuelo a un área. */
  volver: () => void
}

export interface MapaCampusProps {
  areaSeleccionada?: number | string
  onSeleccionarArea: (area: AreaCampus | null) => void
  vista?: VistaMapa
  /** Con `false` el mapa deja de dibujar pero sigue en memoria. */
  activo?: boolean
  /** Se llama con la escena y los datos cuando están listos (para las capas) y con `null` al destruirse la escena. */
  onEscena?: (listo: { escena: Escena; datos: DatosCampus } | null) => void
  ref?: Ref<MapaCampusRef>
}

function construccionPendiente(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_CONSTRUCCION) === null
  } catch {
    return true
  }
}

function marcarConstruida() {
  try {
    sessionStorage.setItem(CLAVE_CONSTRUCCION, '1')
  } catch {
    // Sin almacenamiento la construcción se repetirá en la próxima carga: no es grave.
  }
}

const reducirMovimiento = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function MapaCampus({
  areaSeleccionada,
  onSeleccionarArea,
  vista = 'iso',
  activo = true,
  onEscena,
  ref,
}: MapaCampusProps) {
  const campus = useCampus()
  const datos = campus.estado === 'listo' ? campus.datos : null
  const [sinWebGL] = useState(() => !hayWebGL())
  const [falloEscena, setFalloEscena] = useState(false)
  const [escena, setEscena] = useState<Escena | null>(null)
  const [foco, setFoco] = useState<number | null>(null)
  const contenedor = useRef<HTMLDivElement>(null)
  const alSeleccionar = useRef(onSeleccionarArea)
  const alTenerEscena = useRef(onEscena)
  const vistaAplicada = useRef(vista)
  const vistaInicial = useRef(vista)
  const idAyuda = useId()
  const idLista = useId()

  useEffect(() => {
    alSeleccionar.current = onSeleccionarArea
    alTenerEscena.current = onEscena
  })

  useEffect(() => {
    if (!escena || !datos) return
    alTenerEscena.current?.({ escena, datos })
    return () => alTenerEscena.current?.(null)
  }, [escena, datos])

  const grupos = useMemo(() => (datos ? agruparAreas(datos) : null), [datos])
  // Una entrada por área (las de varios polígonos, una vez) en orden alfabético: es el orden de la lista y del foco.
  const lista = useMemo(() => {
    if (!datos || !grupos) return []
    return datos.areas
      .map((area, indice) => ({ area, indice, nombre: nombreDeArea(area) }))
      .filter(({ indice }) => grupos.principal[indice] === indice)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }))
  }, [datos, grupos])

  const usarEscena = datos !== null && !sinWebGL && !falloEscena
  useEffect(() => {
    const destino = contenedor.current
    if (!datos || !usarEscena || !destino) return
    let cancelado = false
    let creada: Escena | null = null
    import('./escena')
      .then(({ crearEscena }) => {
        if (cancelado) return
        const animar = !reducirMovimiento() && construccionPendiente()
        if (animar) marcarConstruida()
        creada = crearEscena({
          contenedor: destino,
          datos,
          vista: vistaInicial.current,
          animar,
          reducirMovimiento: reducirMovimiento(),
          claseEtiqueta: estilos.etiqueta,
          alSeleccionar: (indice) => alSeleccionar.current(indice === null ? null : datos.areas[indice]),
          grupos: agruparAreas(datos),
        })
        vistaAplicada.current = vistaInicial.current
        setEscena(creada)
      })
      .catch(() => {
        if (!cancelado) setFalloEscena(true)
      })
    return () => {
      cancelado = true
      creada?.destruir()
      setEscena(null)
    }
  }, [datos, usarEscena])

  useEffect(() => {
    if (escena) return observarTema(escena.repintar)
  }, [escena])

  useEffect(() => {
    escena?.pausar(!activo)
  }, [escena, activo])

  useEffect(() => {
    if (!escena || vistaAplicada.current === vista) return
    vistaAplicada.current = vista
    escena.irAVista(vista)
  }, [escena, vista])

  const indiceSeleccionado = datos ? indiceDeArea(datos, areaSeleccionada) : null
  // Un id que no está en el campus base puede ser una geometría viva (CapaGeometrias): la escena la busca por id.
  const destino = indiceSeleccionado ?? (typeof areaSeleccionada === 'string' ? areaSeleccionada : null)
  useEffect(() => {
    escena?.irAArea(destino)
  }, [escena, destino])

  useEffect(() => {
    escena?.resaltar(foco)
  }, [escena, foco])

  useImperativeHandle(
    ref,
    () => ({
      volarA: (destino) => {
        if (typeof destino === 'string' && VISTAS.includes(destino)) escena?.irAVista(destino as VistaMapa)
        else if (datos) {
          const posicion = typeof destino === 'object' ? datos.areas.indexOf(destino) : -1
          const indice = indiceDeArea(
            datos,
            typeof destino === 'object' ? (posicion >= 0 ? posicion : destino.id) : destino,
          )
          if (indice !== null) escena?.irAArea(indice)
        }
      },
      volver: () => escena?.irAArea(null),
    }),
    [escena, datos],
  )

  function alPulsarTecla(e: KeyboardEvent<HTMLDivElement>) {
    if (!datos || lista.length === 0) return
    const posicion = lista.findIndex((a) => a.indice === foco)
    const mover = (nueva: number) => {
      const elegida = lista[(nueva + lista.length) % lista.length]
      setFoco(elegida.indice)
    }
    const flechas: Record<string, [number, number]> = {
      ArrowRight: [1, 0],
      ArrowLeft: [-1, 0],
      ArrowUp: [0, 1],
      ArrowDown: [0, -1],
    }
    if (e.shiftKey && flechas[e.key]) {
      escena?.desplazar(...flechas[e.key])
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') mover(posicion + 1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') mover(posicion < 0 ? -1 : posicion - 1)
    else if (e.key === 'Home') mover(0)
    else if (e.key === 'End') mover(-1)
    else if (e.key === '+' || e.key === '=') escena?.acercar(1.25)
    else if (e.key === '-') escena?.acercar(0.8)
    else if (e.key === 'Escape') alSeleccionar.current(null)
    else if ((e.key === 'Enter' || e.key === ' ') && foco !== null) alSeleccionar.current(datos.areas[foco])
    else return
    e.preventDefault()
  }

  const atribucion = (
    <p className={estilos.atribucion}>
      ©{' '}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        OpenStreetMap contributors
      </a>{' '}
      ·{' '}
      <a href="https://openfreemap.org" target="_blank" rel="noreferrer">
        OpenFreeMap
      </a>
    </p>
  )

  if (campus.estado === 'cargando') {
    return (
      <div className={estilos.raiz}>
        <div className={estilos.centrado}>
          <EstadoCarga forma="tarjetas" texto="Cargando el campus…" />
        </div>
        {atribucion}
      </div>
    )
  }
  if (campus.estado === 'error') {
    return (
      <div className={estilos.raiz}>
        <div className={estilos.centrado}>
          <EstadoError
            titulo="No se pudo cargar el mapa del campus"
            descripcion={campus.error.detalle}
            onReintentar={campus.reintentar}
          />
        </div>
        {atribucion}
      </div>
    )
  }

  const botonesAreas = (visible: boolean) => (
    <ul id={idLista} aria-label="Áreas del campus">
      {lista.map(({ area, indice, nombre }) => (
        <li key={indice}>
          <Boton variante="enlace" compacto tabIndex={visible ? 0 : -1} onClick={() => alSeleccionar.current(area)}>
            {nombre}
          </Boton>
        </li>
      ))}
    </ul>
  )

  if (!usarEscena) {
    return (
      <div className={estilos.raiz}>
        <div className={estilos.alternativa}>
          <p role="status">
            Tu navegador no puede mostrar el mapa 3D del campus. Elige un área de la lista para ver su ficha.
          </p>
          {lista.length > 0 ? (
            botonesAreas(true)
          ) : (
            <EstadoVacio
              titulo="No hay áreas en el mapa"
              descripcion="Aparecerán cuando se publiquen los datos del campus."
            />
          )}
        </div>
        {atribucion}
      </div>
    )
  }

  const activa = lista.find((a) => a.indice === foco)
  return (
    <div className={estilos.raiz}>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- widget personalizado (role application) con teclado propio */}
      <div
        ref={contenedor}
        className={estilos.lienzo}
        role="application"
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- única parada de tabulación del mapa
        tabIndex={0}
        aria-label="Mapa 3D del campus PUCP"
        aria-describedby={idAyuda}
        onKeyDown={alPulsarTecla}
      />
      <div className={estilos.oculto}>
        <p id={idAyuda}>
          Flechas para elegir un área, Intro para abrirla, Mayús y flechas para desplazar, más y menos para acercar,
          Escape para cerrar.
        </p>
        <p role="status">{activa ? `Área activa: ${activa.nombre}` : ''}</p>
        {botonesAreas(false)}
      </div>
      {atribucion}
    </div>
  )
}
