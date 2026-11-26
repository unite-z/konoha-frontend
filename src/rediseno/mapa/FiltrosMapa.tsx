import { useId } from 'react'
import Selector, { type OpcionSelector } from '@/design-system/Selector'
import type { FiltrosMapa } from './areasMapa'

export interface OpcionesFiltros {
  sectores: OpcionSelector[]
  usos: OpcionSelector[]
  cuarteles: OpcionSelector[]
}

interface Props {
  valores: FiltrosMapa
  opciones: OpcionesFiltros
  onCambiar: (filtro: 'sector' | 'uso' | 'cuartel', valor: string) => void
}

/** Sector, tipo de uso y cuartel. Los valores viven en la URL: este componente solo avisa del cambio. */
export default function FiltrosMapaCampos({ valores, opciones, onCambiar }: Props) {
  const id = useId()
  return (
    <>
      <Selector
        id={`${id}-sector`}
        etiqueta="Sector"
        compacto
        valor={valores.sector}
        opciones={opciones.sectores}
        opcionTodos="Todos"
        onCambiar={(valor) => onCambiar('sector', valor)}
      />
      <Selector
        id={`${id}-uso`}
        etiqueta="Tipo de uso"
        compacto
        valor={valores.uso}
        opciones={opciones.usos}
        opcionTodos="Todos"
        onCambiar={(valor) => onCambiar('uso', valor)}
      />
      <Selector
        id={`${id}-cuartel`}
        etiqueta="Cuartel"
        compacto
        valor={valores.cuartel}
        opciones={opciones.cuarteles}
        opcionTodos="Todos"
        onCambiar={(valor) => onCambiar('cuartel', valor)}
      />
    </>
  )
}
