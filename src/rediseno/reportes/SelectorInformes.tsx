import { Link } from 'react-router'
import { BotonEnlace } from '@/design-system/Boton'
import EstadoVacio from '@/design-system/EstadoVacio'
import PanelLateral from '../base/PanelLateral/PanelLateral'
import { PARAMETRO_INFORME, rutaReportes } from './enlaces'
import { INFORMES } from './catalogoInformes'
import estilos from './ReportesPage.module.css'

/** Selector de informe (M6-01): enlaces con `?informe=` que conservan los filtros. */
export function SelectorInformes({ busqueda, elegido }: { busqueda: string; elegido: string | null }) {
  return (
    <section className={estilos.vidrio} aria-labelledby="titulo-informes">
      <h2 id="titulo-informes" className={estilos.tituloSeccion}>
        Informes
      </h2>
      <ul className={estilos.informes}>
        {INFORMES.map((informe) => (
          <li key={informe.clave}>
            <Link
              to={rutaReportes({ informe: informe.clave, filtros: busqueda })}
              // Como las cifras: con otro informe abierto se sustituye la entrada; si no, cerrar vuelve atrás.
              replace={elegido !== null}
              state={elegido === null ? { panelAbiertoPor: PARAMETRO_INFORME } : undefined}
              className={estilos.informe}
              aria-current={elegido === informe.clave || undefined}
            >
              <span className={estilos.tituloInforme}>{informe.titulo}</span>{' '}
              <span className={estilos.ayuda}>{informe.descripcion}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
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
