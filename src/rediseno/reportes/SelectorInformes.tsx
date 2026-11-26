import type { ComponentProps } from 'react'
import { BotonEnlace } from '@/design-system/Boton'
import EstadoVacio from '@/design-system/EstadoVacio'
import { EnlaceTransicion, estiloTransicion } from '../base/movimiento'
import PanelLateral from '../base/PanelLateral/PanelLateral'
import { PARAMETRO_INFORME, rutaReportes } from './enlaces'
import { INFORMES } from './catalogoInformes'
import estilos from './ReportesPage.module.css'

/** Nombre de la lente que se desliza hasta el informe elegido (los nombres de la base no la incluyen). */
export const LENTE_INFORMES = 'lente-informes'

/**
 * Selector de informe (M6-01, RD-60): una fila de enlaces con `?informe=` que conserva los filtros. «Panel» vuelve a
 * las cifras. La lente es el fondo del enlace elegido: con View Transitions se desliza de uno a otro.
 */
export function SelectorInformes({ busqueda, elegido }: { busqueda: string; elegido: string | null }) {
  return (
    <nav className={estilos.selector} aria-label="Informes">
      <ul className={estilos.informes}>
        <li>
          <EnlaceInforme to={rutaReportes({ filtros: busqueda })} activo={elegido === null} replace={elegido !== null}>
            Panel
          </EnlaceInforme>
        </li>
        {INFORMES.map((informe) => (
          <li key={informe.clave}>
            <EnlaceInforme
              to={rutaReportes({ informe: informe.clave, filtros: busqueda })}
              activo={elegido === informe.clave}
              // Como las cifras: con otro informe abierto se sustituye la entrada; si no, cerrar vuelve atrás.
              replace={elegido !== null}
              state={elegido === null ? { panelAbiertoPor: PARAMETRO_INFORME } : undefined}
            >
              {informe.titulo}
            </EnlaceInforme>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function EnlaceInforme({
  activo,
  children,
  ...props
}: { activo: boolean } & Omit<ComponentProps<typeof EnlaceTransicion>, 'className' | 'style' | 'aria-current'>) {
  return (
    <EnlaceTransicion
      {...props}
      className={estilos.informe}
      aria-current={activo ? 'page' : undefined}
      style={activo ? estiloTransicion(LENTE_INFORMES) : undefined} /* estilo-calculado */
    >
      {children}
    </EnlaceTransicion>
  )
}

/**
 * Panel del informe elegido. Cada informe lo construye su ticket (RD-60 y RD-61); hasta entonces enlaza la pantalla
 * actual del informe para que no se pierda.
 */
export function PanelInforme({ clave, onCerrar }: { clave: string | null; onCerrar: () => void }) {
  const informe = INFORMES.find((i) => i.clave === clave)
  return (
    <PanelLateral abierto={clave !== null} onCerrar={onCerrar} titulo={informe?.titulo ?? 'Informe'}>
      {informe ? (
        <EstadoVacio
          nivel={3}
          titulo="Este informe llega pronto al diseño nuevo"
          descripcion={informe.descripcion}
          accion={
            <BotonEnlace variante="secundario" to={informe.rutaActual}>
              Abrir el informe
            </BotonEnlace>
          }
        />
      ) : (
        <EstadoVacio
          nivel={3}
          titulo="No existe ese informe"
          descripcion="Cierra este panel y elige uno de la lista."
        />
      )}
    </PanelLateral>
  )
}
