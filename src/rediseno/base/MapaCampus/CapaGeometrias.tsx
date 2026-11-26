/**
 * CapaGeometrias (AV-426): dibuja, proyectadas sobre el campus, las áreas nuevas o cambiadas que publica
 * `GET /inventario/mapa/geometria`; las versiones antiguas se ocultan. Se eligen con clic como las del campus base
 * (`onSeleccionarArea` recibe un `AreaCampus`) y, como ellas, el `areaSeleccionada` de `useVistaDeMapa` vuela a la
 * geometría y la marca. La petición es única y está en caché; se pide cuando el navegador está
 * ocioso, así que no retrasa el primer pintado. Si el endpoint falla (o no existe: 404) el campus base sigue igual y
 * `onEstado` recibe `'error'`.
 */
import { useEffect, useRef, useState } from 'react'
import type { AreaCampus } from '@/types/campus3d'
import { useMapa } from './contexto'
import {
  areaDeGeometria,
  calcularGeometriasVivas,
  obtenerGeometrias,
  type GeometriaDetectada,
  type ResultadoGeometrias,
} from './geometrias'

export type EstadoGeometrias = 'cargando' | 'listo' | 'error'

export interface CapaGeometriasProps {
  onSeleccionarArea?: (area: AreaCampus) => void
  onEstado?: (estado: EstadoGeometrias, geometrias: readonly GeometriaDetectada[]) => void
}

const cuandoOcioso = (tarea: () => void): (() => void) => {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(tarea)
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(tarea, 0)
  return () => clearTimeout(id)
}

export default function CapaGeometrias({ onSeleccionarArea, onEstado }: CapaGeometriasProps) {
  const mapa = useMapa()
  const escena = mapa?.escena
  const datos = mapa?.datos
  const [resultado, setResultado] = useState<ResultadoGeometrias | null>(null)
  const alSeleccionar = useRef(onSeleccionarArea)
  const alEstado = useRef(onEstado)

  useEffect(() => {
    alSeleccionar.current = onSeleccionarArea
    alEstado.current = onEstado
  })

  useEffect(() => {
    if (!datos) return
    let cancelado = false
    alEstado.current?.('cargando', [])
    const cancelarEspera = cuandoOcioso(() => {
      obtenerGeometrias()
        .then((geojson) => {
          if (cancelado) return
          const calculado = calcularGeometriasVivas(datos, geojson)
          setResultado(calculado)
          alEstado.current?.('listo', calculado.geometrias)
        })
        .catch(() => {
          if (!cancelado) alEstado.current?.('error', [])
        })
    })
    return () => {
      cancelado = true
      cancelarEspera()
    }
  }, [datos])

  useEffect(() => {
    if (!escena || !resultado || resultado.geometrias.length === 0) return
    const { geometrias, ocultar } = resultado
    const restituir = escena.ocultarAreas(ocultar)
    const quitar = escena.dibujarGeometrias(geometrias, (id) => {
      const elegida = geometrias.find((g) => g.id === id)
      if (elegida) alSeleccionar.current?.(areaDeGeometria(elegida))
    })
    return () => {
      quitar()
      restituir()
    }
  }, [escena, resultado])

  return null
}
