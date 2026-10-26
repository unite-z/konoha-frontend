import type { RolTercerizados } from '../types/tercerizados'

/** El jefe de sección y el ingeniero de campo pueden registrar áreas (HU-MOD02-002). */
export function puedeRegistrarAreasVerdes(rol: RolTercerizados | null): boolean {
  return rol === 'Jefe de sección' || rol === 'Ingeniero de campo'
}

/** Solo el jefe de sección mantiene catálogos (RF-INV-003). */
export function puedeGestionarCoberturas(rol: RolTercerizados | null): boolean {
  return rol === 'Jefe de sección'
}
