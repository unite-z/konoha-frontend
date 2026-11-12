/**
 * Desplegable de filtros del calendario (AV-266, Figma «Calendario · filtros» 374-5899): tipos de servicio (varios, con
 * casillas) y proveedor, con «Limpiar» y «Aplicar». Se edita un borrador y los filtros solo cambian al aplicar.
 * Cuadrilla, sector y lugar (el servidor los filtra, AV-254) quedan bloqueados con su motivo si su catálogo no carga.
 * Los filtros viven en la página y se conservan al cambiar de vista.
 */
import { useState } from 'react'
import Boton from '@/components/ui/Boton'
import Casilla from '@/components/ui/Casilla'
import Selector from '@/components/ui/Selector'
import Tarjeta from '@/components/ui/Tarjeta'
import { SIN_FILTROS, type FiltrosCalendario, type OpcionFiltro } from './calendarioCapas'
import type { CatalogosCalendario } from './useCatalogosCalendario'
import estilos from './Calendario.module.css'

export interface PanelFiltrosProps {
  id: string
  filtros: FiltrosCalendario
  tipos: OpcionFiltro[]
  proveedores: OpcionFiltro[]
  catalogos: CatalogosCalendario
  /** Aplica los filtros y cierra el desplegable. */
  onAplicar: (filtros: FiltrosCalendario) => void
  onCerrar: () => void
}

export default function PanelFiltros({
  id,
  filtros,
  tipos,
  proveedores,
  catalogos,
  onAplicar,
  onCerrar,
}: PanelFiltrosProps) {
  const [borrador, setBorrador] = useState(filtros)
  const alternarTipo = (tipo: string, marcada: boolean) =>
    setBorrador((b) => ({ ...b, tipos: marcada ? [...b.tipos, tipo] : b.tipos.filter((t) => t !== tipo) }))

  return (
    <div
      id={id}
      className={estilos.desplegableFiltros}
      role="presentation"
      onKeyDown={(evento) => {
        if (evento.key === 'Escape') onCerrar()
      }}
    >
      <Tarjeta etiqueta="Filtros del calendario">
        <div className={estilos.panelFiltros}>
          <fieldset className={estilos.grupoFiltro}>
            <legend className={estilos.rotuloFiltro}>Tipo</legend>
            {tipos.map((tipo) => (
              <Casilla
                key={tipo.valor}
                etiqueta={tipo.texto}
                marcada={borrador.tipos.includes(tipo.valor)}
                onCambiar={(marcada) => alternarTipo(tipo.valor, marcada)}
              />
            ))}
          </fieldset>
          <Selector
            id="filtro-proveedor"
            etiqueta="Proveedor"
            valor={borrador.proveedor}
            opcionTodos="Todos"
            opciones={proveedores}
            onCambiar={(proveedor) => setBorrador((b) => ({ ...b, proveedor }))}
          />
          <Selector
            id="filtro-cuadrilla"
            etiqueta="Cuadrilla"
            valor={borrador.cuadrilla}
            opcionTodos="Todas"
            opciones={catalogos.cuadrillas}
            bloqueadoMotivo={catalogos.motivoCuadrillas}
            onCambiar={(cuadrilla) => setBorrador((b) => ({ ...b, cuadrilla }))}
          />
          <Selector
            id="filtro-sector"
            etiqueta="Sector"
            valor={borrador.sector}
            opcionTodos="Todos"
            opciones={catalogos.sectores}
            bloqueadoMotivo={catalogos.motivoSectores}
            onCambiar={(sector) => setBorrador((b) => ({ ...b, sector }))}
          />
          <Selector
            id="filtro-lugar"
            etiqueta="Lugar"
            valor={borrador.lugar}
            opcionTodos="Todos"
            opciones={catalogos.lugares}
            bloqueadoMotivo={catalogos.motivoLugares}
            onCambiar={(lugar) => setBorrador((b) => ({ ...b, lugar }))}
          />
          <div className={estilos.accionesFiltros}>
            <Boton
              variante="fantasma"
              onClick={() => {
                setBorrador(SIN_FILTROS)
                onAplicar(SIN_FILTROS)
              }}
            >
              Limpiar
            </Boton>
            <Boton onClick={() => onAplicar(borrador)}>Aplicar</Boton>
          </div>
        </div>
      </Tarjeta>
    </div>
  )
}
