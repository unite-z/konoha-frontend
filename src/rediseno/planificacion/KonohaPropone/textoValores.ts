import type { PropuestaCronograma, ValoresCronograma } from '@/types/cronogramaIa'
import { recursosDisponibles, textoPeriodoCorto, valoresDePropuesta, type RecursoOpcion } from '@/utils/cronogramaIa'
import { formatearNumero } from '@/utils/formato'

/** Cómo se nombra cada id de los valores: con lo que trae la propuesta y, si hace falta, el catálogo de espacios. */
export interface NombresCronograma {
  espacio: (id: number | null) => string
  cuadrilla: (id: number | null) => string
  proveedor: (id: number | null) => string
}

const nombreEn = (lista: RecursoOpcion[], id: number | null, texto: string) =>
  id === null ? 'Sin asignar' : (lista.find((e) => e.id === id)?.nombre ?? `${texto} n.º ${id}`)

export function nombresCronograma(
  propuestas: PropuestaCronograma[],
  espacios: RecursoOpcion[] = [],
): NombresCronograma {
  const recursos = recursosDisponibles(propuestas)
  const ubicaciones = propuestas.flatMap((p) =>
    p.area_verde_id === null ? [] : [{ id: p.area_verde_id, nombre: p.ubicacion }],
  )
  return {
    espacio: (id) => nombreEn([...ubicaciones, ...espacios], id, 'Espacio'),
    cuadrilla: (id) => nombreEn(recursos.cuadrillas, id, 'Cuadrilla'),
    proveedor: (id) => nombreEn(recursos.proveedores, id, 'Proveedor'),
  }
}

/** «01 dic. – 03 dic. · Jardín central · Cuadrilla 1 · 3 operarios»: lo que se programará con estos valores. */
export function textoValores(valores: ValoresCronograma, nombres: NombresCronograma): string {
  const responsable =
    valores.cuadrilla_id !== null
      ? nombres.cuadrilla(valores.cuadrilla_id)
      : valores.proveedor_id !== null
        ? nombres.proveedor(valores.proveedor_id)
        : 'Sin responsable'
  const operarios = valores.operarios === null ? null : `${formatearNumero(valores.operarios)} operarios`
  return [
    textoPeriodoCorto(valores.fecha_inicio, valores.fecha_fin),
    nombres.espacio(valores.area_verde_id),
    responsable,
    operarios,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** `true` si los valores son los que propuso Konoha (una modificación sin cambios todavía). */
export function sinCambios(propuesta: PropuestaCronograma, valores: ValoresCronograma | null): boolean {
  if (!valores) return true
  const sugeridos = valoresDePropuesta(propuesta)
  return (Object.keys(sugeridos) as (keyof ValoresCronograma)[]).every((campo) => sugeridos[campo] === valores[campo])
}
