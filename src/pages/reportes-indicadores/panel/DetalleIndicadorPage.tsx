// RF-REP-001 · HU-MOD06-001 criterio 3 · CU-MOD06-001 paso 5: detalle de los registros con los mismos filtros.
/**
 * Detalle de los registros de un indicador del panel, con los mismos filtros que el panel (comparten la URL).
 * La miga «Panel» vuelve con esos filtros.
 *
 * - Se descargan todos los registros del filtro (25 por página en el back-end, hasta MAXIMO_REGISTROS) y se
 *   resumen en un gráfico; al elegir una barra, «Ver detalles» abre sus registros en un diálogo, y
 *   «Ver todos los registros» abre la tabla completa.
 * - Clave desconocida: no se consulta y se muestra «No existe ese indicador» (también con el 404 del back-end).
 * - Indicadores de MOD-04 (actividades y operarios): su detalle aún no se puede mostrar.
 */
import { useState } from 'react'
import { useLocation, useParams } from 'react-router'
import DialogoDetalle from '../../../components/reportes-indicadores/DialogoDetalle'
import { useCatalogosFiltros } from '../../../components/reportes-indicadores/useCatalogosFiltros'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Boton, { BotonEnlace } from '../../../components/ui/Boton'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import { useConsulta } from '../../../hooks/useConsulta'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS, RUTAS } from '../../../router/rutasApp'
import type {
  ClaveIndicadorPanel,
  FilaAtencionEspacio,
  FilaAtencionPeriodo,
  FilaMovimientoMaterial,
} from '../../../types/reportesGestion'
import { formatearFecha, formatearNumero } from '../../../utils/formato'
import { esClaveIndicador, notasUnicas, rutaDetalleConFiltros } from '../../../utils/reportesGestion'
import PlantillaReporte from '../reportes/PlantillaReporte'
import estilos from '../reportes/Reportes.module.css'
import BarraFiltrosPanel from './BarraFiltrosPanel'
import estilosPanel from './PanelIndicadores.module.css'
import {
  AGRUPACIONES_ATENCIONES_ESPACIO,
  AGRUPACIONES_CONSUMO,
  AGRUPACIONES_CUMPLIMIENTO,
  cargarRegistros,
  type Agrupacion,
  type DetalleCompleto,
} from './registros'
import ResumenDetalle from './ResumenDetalle'
import TablaRegistros from './TablaRegistros'
import { useFiltrosPanel } from './useFiltrosPanel'

/** Título mientras no llega el nombre del indicador. */
const TITULO_PROVISIONAL = 'Detalle del indicador'

const unidadMovimiento = (f: FilaMovimientoMaterial) => f.unidad

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
  /** `null`: el indicador aún no tiene registros que mostrar (sus datos son de MOD-04). */
  agrupaciones: Agrupacion<F>[] | null
  unidadDe?: (fila: F) => string
}

/** Registros elegidos para el diálogo. */
interface Eleccion {
  titulo: string
  filas: unknown[]
}

function ContenidoDetalle<F>({ clave, agrupaciones, unidadDe }: ContenidoDetalleProps<F>) {
  const { search } = useLocation()
  const filtrosPanel = useFiltrosPanel()
  const { filtros, claveAplicados, consulta: parametros } = filtrosPanel
  const catalogos = useCatalogosFiltros()
  const [eleccion, setEleccion] = useState<Eleccion | null>(null)

  const consulta = useConsulta<DetalleCompleto<F>>(
    `detalle|${clave}|${filtros.desde}|${filtros.hasta}|${claveAplicados}`,
    // Sin agrupaciones (MOD-04) basta la primera página: sus registros aún no se muestran.
    (signal) => cargarRegistros<F>(clave, parametros, signal, agrupaciones ? undefined : 25),
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

  // Sin registros, `PlantillaReporte` solo muestra el vacío: las notas que explican el motivo van debajo.
  const notasSinDatos =
    consulta.estado !== 'error' && !consulta.cargaVisible && consulta.datos?.sin_datos
      ? notasUnicas(consulta.datos.notas)
      : []

  return (
    <div className={estilos.pagina}>
      <PlantillaReporte
        consulta={consultaConCatalogos}
        filtros={
          <BarraFiltrosPanel
            filtrosPanel={filtrosPanel}
            catalogos={catalogos}
            error={consulta.error}
            cargando={consulta.estado === 'cargando' && consulta.cargaVisible}
            onReintentar={consultaConCatalogos.reintentar}
          />
        }
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

            {agrupaciones ? (
              <section className={estilos.seccion} aria-labelledby="titulo-registros">
                <h2 id="titulo-registros" className={estilos.tituloSeccion}>
                  Registros del periodo
                </h2>
                {!datos.completo && (
                  <AvisoEnLinea tono="advertencia" titulo="El gráfico resume solo una parte de los registros">
                    Hay {formatearNumero(datos.count)} registros con estos filtros y se descargaron{' '}
                    {formatearNumero(datos.results.length)}. Acota el periodo o añade filtros para verlos todos.
                  </AvisoEnLinea>
                )}
                <ResumenDetalle<F>
                  // Al cambiar los datos (nueva consulta), el gráfico olvida la barra elegida.
                  key={datos.generado_en}
                  filas={datos.results}
                  agrupaciones={agrupaciones}
                  unidadDe={unidadDe}
                  onVerDetalle={(t, filas) => setEleccion({ titulo: t, filas })}
                />
                <div className={estilosPanel.acciones}>
                  <Boton
                    variante="secundario"
                    onClick={() => setEleccion({ titulo: `Registros de ${datos.indicador.nombre}`, filas: datos.results })}
                  >
                    Ver todos los registros ({formatearNumero(datos.results.length)})
                  </Boton>
                </div>
              </section>
            ) : (
              <AvisoEnLinea tono="info">El detalle de este indicador todavía no se puede mostrar</AvisoEnLinea>
            )}

            {notasUnicas(datos.notas).map((nota) => (
              <AvisoEnLinea key={nota} tono="info">
                {nota}
              </AvisoEnLinea>
            ))}

            <DialogoDetalle
              abierto={eleccion !== null}
              titulo={eleccion?.titulo ?? ''}
              descripcion={`Periodo del ${formatearFecha(filtros.desde)} al ${formatearFecha(filtros.hasta)}`}
              onCerrar={() => setEleccion(null)}
            >
              {eleccion && (
                <TablaRegistros
                  clave={clave}
                  titulo={eleccion.titulo}
                  filas={eleccion.filas}
                  incompleto={!datos.completo}
                />
              )}
            </DialogoDetalle>
          </>
        )}
      </PlantillaReporte>
      {notasSinDatos.map((nota) => (
        <AvisoEnLinea key={nota} tono="info">
          {nota}
        </AvisoEnLinea>
      ))}
    </div>
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
          agrupaciones={AGRUPACIONES_ATENCIONES_ESPACIO}
        />
      )
    case 'cumplimiento-tercerizados':
      return (
        <ContenidoDetalle<FilaAtencionPeriodo> key={indicador} clave={indicador} agrupaciones={AGRUPACIONES_CUMPLIMIENTO} />
      )
    case 'consumo-materiales':
      return (
        <ContenidoDetalle<FilaMovimientoMaterial>
          key={indicador}
          clave={indicador}
          agrupaciones={AGRUPACIONES_CONSUMO}
          unidadDe={unidadMovimiento}
        />
      )
    case 'actividades-por-estado':
    case 'distribucion-operarios':
      // TODO: definir sus registros cuando MOD-04 publique los partes diarios. Sin datos se ve el vacío con el
      // motivo del back-end. En desarrollo, con `MOD06_DATOS_EJEMPLO=true`, llegan datos de EJEMPLO (estado del
      // parte diario: «Abierto» o «Cerrado») y aquí se ve el aviso de que el detalle aún no se puede mostrar.
      // Esto variará cuando se programe MOD-04: el estado y los campos de cada registro pueden cambiar.
      return <ContenidoDetalle<unknown> key={indicador} clave={indicador} agrupaciones={null} />
  }
}
