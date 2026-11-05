/**
 * Entradas del menú lateral y regla única del elemento activo (AV-341).
 *
 * Cada módulo declara su entrada de primer nivel (texto, ruta, prefijos de URL y permiso de menú) y sus
 * entradas de segundo nivel. El activo se calcula en un solo sitio: gana la coincidencia de prefijo más larga,
 * primero entre módulos y después entre las entradas del módulo activo. Así nunca hay dos marcados a la vez.
 */
import type { NombreIconoFigma } from '@/components/ui/Icono'
import type { EntradaMenu } from '@/config/permisosCore'
import { RUTAS_CAMPO, BASE_CAMPO } from '@/router/rutasCampo'
import {
  PREFIJO_CORTE,
  PREFIJO_INCIDENCIAS,
  PREFIJO_MODULO,
  PREFIJO_PLANIFICACION,
  PREFIJO_TERCERIZADOS,
  PREFIJO_USUARIOS,
  RUTAS,
  RUTAS_CORE,
  RUTAS_CORTE,
  RUTAS_INCIDENCIAS,
  RUTAS_MIS_INCIDENCIAS,
  RUTAS_INVENTARIO,
  RUTAS_PLANIFICACION,
  RUTAS_TERCERIZADOS,
} from '@/router/rutasApp'

export interface EntradaSegundoNivel {
  texto: string
  /** Icono de la Pestaña inferior en móvil (nombre de Figma). */
  icono?: NombreIconoFigma
  /** Texto más corto en la Pestaña inferior («Ajustes» para «Configuración», Figma 352-2038). */
  textoMovil?: string
  /** Sin ruta: pertenece a otro requisito y se muestra sin enlace, con «Próximamente». */
  ruta?: string
}

export interface ModuloMenu {
  /** Entrada de `entradasMenu()`; sin clave, el módulo aún no está disponible. */
  clave?: EntradaMenu
  texto: string
  /** Icono del Elemento de menú (nombre de Figma); en el menú comprimido es lo único visible. */
  icono: NombreIconoFigma
  ruta?: string
  /** Prefijos de URL del módulo: cualquier ruta que empiece por uno de ellos lo marca como activo. */
  prefijos?: string[]
  hijos?: EntradaSegundoNivel[]
}

/** Primer nivel, en el orden de la Arquitectura de la Información. */
export const MODULOS_MENU: ModuloMenu[] = [
  { texto: 'Inicio', icono: 'house' },
  {
    clave: 'planificacion',
    texto: 'Planificación',
    icono: 'calendar',
    ruta: RUTAS_PLANIFICACION.resumen,
    prefijos: [PREFIJO_PLANIFICACION],
    hijos: [
      { texto: 'Resumen', icono: 'dashboard', ruta: RUTAS_PLANIFICACION.resumen },
      { texto: 'Calendario', icono: 'calendar', ruta: RUTAS_PLANIFICACION.calendario },
      { texto: 'Ciclos', icono: 'arrow-right-left', ruta: RUTAS_PLANIFICACION.ciclos },
      { texto: 'Configuración', textoMovil: 'Ajustes', icono: 'sliders', ruta: RUTAS_PLANIFICACION.configuracion },
    ],
  },
  // El capataz en el móvil (AV-271, «Barra inferior · Capataz» de Figma 380-8204): su ruta y su calendario.
  {
    clave: 'corte',
    texto: 'Corte de césped',
    icono: 'scissors',
    ruta: RUTAS_CORTE.rutaDeHoy,
    prefijos: [PREFIJO_CORTE],
    hijos: [
      { texto: 'Ruta de hoy', icono: 'map-pin', ruta: RUTAS_CORTE.rutaDeHoy },
      { texto: 'Calendario', icono: 'calendar', ruta: RUTAS_CORTE.calendario },
    ],
  },
  {
    clave: 'inventario',
    texto: 'Áreas verdes y mapa',
    icono: 'map',
    ruta: RUTAS_INVENTARIO.areasVerdes,
    prefijos: [RUTAS_INVENTARIO.areasVerdes],
    hijos: [
      { texto: 'Inventario de áreas', icono: 'list', ruta: RUTAS_INVENTARIO.areasVerdes },
      { texto: 'Coberturas vegetales', icono: 'leaf', ruta: RUTAS_INVENTARIO.coberturas },
      { texto: 'Catálogos y sectores', icono: 'sliders', ruta: RUTAS_INVENTARIO.catalogos },
      { texto: 'Ejemplares y especies', icono: 'tree', ruta: RUTAS_INVENTARIO.ejemplares },
      { texto: 'Mapa del campus', icono: 'map', ruta: RUTAS_INVENTARIO.mapa },
    ],
  },
  {
    clave: 'campo',
    texto: 'Operación de campo',
    icono: 'clipboard',
    ruta: RUTAS_CAMPO.cuadrillas,
    prefijos: [BASE_CAMPO],
    hijos: [
      { texto: 'Cuadrillas', icono: 'list', ruta: RUTAS_CAMPO.cuadrillas },
      { texto: 'Encargos', icono: 'clipboard', ruta: RUTAS_CAMPO.encargos },
      { texto: 'Actividades por cuadrilla', icono: 'list', ruta: RUTAS_CAMPO.actividades },
      { texto: 'Participantes por actividad', icono: 'check', ruta: RUTAS_CAMPO.participantes },
    ],
  },
  {
    clave: 'tercerizados',
    texto: 'Servicios tercerizados',
    icono: 'truck',
    ruta: RUTAS_TERCERIZADOS.atenciones,
    prefijos: [PREFIJO_TERCERIZADOS],
    hijos: [
      { texto: 'Atenciones', icono: 'list', ruta: RUTAS_TERCERIZADOS.atenciones },
      { texto: 'Proveedores y contratos', icono: 'truck', ruta: RUTAS_TERCERIZADOS.proveedoresContratos },
      { texto: 'Control fitosanitario', icono: 'leaf', ruta: RUTAS_TERCERIZADOS.controlFitosanitario },
    ],
  },
  {
    clave: 'incidencias',
    texto: 'Incidencias',
    icono: 'triangle-alert',
    ruta: RUTAS_INCIDENCIAS.bandeja,
    prefijos: [PREFIJO_INCIDENCIAS],
    hijos: [{ texto: 'Bandeja', icono: 'list', ruta: RUTAS_INCIDENCIAS.bandeja }],
  },
  // Reportar y seguir las incidencias propias (AV-282), para cualquier usuario y sobre todo en el móvil.
  { clave: 'misIncidencias', texto: 'Mis incidencias', icono: 'clipboard', ruta: RUTAS_MIS_INCIDENCIAS.lista, prefijos: [RUTAS_MIS_INCIDENCIAS.lista] },
  {
    clave: 'reportes',
    texto: 'Reportes e indicadores',
    icono: 'chart',
    ruta: RUTAS.reportes,
    prefijos: [PREFIJO_MODULO],
    hijos: [
      { texto: 'Reportes', icono: 'chart', ruta: RUTAS.reportes },
      { texto: 'Panel', icono: 'dashboard', ruta: RUTAS.panel },
      { texto: 'Mapa de atenciones', icono: 'map-pin', ruta: RUTAS.mapaAtenciones },
      { texto: 'Exportaciones', icono: 'download', ruta: RUTAS.exportaciones },
      { texto: 'Asistencia IA', icono: 'search', ruta: RUTAS.asistenciaIa },
    ],
  },
  { clave: 'repositorio', texto: 'Repositorio', icono: 'paperclip', ruta: RUTAS_CORE.repositorio, prefijos: [RUTAS_CORE.repositorio] },
  {
    clave: 'usuarios',
    texto: 'Usuarios y roles',
    icono: 'sliders',
    ruta: RUTAS_CORE.usuarios,
    prefijos: [PREFIJO_USUARIOS],
    hijos: [
      { texto: 'Usuarios', icono: 'list', ruta: RUTAS_CORE.usuarios },
      { texto: 'Registro de accesos', icono: 'clipboard', ruta: RUTAS_CORE.accesos },
      { texto: 'Importación', icono: 'paperclip', ruta: RUTAS_CORE.importacion },
    ],
  },
]

/** `ruta` es `prefijo` o cuelga de él (`/a/b` cuelga de `/a`, pero `/ab` no). */
function cuelgaDe(ruta: string, prefijo: string): boolean {
  return ruta === prefijo || ruta.startsWith(prefijo.endsWith('/') ? prefijo : `${prefijo}/`)
}

/** El candidato cuyo prefijo más largo contiene la ruta, o `null`. */
function masLargo<T>(ruta: string, candidatos: T[], prefijosDe: (candidato: T) => string[]): T | null {
  let mejor: T | null = null
  let largo = -1
  for (const candidato of candidatos) {
    for (const prefijo of prefijosDe(candidato)) {
      if (cuelgaDe(ruta, prefijo) && prefijo.length > largo) {
        mejor = candidato
        largo = prefijo.length
      }
    }
  }
  return mejor
}

export interface ActivoMenu {
  modulo: ModuloMenu | null
  hijo: EntradaSegundoNivel | null
}

/** Módulo y entrada de segundo nivel activos para una ruta: como mucho uno de cada. */
export function activoEnMenu(pathname: string, modulos: ModuloMenu[] = MODULOS_MENU): ActivoMenu {
  const ruta = pathname.split(/[?#]/)[0]
  const modulo = masLargo(ruta, modulos, (m) => m.prefijos ?? [])
  const hijos = (modulo?.hijos ?? []).filter((h) => h.ruta)
  const hijo = masLargo(ruta, hijos, (h) => (h.ruta ? [h.ruta] : []))
  return { modulo, hijo }
}

/** Subentradas con enlace del módulo activo, para la Barra inferior móvil (como mucho 5, como en Figma). */
export function seccionesMoviles(
  pathname: string,
  modulos: ModuloMenu[] = MODULOS_MENU,
): (EntradaSegundoNivel & { ruta: string })[] {
  const { modulo } = activoEnMenu(pathname, modulos)
  return (modulo?.hijos ?? []).filter((hijo): hijo is EntradaSegundoNivel & { ruta: string } => Boolean(hijo.ruta)).slice(0, 5)
}
