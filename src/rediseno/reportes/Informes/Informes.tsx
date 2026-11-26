// RF-REP-002, RF-REP-004 y RF-REP-006 · M6-02 a M6-04 · RNF-008
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoVacio from '@/design-system/EstadoVacio'
import { estiloTransicion } from '@/rediseno/base/movimiento'
import { INFORMES } from '../catalogoInformes'
import estilos from './Informes.module.css'

/*
 * Los tres informes de este ticket se montan dentro de la vista con las pantallas actuales, sin tocarlas: traen sus
 * filtros en la URL (periodo, cuadrilla, modalidad, sector…), sus estados de carga, error, vacío y 403, el mapa de
 * calor y los avisos. Aquí solo se les da marco de vidrio y su encabezado.
 */
const CumplimientoCorte = lazy(() => import('@/pages/reportes-indicadores/reportes/CumplimientoCortePage'))
const DistribucionPersonal = lazy(() => import('@/pages/reportes-indicadores/reportes/DistribucionPersonalPage'))
const AtencionesEspacioSector = lazy(() => import('@/pages/reportes-indicadores/reportes/AtencionesEspacioSectorPage'))

const COMPONENTES: Readonly<Record<string, LazyExoticComponent<ComponentType>>> = {
  'cumplimiento-corte': CumplimientoCorte,
  'distribucion-personal': DistribucionPersonal,
  'atenciones-espacio-sector': AtencionesEspacioSector,
}

/** Nombre de la tarjeta del informe: al cambiar de informe hace fundido cruzado; cabecera y selector no se mueven. */
export const CONTENIDO_INFORME = 'contenido-informe'

/** Informe elegido con `?informe=`, en una tarjeta de vidrio bajo el selector. */
export default function Informes({ clave }: { clave: string }) {
  const Informe = COMPONENTES[clave]
  const datos = INFORMES.find((i) => i.clave === clave)
  if (!Informe || !datos) {
    return <EstadoVacio nivel={2} titulo="No existe ese informe" descripcion="Elige uno de la lista." />
  }
  return (
    <section
      className={estilos.informe}
      aria-labelledby="titulo-informe"
      style={estiloTransicion(CONTENIDO_INFORME)} /* estilo-calculado */
    >
      <header className={estilos.cabecera}>
        <h2 id="titulo-informe" className={estilos.titulo}>
          {datos.titulo}
        </h2>
        <p className={estilos.ayuda}>{datos.descripcion}</p>
      </header>
      <Suspense fallback={<EstadoCarga forma="pagina" />}>
        <Informe />
      </Suspense>
    </section>
  )
}
