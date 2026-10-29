import { solicitarTercerizados } from './clienteTercerizados'
import type { AreaVerde, AreaVerdeEntrada, AsignacionCapataz, AsignacionSectorInventario, CoberturaVegetal, CuartelInventario, EjemplarInventario, ElementoInventario, EspecieVegetal, PaginaAreasVerdes, PersonaInventario, PoligonoMapaAsignado, SectorInventario, UsoFuenteMapa } from '../../types/mod02'

const BASE_INVENTARIO = '/api/v1/inventario'

export function listarEjemplares(q = '', page = 1, signal?: AbortSignal): Promise<EjemplarInventario[]> {
  return solicitarTercerizados<EjemplarInventario[]>('ejemplares', {
    parametros: { q, page }, signal, base: BASE_INVENTARIO,
  })
}

export function crearEjemplar(entrada: {
  codigo_placa_antigua?: string | null
  especie_id?: number | null
  tipo_vegetacion?: string | null
  ubicacion?: string | null
  latitud?: string | null
  longitud?: string | null
  cantidad?: number
}, signal?: AbortSignal): Promise<EjemplarInventario> {
  return solicitarTercerizados<EjemplarInventario>('ejemplares', {
    metodo: 'POST', cuerpo: entrada, signal, base: BASE_INVENTARIO,
  })
}

export function quitarPlacaAntigua(id: number, signal?: AbortSignal): Promise<EjemplarInventario> {
  return solicitarTercerizados<EjemplarInventario>(`ejemplares/${id}/placa-antigua`, {
    metodo: 'DELETE', signal, base: BASE_INVENTARIO,
  })
}

export function listarEspecies(incluirInactivas = false, signal?: AbortSignal): Promise<EspecieVegetal[]> {
  return solicitarTercerizados<EspecieVegetal[]>('especies', {
    parametros: { incluir_inactivas: incluirInactivas }, signal, base: BASE_INVENTARIO,
  })
}

export function crearEspecie(entrada: {
  nombre_comun: string
  nombre_cientifico?: string
  forma_biologica: string
}, signal?: AbortSignal): Promise<EspecieVegetal> {
  return solicitarTercerizados<EspecieVegetal>('especies', {
    metodo: 'POST', cuerpo: entrada, signal, base: BASE_INVENTARIO,
  })
}

export function cambiarEspecie(id: number, cambio: {
  nombre_comun?: string
  nombre_cientifico?: string
  forma_biologica?: string
  activo?: boolean
}, signal?: AbortSignal): Promise<EspecieVegetal> {
  return solicitarTercerizados<EspecieVegetal>(`especies/${id}`, {
    metodo: 'PATCH', cuerpo: cambio, signal, base: BASE_INVENTARIO,
  })
}

export function listarAreasVerdes(
  filtros: { q?: string; sector_id?: number; tipo_uso_id?: number; cuartel_id?: number; page?: number } = {},
  signal?: AbortSignal,
): Promise<PaginaAreasVerdes> {
  return solicitarTercerizados<PaginaAreasVerdes>('areas-verdes/', {
    parametros: filtros,
    signal,
    base: BASE_INVENTARIO,
  })
}

export function listarTiposUso(incluirInactivos = false, signal?: AbortSignal): Promise<ElementoInventario[]> {
  return solicitarTercerizados<ElementoInventario[]>('tipos-uso', {
    parametros: { incluir_inactivos: incluirInactivos }, signal, base: BASE_INVENTARIO,
  })
}

export function crearTipoUso(nombre: string, signal?: AbortSignal): Promise<ElementoInventario> {
  return solicitarTercerizados<ElementoInventario>('tipos-uso', { metodo: 'POST', cuerpo: { nombre }, signal, base: BASE_INVENTARIO })
}

export function cambiarTipoUso(id: number, cambio: { nombre?: string; activo?: boolean }, signal?: AbortSignal): Promise<ElementoInventario> {
  return solicitarTercerizados<ElementoInventario>(`tipos-uso/${id}`, { metodo: 'PATCH', cuerpo: cambio, signal, base: BASE_INVENTARIO })
}

export function listarCuarteles(incluirDesaparecidos = false, signal?: AbortSignal): Promise<CuartelInventario[]> {
  return solicitarTercerizados<CuartelInventario[]>('cuarteles', { parametros: { incluir_desaparecidos: incluirDesaparecidos }, signal, base: BASE_INVENTARIO })
}

export function crearCuartel(entrada: { numero: string; nombre: string }, signal?: AbortSignal): Promise<CuartelInventario> {
  return solicitarTercerizados<CuartelInventario>('cuarteles', { metodo: 'POST', cuerpo: entrada, signal, base: BASE_INVENTARIO })
}

export function cambiarCuartel(id: number, estado: 'vigente' | 'desaparecido', signal?: AbortSignal): Promise<CuartelInventario> {
  return solicitarTercerizados<CuartelInventario>(`cuarteles/${id}`, { metodo: 'PATCH', cuerpo: { estado }, signal, base: BASE_INVENTARIO })
}

export function listarSectores(incluirInactivos = false, signal?: AbortSignal): Promise<SectorInventario[]> {
  return solicitarTercerizados<SectorInventario[]>('sectores', { parametros: { incluir_inactivos: incluirInactivos }, signal, base: BASE_INVENTARIO })
}

export function crearSector(entrada: { nombre: string; atencion_demanda: boolean }, signal?: AbortSignal): Promise<SectorInventario> {
  return solicitarTercerizados<SectorInventario>('sectores', { metodo: 'POST', cuerpo: entrada, signal, base: BASE_INVENTARIO })
}

export function cambiarSector(id: number, cambio: { activo?: boolean; atencion_demanda?: boolean }, signal?: AbortSignal): Promise<SectorInventario> {
  return solicitarTercerizados<SectorInventario>(`sectores/${id}`, { metodo: 'PATCH', cuerpo: cambio, signal, base: BASE_INVENTARIO })
}

export function asignarCapataz(sectorId: number, capatazId: number | null, signal?: AbortSignal): Promise<SectorInventario> {
  return solicitarTercerizados<SectorInventario>(`sectores/${sectorId}/capataz`, { metodo: 'PATCH', cuerpo: { capataz_id: capatazId }, signal, base: BASE_INVENTARIO })
}

export function listarCapataces(signal?: AbortSignal): Promise<PersonaInventario[]> {
  return solicitarTercerizados<PersonaInventario[]>('capataces', { signal, base: BASE_INVENTARIO })
}

export function listarHistorialCapataz(sectorId: number, signal?: AbortSignal): Promise<AsignacionCapataz[]> {
  return solicitarTercerizados<AsignacionCapataz[]>(`sectores/${sectorId}/historial-capataz`, { signal, base: BASE_INVENTARIO })
}

export function listarCoberturasActivas(signal?: AbortSignal): Promise<CoberturaVegetal[]> {
  return solicitarTercerizados<CoberturaVegetal[]>('coberturas/', { signal, base: BASE_INVENTARIO })
}

export function listarCoberturas(incluirInactivas = true, signal?: AbortSignal): Promise<CoberturaVegetal[]> {
  return solicitarTercerizados<CoberturaVegetal[]>('coberturas/', {
    parametros: { incluir_inactivas: incluirInactivas },
    signal,
    base: BASE_INVENTARIO,
  })
}

export function crearCobertura(nombre: string, signal?: AbortSignal): Promise<CoberturaVegetal> {
  return solicitarTercerizados<CoberturaVegetal>('coberturas/', {
    metodo: 'POST',
    cuerpo: { nombre },
    signal,
    base: BASE_INVENTARIO,
  })
}

export function modificarCobertura(
  id: number,
  cambio: { nombre?: string; activo?: boolean },
  signal?: AbortSignal,
): Promise<CoberturaVegetal> {
  return solicitarTercerizados<CoberturaVegetal>(`coberturas/${id}/`, {
    metodo: 'PATCH',
    cuerpo: cambio,
    signal,
    base: BASE_INVENTARIO,
  })
}

export function registrarAreaVerde(entrada: AreaVerdeEntrada, signal?: AbortSignal): Promise<AreaVerde> {
  return solicitarTercerizados<AreaVerde>('areas-verdes/', {
    metodo: 'POST',
    cuerpo: entrada,
    signal,
    base: BASE_INVENTARIO,
  })
}

export function modificarAreaVerde(id: number, cambio: { nombre?: string; lugar?: string; ubicacion?: string; superficie_m2?: string; activo?: boolean }, signal?: AbortSignal): Promise<AreaVerde> {
  return solicitarTercerizados<AreaVerde>(`areas-verdes/${id}/`, { metodo: 'PATCH', cuerpo: cambio, signal, base: BASE_INVENTARIO })
}

export function asignarAreaSector(id: number, sector_id: number | null, signal?: AbortSignal): Promise<AreaVerde> {
  return solicitarTercerizados<AreaVerde>(`areas-verdes/${id}/sector/`, { metodo: 'PATCH', cuerpo: { sector_id }, signal, base: BASE_INVENTARIO })
}

export function listarHistorialSectorArea(id: number, signal?: AbortSignal): Promise<AsignacionSectorInventario[]> {
  return solicitarTercerizados<AsignacionSectorInventario[]>(`areas-verdes/${id}/historial-sector/`, { signal, base: BASE_INVENTARIO })
}

export function listarUsosFuenteMapa(signal?: AbortSignal): Promise<UsoFuenteMapa[]> {
  return solicitarTercerizados<UsoFuenteMapa[]>('mapa/usos-fuente', { signal, base: BASE_INVENTARIO })
}

export function clasificarUsoFuenteMapa(
  uso_fuente: string,
  tipo_uso_id: number | null,
  signal?: AbortSignal,
): Promise<UsoFuenteMapa> {
  return solicitarTercerizados<UsoFuenteMapa>('mapa/usos-fuente', {
    metodo: 'PUT', cuerpo: { uso_fuente, tipo_uso_id }, signal, base: BASE_INVENTARIO,
  })
}

export function listarPoligonosMapa(signal?: AbortSignal): Promise<PoligonoMapaAsignado[]> {
  return solicitarTercerizados<PoligonoMapaAsignado[]>('mapa/poligonos', { signal, base: BASE_INVENTARIO })
}

export function asignarPoligonoMapa(
  id_fuente: string,
  area_verde_id: number | null,
  signal?: AbortSignal,
): Promise<PoligonoMapaAsignado> {
  return solicitarTercerizados<PoligonoMapaAsignado>(`mapa/poligonos/${id_fuente}`, {
    metodo: 'PUT', cuerpo: { area_verde_id }, signal, base: BASE_INVENTARIO,
  })
}

export async function listarTodasLasAreasVerdes(signal?: AbortSignal): Promise<AreaVerde[]> {
  const areas: AreaVerde[] = []
  let pagina = 1
  while (true) {
    const resultado = await listarAreasVerdes({ page: pagina }, signal)
    areas.push(...resultado.results)
    if (resultado.next === null) return areas
    pagina = resultado.next
  }
}
