/**
 * Desplegable de filtros del calendario (AV-266): tipo de servicio y proveedor. Cuadrilla, sector y lugar se ven
 * bloqueados con su motivo hasta que `GET programaciones` los devuelva (AV-254). Los filtros viven en la página y se
 * conservan al cambiar de vista.
 */
import Selector from '@/components/ui/Selector'
import Tarjeta from '@/components/ui/Tarjeta'
import type { FiltrosCalendario, OpcionFiltro } from './calendarioCapas'
import estilos from './Calendario.module.css'

// AV-254: el backend aún no devuelve cuadrilla, sector ni lugar en GET programaciones.
const MOTIVO_AV254 = 'Aún no disponible.'

export interface PanelFiltrosProps {
  id: string
  filtros: FiltrosCalendario
  tipos: OpcionFiltro[]
  proveedores: OpcionFiltro[]
  onCambiar: (filtros: FiltrosCalendario) => void
}

export default function PanelFiltros({ id, filtros, tipos, proveedores, onCambiar }: PanelFiltrosProps) {
  return (
    <div id={id}>
      <Tarjeta etiqueta="Filtros del calendario">
        <div className={estilos.panelFiltros}>
          <Selector id="filtro-tipo" etiqueta="Tipo de servicio" valor={filtros.tipo} opcionTodos="Todos" opciones={tipos} onCambiar={(tipo) => onCambiar({ ...filtros, tipo })} />
          <Selector
            id="filtro-proveedor"
            etiqueta="Proveedor"
            valor={filtros.proveedor}
            opcionTodos="Todos"
            opciones={proveedores}
            onCambiar={(proveedor) => onCambiar({ ...filtros, proveedor })}
          />
          <Selector id="filtro-cuadrilla" etiqueta="Cuadrilla" valor="" opcionTodos="Todas" opciones={[]} onCambiar={() => {}} disabled bloqueadoMotivo={MOTIVO_AV254} />
          <Selector id="filtro-sector" etiqueta="Sector" valor="" opcionTodos="Todos" opciones={[]} onCambiar={() => {}} disabled bloqueadoMotivo={MOTIVO_AV254} />
          <Selector id="filtro-lugar" etiqueta="Lugar" valor="" opcionTodos="Todos" opciones={[]} onCambiar={() => {}} disabled bloqueadoMotivo={MOTIVO_AV254} />
        </div>
      </Tarjeta>
    </div>
  )
}
