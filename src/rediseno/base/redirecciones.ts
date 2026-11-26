import {
  PREFIJO_CORTE,
  PREFIJO_MODULO,
  PREFIJO_INCIDENCIAS,
  PREFIJO_PLANIFICACION,
  PREFIJO_TERCERIZADOS,
  RUTAS,
  RUTAS_CORE,
  RUTAS_CORTE,
  RUTAS_INVENTARIO,
  RUTAS_MIS_INCIDENCIAS,
  RUTAS_PLANIFICACION,
  RUTAS_PLANIFICACION_ANTIGUAS,
  RUTAS_TERCERIZADOS,
  PREFIJO_USUARIOS,
} from '@/router/rutasApp'
import { BASE_CAMPO, RUTAS_CAMPO } from '@/router/rutasCampo'
import { rutaCampo } from '../campo/enlaces'
import { rutaCuenta } from '../cuenta/enlaces'
import { rutaIncidencias } from '../incidencias/enlaces'
import { rutaMapa } from '../mapa/enlaces'
import { rutaPlanificacion } from '../planificacion/enlaces'
import { PREFIJO_REDISENO } from '../prefijo'
import { rutaProveedores } from '../proveedores/enlaces'
import { rutaReportes } from '../reportes/enlaces'

type Parametros = Record<string, string>

interface Regla {
  /** Ruta antigua; un segmento `:nombre` admite cualquier valor. */
  origen: string
  /** Ruta nueva, siempre con el prefijo del diseño nuevo. */
  destino: string
  /** Parámetros de consulta que se añaden (la consulta de la URL antigua manda si ya los trae). */
  consulta?: (parametros: Parametros) => Parametros
}

export interface DestinoRediseno {
  pathname: string
  search: string
}

/**
 * Rutas antiguas que no se redirigen: el ingreso y el cambio de contraseña no cuelgan de `/n` (hoy `/n` exige sesión;
 * V01 los traerá bajo el prefijo). El test las exige en esta lista o en la tabla: ninguna ruta se queda sin decidir.
 */
export const RUTAS_QUE_SE_CONSERVAN: readonly string[] = [RUTAS_CORE.ingreso, RUTAS_CORE.cambiarContrasena]

const INICIO = PREFIJO_REDISENO
const r = (origen: string, destino: string, consulta?: Regla['consulta']): Regla => ({ origen, destino, consulta })

const PODA = RUTAS_INVENTARIO.campanasPoda
const FITO = RUTAS_TERCERIZADOS.controlFitosanitario
const PROVEEDORES_CONTRATOS = RUTAS_TERCERIZADOS.proveedoresContratos

/**
 * Tabla ruta antigua → vista nueva (matriz de cobertura: N-06 a N-11, M2 a M6). Hasta que cada módulo construya sus
 * subrutas, el destino es la raíz de su sección; los parámetros del plan (`?area=`, `?incidencia=`, `?atencion_id=`…)
 * viajan en la consulta.
 */
const REGLAS: readonly Regla[] = [
  r('/', INICIO),

  // MOD-02 · inventario → Mapa
  r(RUTAS_INVENTARIO.areasVerdes, rutaMapa()),
  r(RUTAS_INVENTARIO.mapa, rutaMapa()),
  r(RUTAS_INVENTARIO.nuevaArea, rutaMapa(), () => ({ registrar: '1' })),
  r(`${RUTAS_INVENTARIO.areasVerdes}/:id/editar`, rutaMapa(), ({ id }) => ({ area: id })),
  r(RUTAS_INVENTARIO.coberturas, rutaMapa()),
  r(RUTAS_INVENTARIO.catalogos, rutaMapa()),
  r(RUTAS_INVENTARIO.ejemplares, rutaMapa()),
  r(RUTAS_INVENTARIO.fichaTecnica, rutaMapa()),
  r(`${RUTAS_INVENTARIO.ejemplares}/:id/ficha-tecnica`, rutaMapa()),
  r(PODA, rutaMapa()),
  r(RUTAS_INVENTARIO.nuevaCampanaPoda, rutaMapa()),
  r(`${PODA}/:id`, rutaMapa()),
  r(`${PODA}/:id/editar`, rutaMapa()),
  r(`${PODA}/:id/registrar`, rutaMapa()),
  r(`${PODA}/:id/rendimiento`, rutaMapa()),
  r(`${PODA}/:id/especies`, rutaMapa()),
  r(RUTAS_INVENTARIO.podaAltura, rutaMapa()),
  r(`${RUTAS_INVENTARIO.areasVerdes}/intervenciones-poda/:id`, rutaMapa()),
  r(RUTAS_INVENTARIO.rutaCorte, rutaPlanificacion(), () => ({ seccion: 'ruta' })),

  // MOD-03 · planificación → Planificación; ruta de hoy del capataz → Campo
  r(PREFIJO_PLANIFICACION, rutaPlanificacion()),
  r(RUTAS_PLANIFICACION.resumen, rutaPlanificacion()),
  r(RUTAS_PLANIFICACION.calendario, rutaPlanificacion()),
  r(RUTAS_PLANIFICACION.ciclos, rutaPlanificacion()),
  r(`${RUTAS_PLANIFICACION.ciclos}/:id`, rutaPlanificacion(), ({ id }) => ({ ciclo: id })),
  r(RUTAS_PLANIFICACION.configuracion, rutaPlanificacion()),
  r(RUTAS_PLANIFICACION_ANTIGUAS.servicios, rutaPlanificacion()),
  r(RUTAS_PLANIFICACION_ANTIGUAS.restricciones, rutaPlanificacion()),
  r(PREFIJO_CORTE, rutaCampo()),
  r(RUTAS_CORTE.rutaDeHoy, rutaCampo()),
  r(RUTAS_CORTE.calendario, rutaCampo()),

  // MOD-03 · incidencias → Incidencias
  r(PREFIJO_INCIDENCIAS, rutaIncidencias()),
  r(`${PREFIJO_INCIDENCIAS}/:id`, rutaIncidencias(), ({ id }) => ({ incidencia: id })),
  r(RUTAS_MIS_INCIDENCIAS.lista, rutaIncidencias()),
  r(`${RUTAS_MIS_INCIDENCIAS.lista}/:id`, rutaIncidencias(), ({ id }) => ({ incidencia: id })),

  // MOD-04 · operación de campo → Planificación (cuadrillas)
  r(BASE_CAMPO, rutaPlanificacion()),
  r(RUTAS_CAMPO.ingreso, rutaPlanificacion()),
  r(RUTAS_CAMPO.cuadrillas, rutaPlanificacion()),
  r(RUTAS_CAMPO.encargos, rutaPlanificacion()),
  r(RUTAS_CAMPO.actividades, rutaPlanificacion()),
  r(RUTAS_CAMPO.participantes, rutaPlanificacion()),
  r(RUTAS_CAMPO.catalogoActividades, rutaPlanificacion()),

  // MOD-05 · servicios tercerizados → Proveedores
  r(PREFIJO_TERCERIZADOS, rutaProveedores()),
  r(`${PREFIJO_TERCERIZADOS}/ingreso`, INICIO),
  r(RUTAS_TERCERIZADOS.atenciones, rutaProveedores()),
  r(RUTAS_TERCERIZADOS.nuevaAtencion, rutaProveedores()),
  r(`${RUTAS_TERCERIZADOS.atenciones}/:id`, rutaProveedores(), ({ id }) => ({ atencion_id: id })),
  r(PROVEEDORES_CONTRATOS, rutaProveedores()),
  r(RUTAS_TERCERIZADOS.nuevoProveedor, rutaProveedores()),
  r(`${PROVEEDORES_CONTRATOS}/proveedores/:id`, rutaProveedores()),
  r(`${PROVEEDORES_CONTRATOS}/proveedores/:id/editar`, rutaProveedores()),
  r(RUTAS_TERCERIZADOS.nuevoContrato, rutaProveedores()),
  r(`${PROVEEDORES_CONTRATOS}/contratos/:id`, rutaProveedores()),
  r(`${PROVEEDORES_CONTRATOS}/contratos/:id/editar`, rutaProveedores()),
  r(FITO, rutaProveedores()),
  r(RUTAS_TERCERIZADOS.marcarEjemplar, rutaProveedores()),
  r(RUTAS_TERCERIZADOS.planFitosanitario, rutaProveedores()),
  r(`${FITO}/:id`, rutaProveedores()),
  r(`${FITO}/:id/aplicaciones/nueva`, rutaProveedores()),
  r(RUTAS_TERCERIZADOS.observacionesPlagas, rutaProveedores()),
  r(RUTAS_TERCERIZADOS.nuevaObservacionPlaga, rutaProveedores()),
  r(`${RUTAS_TERCERIZADOS.observacionesPlagas}/:id`, rutaProveedores()),
  r(RUTAS_TERCERIZADOS.productosAgronomicos, rutaProveedores()),
  r(RUTAS_TERCERIZADOS.nuevoProductoAgronomico, rutaProveedores()),
  r(`${RUTAS_TERCERIZADOS.productosAgronomicos}/:id`, rutaProveedores()),
  r(`${RUTAS_TERCERIZADOS.productosAgronomicos}/:id/editar`, rutaProveedores()),

  // MOD-06 · reportes e indicadores → Reportes; cada asistente de IA vive en su módulo (M6-12)
  r(PREFIJO_MODULO, rutaReportes()),
  r(RUTAS.reportes, rutaReportes()),
  r(RUTAS.cumplimientoCorte, rutaReportes()),
  r(RUTAS.distribucionPersonal, rutaReportes()),
  r(RUTAS.atencionesEspacioSector, rutaReportes()),
  r(RUTAS.materialVegetal, rutaReportes()),
  r(RUTAS.reporteServicioTercerizado, rutaReportes()),
  r(RUTAS.programadoEjecutado, rutaReportes()),
  r(RUTAS.panel, rutaReportes()),
  r(`${RUTAS.panel}/:indicador`, rutaReportes(), ({ indicador }) => ({ informe: indicador })),
  r(RUTAS.exportaciones, rutaReportes()),
  r(RUTAS.mapaAtenciones, rutaMapa(), () => ({ capa: 'atenciones' })),
  r(RUTAS.asistenciaIa, rutaReportes()),
  r(RUTAS.extraccionReportes, rutaProveedores()),
  r(`${RUTAS.extraccionReportes}/:id`, rutaProveedores()),
  r(RUTAS.priorizacionIa, rutaIncidencias()),
  r(`${RUTAS.priorizacionIa}/:id`, rutaIncidencias()),
  r(RUTAS.inconsistenciasIa, rutaCuenta()),
  r(`${RUTAS.inconsistenciasIa}/:id`, rutaCuenta()),
  r(RUTAS.cronogramaIa, rutaPlanificacion()),
  r(`${RUTAS.cronogramaIa}/:id`, rutaPlanificacion()),
  r(RUTAS.estimacionRecursos, rutaPlanificacion()),
  r(`${RUTAS.estimacionRecursos}/:id`, rutaPlanificacion()),
  r(RUTAS.clasificacionIncidencias, rutaIncidencias()),
  r(`${RUTAS.clasificacionIncidencias}/:id`, rutaIncidencias()),
  r(RUTAS.evidenciaFitosanitaria, rutaProveedores()),
  r(`${RUTAS.evidenciaFitosanitaria}/:id`, rutaProveedores()),

  // MOD-01 · core → Cuenta (V12)
  r(RUTAS_CORE.configuracion, rutaCuenta()),
  r(RUTAS_CORE.configuracionApariencia, rutaCuenta()),
  r(RUTAS_CORE.configuracionIa, rutaCuenta()),
  r(RUTAS_CORE.configuracionUsoIa, rutaCuenta()),
  r(RUTAS_CORE.pendientes, rutaCuenta()),
  r(RUTAS_CORE.repositorio, rutaCuenta()),
  r(PREFIJO_USUARIOS, rutaCuenta()),
  r(RUTAS_CORE.usuarios, rutaCuenta()),
  r(`${RUTAS_CORE.usuarios}/:id`, rutaCuenta()),
  r(RUTAS_CORE.accesos, rutaCuenta()),
  r(RUTAS_CORE.importacion, rutaCuenta()),
  r(RUTAS_CORE.rolesPermisos, rutaCuenta()),
]

function segmentos(ruta: string): string[] {
  return ruta.split('/').filter(Boolean)
}

function comodines(origen: string): number {
  return segmentos(origen).filter((s) => s.startsWith(':')).length
}

/** Primero las reglas con menos comodines: `campanas-poda/nueva` gana a `campanas-poda/:id`. */
const ORDENADAS = [...REGLAS].sort((a, b) => comodines(a.origen) - comodines(b.origen))

function parametrosDe(origen: string, ruta: string): Parametros | null {
  const patron = segmentos(origen)
  const real = segmentos(ruta)
  if (patron.length !== real.length) return null
  const parametros: Parametros = {}
  for (const [i, parte] of patron.entries()) {
    const valor = real[i] ?? ''
    if (parte.startsWith(':')) {
      try {
        parametros[parte.slice(1)] = decodeURIComponent(valor)
      } catch {
        return null
      }
    } else if (parte !== valor) return null
  }
  return parametros
}

/**
 * Destino en el diseño nuevo de una ruta antigua, o `null` si no tiene y se queda donde está. Conserva la consulta
 * recibida (`?area=`, `?incidencia_id=`…) y añade los parámetros que pide la vista nueva sin pisar los que ya vienen.
 */
export function destinoRediseno(ruta: string, search = ''): DestinoRediseno | null {
  for (const regla of ORDENADAS) {
    const parametros = parametrosDe(regla.origen, ruta)
    if (!parametros) continue
    const consulta = new URLSearchParams(search)
    for (const [clave, valor] of Object.entries(regla.consulta?.(parametros) ?? {})) {
      if (!consulta.has(clave)) consulta.set(clave, valor)
    }
    const texto = consulta.toString()
    return { pathname: regla.destino, search: texto ? `?${texto}` : '' }
  }
  return null
}
