import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import type { useUbicacionEnMapa } from './useUbicacionEnMapa'

export default function ValidacionUbicacion({ ubicacion, guardada = false }: {
  ubicacion: ReturnType<typeof useUbicacionEnMapa>
  guardada?: boolean
}) {
  if (ubicacion.fuera) return <AvisoEnLinea compacto tono="error">
    {guardada ? 'El punto guardado está fuera del área vinculada.' : 'El punto está fuera del área seleccionada. Cambia el punto o el área antes de guardar.'}
    {ubicacion.candidatas.length > 0 && ` Áreas en el punto: ${ubicacion.candidatas.map((area) => area.nombre).join(', ')}.`}
  </AvisoEnLinea>
  if (ubicacion.detectada) return <AvisoEnLinea compacto tono="info">Área detectada · {ubicacion.detectada.nombre}</AvisoEnLinea>
  if (!ubicacion.area && ubicacion.candidatas.length > 1) return <AvisoEnLinea compacto tono="info">
    Hay varias áreas en este punto. Elige una para vincular el ejemplar: {ubicacion.candidatas.map((area) => area.nombre).join(', ')}.
  </AvisoEnLinea>
  if (ubicacion.error) return <AvisoEnLinea compacto tono="advertencia">No se pudo comprobar el punto en el mapa.</AvisoEnLinea>
  if (ubicacion.pendiente) return <AvisoEnLinea compacto tono="info">Pendiente de verificar en el mapa.</AvisoEnLinea>
  return null
}
