import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import { nombreUsoMapa, type TipoUsoMapa } from '@/components/mapa/clasificacionMapa'

export type Poligono = AreasVerdesGeoJSON['features'][number]

export function obtenerUsos(mapa: AreasVerdesGeoJSON, tiposUso: TipoUsoMapa[]) {
  const grupos = new Map<string, number>()
  const colores = new Map(tiposUso.map((tipo) => [tipo.nombre.toLocaleLowerCase('es'), tipo.color]))
  for (const poligono of mapa.features) {
    const nombre = nombreUsoMapa(poligono)
    grupos.set(nombre, (grupos.get(nombre) ?? 0) + 1)
  }
  return [...grupos]
    .map(([nombre, cantidad]) => ({
      nombre,
      cantidad,
      color: colores.get(nombre.toLocaleLowerCase('es')) ?? 'var(--color-text-secondary)',
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export function idPoligono(poligono: Poligono) {
  return texto(poligono.properties.mapa_id)
}

export function texto(valor: string | number | null | undefined) {
  return valor == null ? '' : String(valor).trim()
}

export function normalizar(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
    .trim()
}

export function formatearSuperficie(valor: string | number | null | undefined) {
  const superficie = texto(valor)
  return superficie && Number.isFinite(Number(superficie))
    ? new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(Number(superficie)) + ' m²'
    : 'Sin dato'
}
