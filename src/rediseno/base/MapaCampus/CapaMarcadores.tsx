/**
 * CapaMarcadores (AV-426): marcadores sobre el mapa 3D, colgados de `CSS2DRenderer`. El módulo pasa los suyos
 * (incidencias, ejemplares del área abierta…) por lon/lat o por área; la base no sabe qué son.
 *
 * - Los que se solapan en pantalla se agrupan en un botón con el número; al activarlo el mapa se acerca al grupo (o se
 *   llama a `onActivarGrupo`, útil en el zoom máximo). El agrupado se recalcula al cambiar el zoom.
 * - Cada marcador y cada grupo es un botón nativo: se alcanza con Tab y se activa con Intro o Espacio.
 * - Memoriza `marcadores` (`useMemo`) o se recalculan los grupos en cada render.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import estilos from './CapaMarcadores.module.css'
import { useMapa } from './contexto'
import { agruparMarcadores, resolverMarcador, type GrupoMarcadores, type MarcadorMapa } from './marcadores'

export interface CapaMarcadoresProps {
  marcadores: readonly MarcadorMapa[]
  onActivar: (marcador: MarcadorMapa) => void
  /** Se llama al activar un grupo en lugar de acercar el mapa. */
  onActivarGrupo?: (marcadores: MarcadorMapa[]) => void
  etiquetaGrupo?: (cantidad: number) => string
  /** Distancia en píxeles bajo la cual dos marcadores se agrupan. */
  radioPx?: number
}

const redondearEscala = (valor: number) =>
  valor > 0 ? Math.pow(1.05, Math.round(Math.log(valor) / Math.log(1.05))) : 1

const etiquetaGrupoPorDefecto = (n: number) => `${n} marcadores en esta zona. Pulsa para acercar.`

interface Anclado {
  grupo: GrupoMarcadores
  elemento: HTMLDivElement
}

export default function CapaMarcadores({
  marcadores,
  onActivar,
  onActivarGrupo,
  etiquetaGrupo = etiquetaGrupoPorDefecto,
  radioPx = 28,
}: CapaMarcadoresProps) {
  const mapa = useMapa()
  const escena = mapa?.escena
  const datos = mapa?.datos
  const [metrosPorPixel, setMetrosPorPixel] = useState(() => (escena ? redondearEscala(escena.metrosPorPixel()) : 1))
  const [anclados, setAnclados] = useState<Anclado[]>([])
  const anclas = useRef(new Map<string, { elemento: HTMLDivElement; quitar: () => void }>())

  useEffect(() => {
    if (!escena) return
    // La escala se redondea a pasos de 5 % para no recalcular los grupos en cada fotograma del zoom.
    const leer = () => setMetrosPorPixel(redondearEscala(escena.metrosPorPixel()))
    leer()
    return escena.alCambiarCamara(leer)
  }, [escena])

  const grupos = useMemo(() => {
    if (!datos) return []
    const puntos = marcadores.flatMap((m) => resolverMarcador(datos, m) ?? [])
    return agruparMarcadores(puntos, radioPx * metrosPorPixel)
  }, [datos, marcadores, radioPx, metrosPorPixel])

  useEffect(() => {
    if (!escena) return
    const vigentes = new Set(grupos.map((g) => g.clave))
    for (const [clave, ancla] of anclas.current) {
      if (vigentes.has(clave)) continue
      ancla.quitar()
      anclas.current.delete(clave)
    }
    setAnclados(
      grupos.map((grupo) => {
        let ancla = anclas.current.get(grupo.clave)
        if (!ancla) {
          const elemento = document.createElement('div')
          ancla = { elemento, quitar: escena.anclar(elemento, grupo.x, grupo.y) }
          anclas.current.set(grupo.clave, ancla)
        }
        return { grupo, elemento: ancla.elemento }
      }),
    )
  }, [escena, grupos])

  useEffect(() => {
    const actuales = anclas.current
    return () => {
      for (const ancla of actuales.values()) ancla.quitar()
      actuales.clear()
    }
  }, [escena])

  return anclados.map(({ grupo, elemento }) =>
    createPortal(
      grupo.marcadores.length === 1 ? (
        <MarcadorUnico marcador={grupo.marcadores[0]} onActivar={onActivar} />
      ) : (
        // Excepción al sistema (AV-351): marcador del mapa, un botón de vidrio propio colgado de CSS2DRenderer.
        <button
          type="button"
          className={estilos.marcador}
          aria-label={etiquetaGrupo(grupo.marcadores.length)}
          onClick={() => (onActivarGrupo ? onActivarGrupo(grupo.marcadores) : escena?.enfocar(grupo.x, grupo.y, 2.4))}
        >
          {grupo.marcadores.length}
        </button>
      ),
      elemento,
      grupo.clave,
    ),
  )
}

function MarcadorUnico({ marcador, onActivar }: { marcador: MarcadorMapa; onActivar: (m: MarcadorMapa) => void }) {
  return (
    // Excepción al sistema (AV-351): marcador del mapa, un botón de vidrio propio colgado de CSS2DRenderer.
    <button
      type="button"
      className={estilos.marcador}
      aria-label={marcador.etiqueta}
      onClick={() => onActivar(marcador)}
    >
      <span className={estilos.punto} data-tono={marcador.tono ?? 'neutro'} />
    </button>
  )
}
