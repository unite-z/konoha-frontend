// RF-REP-001 · HU-MOD06-001 · CU-MOD06-001 (sin CP)
/**
 * Panel de indicadores de gestión: los cinco indicadores mínimos del CU-MOD06-001 (paso 4) del periodo con los
 * filtros elegidos, en el orden en que llegan del back-end.
 *
 * Composición (Guía Web 5.7 y 6.1, patrón «Panel de indicadores»; mockup, pantalla 2): filtros globales arriba,
 * tarjetas de indicador (dos filas, de 3 a 4 por fila), tablas de apoyo con el desglose de cada indicador y el
 * acceso al mapa. Cada tarjeta enlaza a su detalle con los mismos filtros (HU-MOD06-001, criterio 3).
 *
 * - Sin alertas: no hay umbrales definidos (pendiente 6 de los mockups) y el back-end no los envía.
 * - Los cinco indicadores tienen el mismo permiso: un 403 lo muestra `PlantillaReporte`; un usuario sin rol lo
 *   para el guardián de sesión.
 * - Cuadrilla y sector no se pueden filtrar todavía: lo explican las notas del back-end, que se muestran.
 *
 * Supuestos (pendientes de confirmar): periodo predeterminado = semana actual; el mapa no se incrusta (ver abajo).
 */
import { useLocation } from 'react-router'
import Badge from '../../../components/ui/Badge'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Boton, { BotonEnlace } from '../../../components/ui/Boton'
import TablaDatos, { type ColumnaTabla } from '../../../components/ui/TablaDatos'
import TarjetaIndicador from '../../../components/ui/TarjetaIndicador'
import { useCatalogosFiltros } from '../../../components/reportes-indicadores/useCatalogosFiltros'
import { useConsulta } from '../../../hooks/useConsulta'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS, RUTAS, rutaDetalleIndicador } from '../../../router/rutasApp'
import { obtenerPanel } from '../../../services/api/reportesGestion'
import type { ClaveIndicadorPanel, ElementoDesglose, ResultadoIndicador, ResultadoPanel } from '../../../types/reportesGestion'
import { formatearNumero } from '../../../utils/formato'
import {
  insigniaEstadoAtencion,
  notasUnicas,
  numeroDeDecimal,
  rutaDetalleConFiltros,
  valorTarjeta,
} from '../../../utils/reportesGestion'
import PlantillaReporte from '../reportes/PlantillaReporte'
import estilos from '../reportes/Reportes.module.css'
import BarraFiltrosPanel from './BarraFiltrosPanel'
import estilosPanel from './PanelIndicadores.module.css'
import { useFiltrosPanel } from './useFiltrosPanel'

const TITULO = 'Panel de indicadores'

/** Columna de valores del desglose: cifra a la derecha y ordenable. */
function columnaValor(titulo: string): ColumnaTabla<ElementoDesglose> {
  return {
    clave: 'valor',
    titulo,
    alineacion: 'derecha',
    ordenable: true,
    valorOrden: (e) => numeroDeDecimal(e.valor),
    render: (e) => formatearNumero(numeroDeDecimal(e.valor)),
  }
}

function columnaEtiqueta(titulo: string): ColumnaTabla<ElementoDesglose> {
  return { clave: 'etiqueta', titulo, ordenable: true }
}

/**
 * Columnas del desglose de cada indicador. La etiqueta es lo que agrupa el back-end: el espacio, el estado de
 * la atención o el material con su unidad.
 *
 * Indicadores de MOD-04 (actividades, operarios y material): en desarrollo, con `MOD06_DATOS_EJEMPLO=true` en el
 * back-end, muestran datos de EJEMPLO. Actividades se desglosa en «Estado: Abierto/Cerrado» (estado del parte
 * diario) y «Tipo: …»; operarios, en «Cuadrilla: …» y «Espacio: …». Esto variará cuando se programe MOD-04: el
 * estado de una actividad y los conceptos del desglose pueden cambiar.
 */
const COLUMNAS_DESGLOSE: Record<ClaveIndicadorPanel, ColumnaTabla<ElementoDesglose>[]> = {
  'actividades-por-estado': [columnaEtiqueta('Concepto'), columnaValor('Valor')],
  'distribucion-operarios': [columnaEtiqueta('Concepto'), columnaValor('Valor')],
  'atenciones-por-espacio': [columnaEtiqueta('Espacio'), columnaValor('Atenciones')],
  'consumo-materiales': [columnaEtiqueta('Material (unidad)'), columnaValor('Cantidad')],
  'cumplimiento-tercerizados': [
    { clave: 'etiqueta', titulo: 'Estado', ordenable: true, render: (e) => <Badge {...insigniaEstadoAtencion(e.etiqueta)} /> },
    columnaValor('Atenciones'),
  ],
}

function Tarjeta({ resultado, busqueda }: { resultado: ResultadoIndicador; busqueda: string }) {
  return (
    <TarjetaIndicador
      etiqueta={resultado.indicador.nombre}
      valor={valorTarjeta(resultado) ?? undefined}
      unidad={resultado.indicador.unidad}
      estado={resultado.sin_datos ? 'sinDatos' : 'normal'}
      motivoSinDatos={resultado.mensaje_sin_datos ?? undefined}
      // Todo indicador enlaza a su detalle, también sin datos (Guía Web 5.7).
      enlace={{ texto: 'Ver detalle', a: rutaDetalleConFiltros(rutaDetalleIndicador(resultado.clave), busqueda) }}
    />
  )
}

/** Ruta del mapa con el mismo periodo. */
function rutaMapaConPeriodo(desde: string, hasta: string): string {
  return `${RUTAS.mapaAtenciones}?${new URLSearchParams({ desde, hasta }).toString()}`
}

export default function PanelIndicadoresPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, { texto: 'Panel' }])
  const { search } = useLocation()
  const filtrosPanel = useFiltrosPanel()
  const { filtros, claveAplicados, hayFiltros, consulta: parametros, limpiar } = filtrosPanel
  const catalogos = useCatalogosFiltros()

  const consulta = useConsulta<ResultadoPanel>(
    `panel|${filtros.desde}|${filtros.hasta}|${claveAplicados}`,
    (signal) => obtenerPanel(parametros, signal),
    (datos) => datos.sin_datos,
  )
  // «Actualizar» y «Reintentar» también recargan los catálogos que fallaron.
  const consultaConCatalogos = {
    ...consulta,
    reintentar: () => {
      consulta.reintentar()
      catalogos.reintentar()
    },
  }

  // Si los cinco indicadores están vacíos, `PlantillaReporte` solo muestra el vacío: las notas que explican el
  // motivo van debajo. Misma condición que su estado vacío (sin error ni esqueleto).
  const notasSinDatos =
    consulta.estado !== 'error' && !consulta.cargaVisible && consulta.datos?.sin_datos
      ? notasUnicas(consulta.datos.notas, ...consulta.datos.indicadores.map((r) => r.notas))
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
        vacio={{
          titulo: 'Sin datos en el periodo',
          accion: hayFiltros ? (
            <Boton variante="secundario" onClick={limpiar}>
              Limpiar filtros
            </Boton>
          ) : undefined,
        }}
      >
        {(datos) => (
          <>
            <section className={estilos.seccion} aria-labelledby="titulo-indicadores">
              <h2 id="titulo-indicadores" className={estilos.tituloSeccion}>
                Indicadores del periodo
              </h2>
              {/* Guía Web 5.7: filas de 3 a 4 tarjetas. Con cinco indicadores, 3 + 2 del mismo ancho. */}
              <div role="group" aria-label="Indicadores del periodo" className={estilosPanel.tarjetas}>
                {datos.indicadores.map((r) => (
                  <Tarjeta key={r.clave} resultado={r} busqueda={search} />
                ))}
              </div>
            </section>

            {datos.indicadores.some((r) => r.desglose.length > 0) && (
              <section className={estilos.seccion} aria-labelledby="titulo-desglose">
                <h2 id="titulo-desglose" className={estilos.tituloSeccion}>
                  Desglose de los indicadores
                </h2>
                {datos.indicadores
                  .filter((r) => r.desglose.length > 0)
                  .map((r) => (
                    <section key={r.clave} className={estilos.superficie} aria-labelledby={`desglose-${r.clave}`}>
                      <h3 id={`desglose-${r.clave}`} className={estilos.tituloGrupo}>
                        {r.indicador.nombre}
                      </h3>
                      <TablaDatos
                        titulo={`Desglose de ${r.indicador.nombre}`}
                        columnas={COLUMNAS_DESGLOSE[r.clave]}
                        filas={r.desglose}
                        claveFila={(e) => e.etiqueta}
                      />
                    </section>
                  ))}
              </section>
            )}

            {/*
              SUPUESTO (pendiente de confirmar): la Guía Web 6.1 pone el mapa debajo de las tarjetas, pero la solución
              cartográfica está pendiente (pendiente 7 de los mockups) y el mapa de atenciones (RF-REP-007) tiene su
              propia pantalla. El panel no lo incrusta: enlaza a él con el mismo periodo.
            */}
            <section className={estilos.seccion} aria-labelledby="titulo-mapa">
              <h2 id="titulo-mapa" className={estilos.tituloSeccion}>
                Atenciones en el mapa
              </h2>
              <p className={estilos.ayuda}>
                Consulta en el mapa las atenciones de mantenimiento, poda y control fitosanitario del mismo periodo
              </p>
              <div>
                <BotonEnlace variante="secundario" to={rutaMapaConPeriodo(filtros.desde, filtros.hasta)}>
                  Ver mapa de atenciones
                </BotonEnlace>
              </div>
            </section>

            {notasUnicas(datos.notas, ...datos.indicadores.map((r) => r.notas)).map((nota) => (
              <AvisoEnLinea key={nota} tono="info">
                {nota}
              </AvisoEnLinea>
            ))}
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
