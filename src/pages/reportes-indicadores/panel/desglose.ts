/**
 * Gráficos del panel (RF-REP-001): convierte el desglose de cada indicador en grupos de barras y localiza los
 * registros de cada barra en el detalle. Lógica pura, sin interfaz.
 *
 * Etiquetas del back-end:
 * - atenciones-por-espacio: nombre del espacio, o «Sin espacio».
 * - cumplimiento-tercerizados: estado de la atención (se muestra en el orden del flujo).
 * - consumo-materiales: «Material (unidad)»; se agrupa por unidad para no comparar unidades distintas.
 * - actividades-por-estado: «Estado: …» y «Tipo: …»; distribucion-operarios: «Cuadrilla: …» y «Espacio: …».
 */
import type {
  ClaveIndicadorPanel,
  ElementoDesglose,
  FilaAtencionEspacio,
  FilaAtencionPeriodo,
  FilaMovimientoMaterial,
} from '../../../types/reportesGestion'
import { ESTADOS_FILTRO_PANEL, numeroDeDecimal } from '../../../utils/reportesGestion'

/** Texto del espacio de los registros sin espacio (como «Sin espacio» del back-end). */
export const TEXTO_SIN_ESPACIO = 'Sin espacio'

export interface BarraDesglose {
  /** Etiqueta original del back-end (identifica la barra). */
  etiqueta: string
  /** Texto que se muestra (sin prefijo ni unidad). */
  texto: string
  valor: number
}

export interface GrupoDesglose {
  clave: string
  /** Texto del chip del grupo (por ejemplo, «kg» o «Por estado»). */
  texto: string
  /** Unidad de las cifras del grupo, si la tiene. */
  unidad?: string
  barras: BarraDesglose[]
  /** Barras en el orden del flujo (no de mayor a menor). */
  enOrden: boolean
}

const PREFIJOS: Partial<Record<ClaveIndicadorPanel, { prefijo: string; texto: string }[]>> = {
  'actividades-por-estado': [
    { prefijo: 'Estado: ', texto: 'Por estado' },
    { prefijo: 'Tipo: ', texto: 'Por tipo de actividad' },
  ],
  'distribucion-operarios': [
    { prefijo: 'Cuadrilla: ', texto: 'Por cuadrilla' },
    { prefijo: 'Espacio: ', texto: 'Por espacio' },
  ],
}

const PATRON_UNIDAD = /^(.*) \(([^()]*)\)$/

/** «Fertilizante (kg)» → { material: «Fertilizante», unidad: «kg» }. */
export function separarUnidad(etiqueta: string): { material: string; unidad: string } {
  const partes = PATRON_UNIDAD.exec(etiqueta)
  return partes ? { material: partes[1], unidad: partes[2] } : { material: etiqueta, unidad: '' }
}

function barra(e: ElementoDesglose, texto = e.etiqueta): BarraDesglose {
  return { etiqueta: e.etiqueta, texto, valor: numeroDeDecimal(e.valor) ?? 0 }
}

const deMayorAMenor = (a: BarraDesglose, b: BarraDesglose) => b.valor - a.valor || a.texto.localeCompare(b.texto, 'es')

/** Grupos de barras del desglose de un indicador (al menos uno si hay desglose). */
export function gruposDesglose(clave: ClaveIndicadorPanel, desglose: ElementoDesglose[]): GrupoDesglose[] {
  const prefijos = PREFIJOS[clave]
  if (prefijos) {
    return prefijos
      .map(({ prefijo, texto }) => ({
        clave: prefijo,
        texto,
        enOrden: false,
        barras: desglose
          .filter((e) => e.etiqueta.startsWith(prefijo))
          .map((e) => barra(e, e.etiqueta.slice(prefijo.length)))
          .sort(deMayorAMenor),
      }))
      .filter((g) => g.barras.length > 0)
  }
  if (clave === 'consumo-materiales') {
    const porUnidad = new Map<string, BarraDesglose[]>()
    for (const e of desglose) {
      const { material, unidad } = separarUnidad(e.etiqueta)
      porUnidad.set(unidad, [...(porUnidad.get(unidad) ?? []), barra(e, material)])
    }
    return [...porUnidad.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'es'))
      .map(([unidad, barras]) => ({
        clave: unidad,
        texto: unidad || 'Sin unidad',
        unidad,
        enOrden: false,
        barras: barras.sort(deMayorAMenor),
      }))
  }
  if (clave === 'cumplimiento-tercerizados') {
    const posicion = (e: string) => {
      const i = ESTADOS_FILTRO_PANEL.indexOf(e)
      return i === -1 ? ESTADOS_FILTRO_PANEL.length : i
    }
    const barras = desglose.map((e) => barra(e)).sort((a, b) => posicion(a.etiqueta) - posicion(b.etiqueta))
    return [{ clave: 'estado', texto: 'Por estado', enOrden: true, barras }]
  }
  return [{ clave: 'todo', texto: 'Todo', enOrden: false, barras: desglose.map((e) => barra(e)).sort(deMayorAMenor) }]
}

/** Registros del detalle que forman una barra del desglose (por su etiqueta). */
export function filtroDeBarra(clave: ClaveIndicadorPanel, etiqueta: string): ((fila: unknown) => boolean) | null {
  switch (clave) {
    case 'atenciones-por-espacio':
      return (f) => ((f as FilaAtencionEspacio).espacio ?? TEXTO_SIN_ESPACIO) === etiqueta
    case 'cumplimiento-tercerizados':
      return (f) => (f as FilaAtencionPeriodo).estado === etiqueta
    case 'consumo-materiales':
      return (f) => {
        const m = f as FilaMovimientoMaterial
        return `${m.tipo_material} (${m.unidad})` === etiqueta
      }
    default:
      return null // actividades y operarios: su detalle aún no se puede mostrar (MOD-04)
  }
}

/** Los conteos (atenciones, actividades, operarios) son enteros; el consumo, decimal. */
export function esConteo(clave: ClaveIndicadorPanel): boolean {
  return clave !== 'consumo-materiales'
}

/** `true` si el indicador tiene registros que se pueden mostrar (los de MOD-04 aún no). */
export function tieneRegistros(clave: ClaveIndicadorPanel): boolean {
  return clave === 'atenciones-por-espacio' || clave === 'cumplimiento-tercerizados' || clave === 'consumo-materiales'
}
