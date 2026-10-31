/**
 * Barra de filtros del panel de indicadores y de su detalle (Guía Web 5.4): periodo, Espacio, Tipo de servicio,
 * Estado y Modalidad, con «Aplicar filtros» y los chips de los filtros aplicados.
 *
 * El borrador se sincroniza con la URL (al quitar un chip, el selector lo refleja). Aplicar sin cambios repite
 * la consulta.
 */
import { useState } from 'react'
import { ChipsFiltrosActivos, type FiltroActivo } from '../../../components/ui/ChipsFiltro'
import FiltroPeriodo from '../../../components/ui/FiltroPeriodo'
import type { OpcionSelector } from '../../../components/ui/Selector'
import SelectoresFiltroGestion from '../../../components/reportes-indicadores/SelectoresFiltroGestion'
import type { CatalogosFiltros } from '../../../components/reportes-indicadores/useCatalogosFiltros'
import type { ErrorApi } from '../../../services/api/cliente'
import { OPCIONES_MODALIDAD } from '../../../utils/estados'
import { ESTADOS_FILTRO_PANEL } from '../../../utils/reportesGestion'
import { erroresDePeriodo } from '../reportes/erroresPeriodo'
import type { BorradorPanel, FiltrosPanel } from './useFiltrosPanel'

export interface BarraFiltrosPanelProps {
  filtrosPanel: FiltrosPanel
  catalogos: CatalogosFiltros
  error: ErrorApi | null
  cargando: boolean
  /** «Aplicar filtros» sin cambios: repite la consulta. */
  onReintentar: () => void
}

function textoOpcion(opciones: OpcionSelector[], valor: string): string {
  return opciones.find((o) => o.valor === valor)?.texto ?? `n.º ${valor}`
}

/** Chips de los filtros aplicados (Guía Web 5.4). */
function chips(aplicados: BorradorPanel, catalogos: CatalogosFiltros): FiltroActivo[] {
  const lista: FiltroActivo[] = []
  if (aplicados.area_verde_id) {
    lista.push({ clave: 'area_verde_id', texto: `Espacio: ${textoOpcion(catalogos.espacios, aplicados.area_verde_id)}` })
  }
  if (aplicados.tipo_servicio_id) {
    lista.push({
      clave: 'tipo_servicio_id',
      texto: `Tipo de servicio: ${textoOpcion(catalogos.tiposServicio, aplicados.tipo_servicio_id)}`,
    })
  }
  if (aplicados.estado) lista.push({ clave: 'estado', texto: `Estado: ${aplicados.estado}` })
  if (aplicados.modalidad) {
    const modalidad = OPCIONES_MODALIDAD.find((o) => o.valor === aplicados.modalidad)?.texto ?? aplicados.modalidad
    lista.push({ clave: 'modalidad', texto: `Modalidad: ${modalidad}` })
  }
  return lista
}

export default function BarraFiltrosPanel({ filtrosPanel, catalogos, error, cargando, onReintentar }: BarraFiltrosPanelProps) {
  const { filtros, aplicados, claveAplicados, aplicar, quitar, limpiar } = filtrosPanel

  // Si los filtros de la URL cambian (por ejemplo, al quitar un chip), el borrador los refleja.
  const [borrador, setBorrador] = useState<BorradorPanel>(aplicados)
  const [origenBorrador, setOrigenBorrador] = useState(claveAplicados)
  if (origenBorrador !== claveAplicados) {
    setOrigenBorrador(claveAplicados)
    setBorrador(aplicados)
  }

  return (
    <>
      <FiltroPeriodo
        idBase="periodo-panel"
        desde={filtros.desde}
        hasta={filtros.hasta}
        erroresServidor={erroresDePeriodo(error)}
        cargando={cargando}
        onAplicar={(periodo) => {
          const sinCambios =
            periodo.desde === filtros.desde &&
            periodo.hasta === filtros.hasta &&
            JSON.stringify(borrador) === claveAplicados
          if (sinCambios) onReintentar()
          else aplicar(periodo, borrador)
        }}
      >
        <SelectoresFiltroGestion
          idBase="filtro-panel"
          borrador={borrador}
          onCambiar={(campo, valor) => setBorrador((b) => ({ ...b, [campo]: valor }))}
          catalogos={catalogos}
          estados={ESTADOS_FILTRO_PANEL}
        />
      </FiltroPeriodo>
      <ChipsFiltrosActivos filtros={chips(aplicados, catalogos)} onQuitar={quitar} onLimpiar={limpiar} />
    </>
  )
}
