/**
 * Selectores opcionales de los reportes de gestión del MOD-06 (RF-REP-001 y RF-REP-007): Espacio, Tipo de
 * servicio, Estado y Modalidad. Van dentro de `FiltroPeriodo` (como `children`) y se aplican con su botón.
 *
 * Presentacional: el borrador, los catálogos y los estados permitidos llegan por props.
 * No hay selectores de cuadrilla ni de sector: el back-end aún no los acepta y lo explica en `notas`.
 */
import Selector, { OPCION_TODOS } from '../ui/Selector'
import { OPCIONES_MODALIDAD } from '../../utils/estados'
import type { CatalogosFiltros } from './useCatalogosFiltros'

/** Campos del borrador de filtros, como texto (valor vacío = «Todos»). */
export type CampoFiltroGestion = 'area_verde_id' | 'tipo_servicio_id' | 'estado' | 'modalidad'

export type BorradorFiltrosGestion = Record<CampoFiltroGestion, string>

export interface SelectoresFiltroGestionProps {
  borrador: BorradorFiltrosGestion
  onCambiar: (campo: CampoFiltroGestion, valor: string) => void
  catalogos: CatalogosFiltros
  /** `ESTADOS_FILTRO_PANEL` o `ESTADOS_FILTRO_MAPA`. */
  estados: readonly string[]
  /** Prefijo de los ids de los selectores. */
  idBase: string
}

/** Ayuda fija del selector de tipo de servicio. */
const AYUDA_TIPO_SERVICIO = 'Tipo de actividad del servicio tercerizado'

export default function SelectoresFiltroGestion({
  borrador,
  onCambiar,
  catalogos,
  estados,
  idBase,
}: SelectoresFiltroGestionProps) {
  const opcionesEstado = estados.map((estado) => ({ valor: estado, texto: estado }))
  return (
    <>
      <Selector
        id={`${idBase}-espacio`}
        etiqueta="Espacio"
        valor={borrador.area_verde_id}
        opciones={catalogos.espacios}
        opcionTodos={OPCION_TODOS}
        ayuda={catalogos.ayudaEspacios}
        bloqueadoMotivo={catalogos.motivoBloqueoEspacios}
        onCambiar={(valor) => onCambiar('area_verde_id', valor)}
      />
      <Selector
        id={`${idBase}-tipo-servicio`}
        etiqueta="Tipo de servicio"
        valor={borrador.tipo_servicio_id}
        opciones={catalogos.tiposServicio}
        opcionTodos={OPCION_TODOS}
        ayuda={catalogos.ayudaTipos ? `${AYUDA_TIPO_SERVICIO}. ${catalogos.ayudaTipos}` : AYUDA_TIPO_SERVICIO}
        bloqueadoMotivo={catalogos.motivoBloqueoTipos}
        onCambiar={(valor) => onCambiar('tipo_servicio_id', valor)}
      />
      <Selector
        id={`${idBase}-estado`}
        etiqueta="Estado"
        valor={borrador.estado}
        opciones={opcionesEstado}
        opcionTodos={OPCION_TODOS}
        onCambiar={(valor) => onCambiar('estado', valor)}
      />
      <Selector
        id={`${idBase}-modalidad`}
        etiqueta="Modalidad"
        valor={borrador.modalidad}
        opciones={OPCIONES_MODALIDAD}
        opcionTodos={OPCION_TODOS}
        onCambiar={(valor) => onCambiar('modalidad', valor)}
      />
    </>
  )
}
