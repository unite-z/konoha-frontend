/**
 * Selectores opcionales de los reportes de gestión del MOD-06 (RF-REP-001 y RF-REP-007): Espacio, Tipo de
 * servicio, Estado y Modalidad. Van dentro de `FiltroPeriodo` (como `children`) y se aplican con su botón.
 *
 * Presentacional: el borrador, los catálogos y los estados permitidos llegan por props.
 * No hay selectores de cuadrilla ni de sector: el back-end aún no los acepta y lo explica en `notas`.
 *
 * La ayuda fija de «Tipo de servicio» va en una ayuda emergente (icono de información) para no descuadrar la
 * barra; los avisos variables del catálogo (por ejemplo, incompleto) siguen visibles bajo el campo.
 */
import Selector, { OPCION_TODOS } from '../ui/Selector'
import AyudaEmergente from './AyudaEmergente'
import { OPCIONES_MODALIDAD } from '../../utils/estados'
import estilos from './SelectoresFiltroGestion.module.css'
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
      <div className={estilos.campoConAyuda}>
        <Selector
          id={`${idBase}-tipo-servicio`}
          etiqueta="Tipo de servicio"
          valor={borrador.tipo_servicio_id}
          opciones={catalogos.tiposServicio}
          opcionTodos={OPCION_TODOS}
          ayuda={catalogos.ayudaTipos}
          bloqueadoMotivo={catalogos.motivoBloqueoTipos}
          onCambiar={(valor) => onCambiar('tipo_servicio_id', valor)}
        />
        <span className={estilos.iconoAyuda}>
          <AyudaEmergente id={`${idBase}-ayuda-tipo-servicio`} tema="el tipo de servicio" texto={AYUDA_TIPO_SERVICIO} />
        </span>
      </div>
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
