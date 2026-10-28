// RF-REP-001 · HU-MOD06-001 criterio 3 · CU-MOD06-001 paso 5: detalle de los registros con los mismos filtros.
/**
 * Detalle paginado (25 por página, en el servidor) de los registros de un indicador del panel, con los mismos
 * filtros que el panel (comparten la URL). La miga «Panel» vuelve con esos filtros.
 *
 * Cada indicador tiene sus columnas: la página elige un `ContenidoDetalle` tipado según la clave de la ruta.
 * - Clave desconocida: no se consulta y se muestra «No existe ese indicador» (también con el 404 del back-end).
 * - Página fuera de rango (404 `pagina-inexistente`): aviso con «Ir a la primera página».
 */
import type { ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Badge from '../../../components/ui/Badge'
import { BotonEnlace } from '../../../components/ui/Boton'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import TablaDatos, { type ColumnaTabla } from '../../../components/ui/TablaDatos'
import { useCatalogosFiltros } from '../../../components/reportes-indicadores/useCatalogosFiltros'
import { useConsulta } from '../../../hooks/useConsulta'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS, RUTAS, rutaDetalleAtencion } from '../../../router/rutasApp'
import { obtenerDetalleIndicador } from '../../../services/api/reportesGestion'
import type {
  ClaveIndicadorPanel,
  DetalleIndicadorPanel,
  FilaAtencionEspacio,
  FilaAtencionPeriodo,
  FilaMovimientoMaterial,
} from '../../../types/reportesGestion'
import { formatearFecha, formatearNumero, SIN_VALOR } from '../../../utils/formato'
import {
  esClaveIndicador,
  insigniaEstadoAtencion,
  notasUnicas,
  numeroDeDecimal,
  rutaDetalleConFiltros,
} from '../../../utils/reportesGestion'
import PlantillaReporte from '../reportes/PlantillaReporte'
import estilos from '../reportes/Reportes.module.css'
import BarraFiltrosPanel from './BarraFiltrosPanel'
import { useFiltrosPanel } from './useFiltrosPanel'

/** Título mientras no llega el nombre del indicador. */
const TITULO_PROVISIONAL = 'Detalle del indicador'

/** Tamaño de página del back-end (`Paginacion.TAMANO_PAGINA`). */
const POR_PAGINA = 25

/** Texto del espacio de una atención sin espacio (como «Sin espacio» del back-end). */
const TEXTO_SIN_ESPACIO = 'Sin espacio'

// --- Columnas por indicador ------------------------------------------------------------------------------------

/** Código de la atención con enlace a su ficha de MOD-05 (misma sesión; Guía Web 5.8: «abre la atención»). */
function enlaceAtencion(fila: { atencion_id: number; codigo: string }): ReactNode {
  return <Link to={rutaDetalleAtencion(fila.atencion_id)}>{fila.codigo}</Link>
}

const COLUMNAS_ATENCIONES_ESPACIO: ColumnaTabla<FilaAtencionEspacio>[] = [
  { clave: 'fecha', titulo: 'Fecha', render: (f) => formatearFecha(f.fecha) },
  { clave: 'codigo', titulo: 'Atención', render: enlaceAtencion },
  { clave: 'tipo_servicio', titulo: 'Tipo de servicio' },
  { clave: 'estado', titulo: 'Estado', render: (f) => <Badge {...insigniaEstadoAtencion(f.estado)} /> },
  { clave: 'espacio', titulo: 'Espacio', render: (f) => f.espacio ?? TEXTO_SIN_ESPACIO },
]

const COLUMNAS_CUMPLIMIENTO: ColumnaTabla<FilaAtencionPeriodo>[] = [
  { clave: 'fecha', titulo: 'Fecha', render: (f) => formatearFecha(f.fecha) },
  { clave: 'codigo', titulo: 'Atención', render: enlaceAtencion },
  { clave: 'tipo_servicio', titulo: 'Tipo de servicio' },
  { clave: 'estado', titulo: 'Estado', render: (f) => <Badge {...insigniaEstadoAtencion(f.estado)} /> },
  { clave: 'proveedor', titulo: 'Proveedor' },
]

/** Hoy nunca llegan registros (MOD-04 aún no registra el material); queda preparado. */
const COLUMNAS_CONSUMO: ColumnaTabla<FilaMovimientoMaterial>[] = [
  { clave: 'fecha', titulo: 'Fecha', render: (f) => formatearFecha(f.fecha) },
  { clave: 'espacio', titulo: 'Espacio', render: (f) => f.espacio ?? TEXTO_SIN_ESPACIO },
  { clave: 'tipo_material', titulo: 'Material' },
  { clave: 'categoria', titulo: 'Categoría' },
  {
    clave: 'cantidad',
    titulo: 'Cantidad',
    alineacion: 'derecha',
    render: (f) => formatearNumero(numeroDeDecimal(f.cantidad)),
  },
  { clave: 'unidad', titulo: 'Unidad', render: (f) => f.unidad || SIN_VALOR },
]

// --- Estados propios ---------------------------------------------------------------------------------------------

/** Clave de ruta desconocida o 404 `indicador-no-encontrado`. */
function IndicadorInexistente() {
  const { search } = useLocation()
  usePaginaActual(TITULO_PROVISIONAL, [
    MIGAS.reportesIndicadores,
    { ...MIGAS.panel, ruta: rutaDetalleConFiltros(RUTAS.panel, search) },
    { texto: TITULO_PROVISIONAL },
  ])
  return (
    <EstadoVacio
      icono="triangulo"
      titulo="No existe ese indicador"
      descripcion="Vuelve al panel y elige uno de sus indicadores"
      accion={
        <BotonEnlace variante="secundario" to={rutaDetalleConFiltros(RUTAS.panel, search)}>
          Volver al panel
        </BotonEnlace>
      }
    />
  )
}

// --- Contenido tipado ------------------------------------------------------------------------------------------

interface ContenidoDetalleProps<F> {
  clave: ClaveIndicadorPanel
  /** `null`: el indicador aún no tiene columnas propias (sus datos son de MOD-04). */
  columnas: ColumnaTabla<F>[] | null
  claveFila: (fila: F) => string
}

function ContenidoDetalle<F>({ clave, columnas, claveFila }: ContenidoDetalleProps<F>) {
  const { search } = useLocation()
  const filtrosPanel = useFiltrosPanel()
  const { filtros, claveAplicados, consulta: parametros, establecer } = filtrosPanel
  const catalogos = useCatalogosFiltros()
  const pagina = filtros.page || undefined

  const consulta = useConsulta<DetalleIndicadorPanel<F>>(
    `detalle|${clave}|${filtros.desde}|${filtros.hasta}|${claveAplicados}|${pagina ?? ''}`,
    (signal) => obtenerDetalleIndicador<F>(clave, parametros, pagina, signal),
    (datos) => datos.sin_datos,
  )
  const consultaConCatalogos = {
    ...consulta,
    reintentar: () => {
      consulta.reintentar()
      catalogos.reintentar()
    },
  }

  const titulo = consulta.datos?.indicador.nombre ?? TITULO_PROVISIONAL
  usePaginaActual(titulo, [
    MIGAS.reportesIndicadores,
    { ...MIGAS.panel, ruta: rutaDetalleConFiltros(RUTAS.panel, search) },
    { texto: titulo },
  ])

  if (consulta.error?.codigo === 'indicador-no-encontrado') return <IndicadorInexistente />

  const barra = (
    <BarraFiltrosPanel
      filtrosPanel={filtrosPanel}
      catalogos={catalogos}
      error={consulta.error}
      cargando={consulta.estado === 'cargando' && consulta.cargaVisible}
      onReintentar={consultaConCatalogos.reintentar}
    />
  )

  if (consulta.error?.codigo === 'pagina-inexistente') {
    return (
      <div className={estilos.pagina}>
        {barra}
        <AvisoEnLinea
          tono="advertencia"
          titulo="Esa página ya no existe"
          accion={{ texto: 'Ir a la primera página', onClick: () => establecer({ page: null }) }}
        >
          El detalle tiene menos páginas con estos filtros
        </AvisoEnLinea>
      </div>
    )
  }

  return (
    <PlantillaReporte
      consulta={consultaConCatalogos}
      filtros={barra}
      vacio={{ titulo: 'Sin registros para este indicador' }}
    >
      {(datos) => (
        <>
          <section className={estilos.seccion} aria-labelledby="titulo-calculo">
            <h2 id="titulo-calculo" className={estilos.tituloSeccion}>
              Cómo se calcula
            </h2>
            <p className={estilos.ayuda}>{datos.indicador.descripcion_calculo}</p>
            <p className={estilos.ayuda}>Unidad: {datos.indicador.unidad}</p>
          </section>

          {columnas ? (
            <TablaDatos
              titulo={`Registros de ${datos.indicador.nombre}`}
              columnas={columnas}
              filas={datos.results}
              claveFila={claveFila}
              paginacionServidor={{
                pagina: Number(filtros.page) || 1,
                total: datos.count,
                porPagina: POR_PAGINA,
                onCambiarPagina: (p) => establecer({ page: p > 1 ? String(p) : null }),
              }}
            />
          ) : (
            <AvisoEnLinea tono="info">El detalle de este indicador todavía no se puede mostrar</AvisoEnLinea>
          )}

          {notasUnicas(datos.notas).map((nota) => (
            <AvisoEnLinea key={nota} tono="info">
              {nota}
            </AvisoEnLinea>
          ))}
        </>
      )}
    </PlantillaReporte>
  )
}

export default function DetalleIndicadorPage() {
  const { indicador } = useParams()
  if (!esClaveIndicador(indicador)) return <IndicadorInexistente />

  switch (indicador) {
    case 'atenciones-por-espacio':
      return (
        <ContenidoDetalle<FilaAtencionEspacio>
          key={indicador}
          clave={indicador}
          columnas={COLUMNAS_ATENCIONES_ESPACIO}
          // Una atención se repite por cada espacio de su alcance.
          claveFila={(f) => `${f.atencion_id}-${f.area_verde_id ?? 'sin'}`}
        />
      )
    case 'cumplimiento-tercerizados':
      return (
        <ContenidoDetalle<FilaAtencionPeriodo>
          key={indicador}
          clave={indicador}
          columnas={COLUMNAS_CUMPLIMIENTO}
          claveFila={(f) => String(f.atencion_id)}
        />
      )
    case 'consumo-materiales':
      return (
        <ContenidoDetalle<FilaMovimientoMaterial>
          key={indicador}
          clave={indicador}
          columnas={COLUMNAS_CONSUMO}
          claveFila={(f) => String(f.id)}
        />
      )
    case 'actividades-por-estado':
    case 'distribucion-operarios':
      // TODO: definir sus columnas cuando MOD-04 publique los partes diarios. Hoy siempre llegan sin datos y se
      // ve el vacío con el motivo del back-end.
      return <ContenidoDetalle<unknown> key={indicador} clave={indicador} columnas={null} claveFila={() => ''} />
  }
}
