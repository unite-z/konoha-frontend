import { useConsulta } from '@/hooks/useConsulta'
import { consultarUbicacionEnMapa } from '@/services/api/mapaAsignaciones'

export function useUbicacionEnMapa(latitud: string, longitud: string, area: string, sugerir = false) {
  const hayPunto = latitud !== '' && longitud !== '' && Math.abs(Number(latitud)) <= 90 && Math.abs(Number(longitud)) <= 180
  const consulta = useConsulta(hayPunto ? `ubicacion-campus:${latitud}:${longitud}:${area}` : null,
    (signal) => consultarUbicacionEnMapa(Number(latitud), Number(longitud), area ? Number(area) : null, signal))
  const datos = consulta.estado === 'exito' ? consulta.datos : null
  const detectada = sugerir && !area && datos?.areas.length === 1 ? datos.areas[0] : undefined
  return {
    area: area || (detectada ? String(detectada.id) : ''),
    detectada,
    candidatas: datos?.areas ?? [],
    ambiguo: sugerir && !area && (datos?.areas.length ?? 0) > 1,
    fuera: datos?.estado === 'fuera',
    cargando: consulta.estado === 'cargando',
    error: consulta.estado === 'error',
    pendiente: Boolean(area && (!hayPunto || datos?.estado === 'pendiente')),
  }
}

