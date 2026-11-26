import { useEffect, useMemo, useState } from 'react'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import Selector from '@/design-system/Selector'
import { useConsulta } from '@/hooks/useConsulta'
import { useUbicacionEnMapa } from '@/pages/inventario/useUbicacionEnMapa'
import { aErrorApi } from '@/services/api/cliente'
import { corregirUbicacionEjemplar } from '@/services/api/ejemplares'
import { listarTodasLasAreasVerdes } from '@/services/api/mapaAsignaciones'
import type { EjemplarInventario } from '@/types/ejemplares'
import HerramientaPunto, { type PuntoLonLat } from '@/rediseno/base/MapaCampus/HerramientaPunto'
import estilos from './FichaEjemplar.module.css'

interface Props {
  ejemplar: EjemplarInventario
  onGuardada: (ejemplar: EjemplarInventario) => void
  onCancelar: () => void
}

/**
 * «Editar ubicación»: la ficha se aparta y esta barra de vidrio lleva la herramienta de punto del mapa. Con
 * `useUbicacionEnMapa` valida el punto en el servidor y la herramienta enseña los tres avisos (fuera del área, área
 * detectada y varias áreas en el punto). Solo se guarda un punto nuevo, dentro de su área y sin ambigüedad.
 */
export default function EditarUbicacion({ ejemplar, onGuardada, onCancelar }: Props) {
  const [punto, setPunto] = useState<PuntoLonLat | null>(null)
  const [area, setArea] = useState(ejemplar.area_verde_id === null ? '' : String(ejemplar.area_verde_id))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const areas = useConsulta('rd-ficha-areas', listarTodasLasAreasVerdes)

  const validacion = useUbicacionEnMapa(punto ? String(punto.lat) : '', punto ? String(punto.lon) : '', area, true)
  const puntoActual = useMemo<PuntoLonLat | null>(
    () =>
      ejemplar.latitud !== null && ejemplar.longitud !== null
        ? { lat: ejemplar.latitud, lon: ejemplar.longitud }
        : null,
    [ejemplar.latitud, ejemplar.longitud],
  )
  const opciones = useMemo(
    () =>
      (areas.datos ?? []).map((a) => ({
        valor: String(a.id),
        texto: a.nombre,
      })),
    [areas.datos],
  )
  const puedeGuardar = punto !== null && !validacion.fuera && !validacion.cargando && !validacion.ambiguo

  // Esc cancela la edición (el mapa no tiene diálogo que lo capture).
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCancelar()
    }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [onCancelar])

  async function guardar() {
    if (!punto || !puedeGuardar || guardando) return
    setGuardando(true)
    setError(null)
    try {
      const areaNueva = validacion.area ? Number(validacion.area) : null
      const actualizado = await corregirUbicacionEjemplar(ejemplar.id, {
        latitud: punto.lat,
        longitud: punto.lon,
        ...(areaNueva !== null && areaNueva !== ejemplar.area_verde_id ? { area_verde_id: areaNueva } : {}),
      })
      onGuardada(actualizado)
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className={estilos.barraUbicacion} aria-label={`Editar la ubicación de ${ejemplar.codigo}`}>
      <h2 className={estilos.tituloBarra}>Editar ubicación · {ejemplar.codigo}</h2>
      <HerramientaPunto punto={punto} onElegir={setPunto} validacion={validacion} puntoActual={puntoActual} />
      {opciones.length > 0 && (
        <Selector
          id="ficha-area-ubicacion"
          etiqueta="Área verde del ejemplar"
          valor={validacion.area}
          onCambiar={setArea}
          opciones={opciones}
          opcionTodos={ejemplar.area_verde_id === null ? 'Sin área vinculada' : undefined}
        />
      )}
      {error && (
        <AvisoEnLinea tono="error" compacto>
          {error}
        </AvisoEnLinea>
      )}
      <div className={estilos.acciones}>
        <Boton
          variante="primario"
          compacto
          cargando={guardando}
          deshabilitado={!puedeGuardar}
          onClick={() => void guardar()}
        >
          Guardar ubicación
        </Boton>
        <Boton variante="secundario" compacto deshabilitado={guardando} onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </section>
  )
}
