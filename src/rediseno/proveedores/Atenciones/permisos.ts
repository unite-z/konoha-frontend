import { PERMISOS_TERCERIZADOS } from '@/config/permisosTercerizados'

/** Consultar la bandeja, exportarla y subir informes: `SER.ATENCION.REGISTRAR` (el backend lo vuelve a comprobar). */
export function puedeConsultarAtenciones(permisos: readonly string[] | null): boolean {
  return permisos !== null && permisos.includes(PERMISOS_TERCERIZADOS.registrarAtencion)
}
