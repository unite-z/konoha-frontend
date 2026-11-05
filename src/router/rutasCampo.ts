export const BASE_CAMPO = '/operacion-campo'
export const RUTAS_CAMPO = {
  ingreso: `${BASE_CAMPO}/ingreso`,
  cuadrillas: `${BASE_CAMPO}/cuadrillas`,
  encargos: `${BASE_CAMPO}/encargos`,
  actividades: `${BASE_CAMPO}/actividades`,
  participantes: `${BASE_CAMPO}/participantes`,
  catalogoActividades: `${BASE_CAMPO}/catalogo-actividades`,
} as const
export function esRutaCampo(path: string): boolean { return path===BASE_CAMPO || path.startsWith(`${BASE_CAMPO}/`) }
export function destinoCampo(path: string | null): string {
  if(!path||path.startsWith('//')||path.includes('\\')||Array.from(path).some(c=>c.charCodeAt(0)<32)) return RUTAS_CAMPO.cuadrillas
  const base=path.split(/[?#]/)[0]
  return [RUTAS_CAMPO.cuadrillas,RUTAS_CAMPO.encargos,RUTAS_CAMPO.actividades,RUTAS_CAMPO.participantes,RUTAS_CAMPO.catalogoActividades].some(ruta => ruta === base) ? path : RUTAS_CAMPO.cuadrillas
}
