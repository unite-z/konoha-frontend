// RF-REP-001 · M6-01, M6-08, M6-09
import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { useCatalogosFiltros } from '@/components/reportes-indicadores/useCatalogosFiltros'
import { PERMISOS, puede } from '@/config/permisosCore'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton, { BotonEnlace } from '@/design-system/Boton'
import DialogoDetalle from '@/design-system/DialogoDetalle'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import BarraFiltrosPanel from '@/pages/reportes-indicadores/panel/BarraFiltrosPanel'
import GraficoDesglose from '@/pages/reportes-indicadores/panel/GraficoDesglose'
import RegistrosDeBarra from '@/pages/reportes-indicadores/panel/RegistrosDeBarra'
import { useFiltrosPanel, type FiltrosPanel } from '@/pages/reportes-indicadores/panel/useFiltrosPanel'
import PlantillaReporte from '@/pages/reportes-indicadores/reportes/PlantillaReporte'
import { obtenerPanel } from '@/services/api/reportesGestion'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type { ClaveIndicadorPanel, ResultadoPanel } from '@/types/reportesGestion'
import { formatearFecha } from '@/utils/formato'
import { notasUnicas } from '@/utils/reportesGestion'
import { estiloTransicion, nombresTransicion, useFocoConLaVista } from '../base/movimiento'
import { useParametroPanel } from '../base/PanelLateral/useParametroPanel'
import { rutaMapa } from '../mapa/enlaces'
import Cifras from './Cifras'
import SeccionExportaciones from './Exportar/SeccionExportaciones'
import { INFORMES } from './catalogoInformes'
import { PARAMETRO_INDICADOR, PARAMETRO_INFORME } from './enlaces'
import Informes from './Informes/Informes'
import { esInformeEnLinea } from './Informes/informesEnLinea'
import { PanelInforme, SelectorInformes } from './SelectorInformes'
import PanelIndicador from './PanelIndicador'
import estilos from './ReportesPage.module.css'
import ResumenCalculado from './ResumenCalculado'

const TITULO = 'Reportes'

/** Barra del desglose elegida para «Ver detalles». */
interface BarraElegida {
  clave: ClaveIndicadorPanel
  etiqueta: string
  titulo: string
}

function Encabezado({ periodo }: { periodo?: string }) {
  const foco = useFocoConLaVista<HTMLHeadingElement>()
  return (
    <header
      className={estilos.encabezado}
      style={estiloTransicion(nombresTransicion.encabezado)} /* estilo-calculado */
    >
      <h1 ref={foco} tabIndex={-1} className={estilos.titulo}>
        {TITULO}
      </h1>
      {periodo && <p className={estilos.ayuda}>{periodo}</p>}
    </header>
  )
}

/** Panel de cifras (RF-REP-001): sin `?informe=` en línea. */
function ContenidoPanel({ filtrosPanel, periodo }: { filtrosPanel: FiltrosPanel; periodo: string }) {
  const { search } = useLocation()
  const { filtros, claveAplicados, hayFiltros, consulta: parametros, limpiar } = filtrosPanel
  const catalogos = useCatalogosFiltros()
  const indicador = useParametroPanel(PARAMETRO_INDICADOR)
  const informe = useParametroPanel(PARAMETRO_INFORME)
  const [barra, setBarra] = useState<BarraElegida | null>(null)

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
  const nombreAbierto = consulta.datos?.indicadores.find((r) => r.clave === indicador.valor)?.indicador.nombre
  // Con los cinco indicadores vacíos, `PlantillaReporte` solo pinta el vacío: las notas que explican el motivo van
  // debajo (como en el panel actual). Misma condición que su estado vacío.
  const notasSinDatos =
    consulta.estado !== 'error' && !consulta.cargaVisible && consulta.datos?.sin_datos
      ? notasUnicas(consulta.datos.notas, ...consulta.datos.indicadores.map((r) => r.notas))
      : []
  const mapa = `${rutaMapa()}?${new URLSearchParams({ capa: 'atenciones', desde: filtros.desde, hasta: filtros.hasta })}`

  return (
    <>
      <PlantillaReporte
        consulta={consultaConCatalogos}
        filtros={
          <div className={estilos.vidrio}>
            <BarraFiltrosPanel
              filtrosPanel={filtrosPanel}
              catalogos={catalogos}
              error={consulta.error}
              cargando={consulta.estado === 'cargando' && consulta.cargaVisible}
              onReintentar={consultaConCatalogos.reintentar}
            />
          </div>
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
            <Cifras indicadores={datos.indicadores} abierto={indicador.valor} busqueda={search} />
            <ResumenCalculado panel={datos} />
            {datos.indicadores.some((r) => r.desglose.length > 0) && (
              <section className={estilos.seccion} aria-labelledby="titulo-desglose">
                <h2 id="titulo-desglose" className={estilos.tituloSeccion}>
                  Desglose de los indicadores
                </h2>
                <div className={`${estilos.graficos} ${estilos.entra}`}>
                  {datos.indicadores
                    .filter((r) => r.desglose.length > 0)
                    .map((r) => (
                      <GraficoDesglose
                        // Con otra consulta, el gráfico olvida la barra elegida.
                        key={`${r.clave}|${datos.generado_en}`}
                        resultado={r}
                        onVerDetalle={(s) => setBarra({ clave: r.clave, ...s })}
                      />
                    ))}
                </div>
              </section>
            )}
            <div>
              <BotonEnlace variante="secundario" to={mapa}>
                Ver atenciones en el mapa
              </BotonEnlace>
            </div>
            {notasUnicas(datos.notas, ...datos.indicadores.map((r) => r.notas)).map((nota) => (
              <AvisoEnLinea key={nota} tono="info">
                {nota}
              </AvisoEnLinea>
            ))}
            <DialogoDetalle
              abierto={barra !== null}
              titulo={barra?.titulo ?? ''}
              descripcion={periodo}
              onCerrar={() => setBarra(null)}
            >
              {barra && (
                <RegistrosDeBarra
                  clave={barra.clave}
                  etiqueta={barra.etiqueta}
                  titulo={barra.titulo}
                  consulta={parametros}
                  claveFiltros={`${filtros.desde}|${filtros.hasta}|${claveAplicados}`}
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
      <SeccionExportaciones />
      <PanelIndicador
        clave={indicador.valor}
        nombre={nombreAbierto}
        filtrosPanel={filtrosPanel}
        onCerrar={indicador.cerrar}
      />
      {indicador.valor === null && <PanelInforme clave={informe.valor} onCerrar={informe.cerrar} />}
    </>
  )
}

/**
 * Encabezado y selector se montan una sola vez: al pasar del panel a un informe solo cambia el contenido, así que el foco
 * sigue en el enlace elegido y la lente se desliza sin que se mueva el resto.
 */
function ReportesContenido({ enLinea }: { enLinea: string | null }) {
  const { search } = useLocation()
  const filtrosPanel = useFiltrosPanel()
  const { filtros } = filtrosPanel
  const periodo = `Del ${formatearFecha(filtros.desde)} al ${formatearFecha(filtros.hasta)}`
  return (
    <div className={estilos.pagina}>
      {/* Cada informe tiene su propio periodo: el del panel solo se enseña con el panel. */}
      <Encabezado periodo={enLinea ? undefined : periodo} />
      <SelectorInformes busqueda={search} elegido={new URLSearchParams(search).get(PARAMETRO_INFORME)} />
      {enLinea ? (
        <>
          <Informes clave={enLinea} />
          <SeccionExportaciones />
        </>
      ) : (
        <ContenidoPanel filtrosPanel={filtrosPanel} periodo={periodo} />
      )}
    </div>
  )
}

export default function ReportesPage() {
  const sesion = useSesionActiva()
  const [parametros] = useSearchParams()
  const informe = parametros.get(PARAMETRO_INFORME)
  // Con un indicador abierto manda su panel; si no, los informes de RD-60 se pintan dentro de la vista.
  const enLinea = esInformeEnLinea(informe) && !parametros.has(PARAMETRO_INDICADOR) ? informe : null
  // El informe incrustado pone su título en la pestaña del navegador; al volver al panel se restablece.
  usePaginaActual(enLinea ? (INFORMES.find((i) => i.clave === enLinea)?.titulo ?? TITULO) : TITULO, [{ texto: TITULO }])
  if (!puede(sesion, PERMISOS.consultarIndicadores)) {
    return (
      <div className={estilos.pagina}>
        <Encabezado />
        <EstadoSinAcceso
          titulo="No tienes acceso a Reportes"
          descripcion="Tu rol no incluye esta sección. Si la necesitas, pide a la jefatura que revise tu rol."
        />
      </div>
    )
  }
  return <ReportesContenido enLinea={enLinea} />
}
