import { useState } from 'react'
import GraficoAgrupado from '@/components/reportes-indicadores/graficos/GraficoAgrupado'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { useConsulta } from '@/hooks/useConsulta'
import {
  AGRUPACIONES_ACTIVIDADES,
  AGRUPACIONES_ATENCIONES_ESPACIO,
  AGRUPACIONES_CONSUMO,
  AGRUPACIONES_CUMPLIMIENTO,
  AGRUPACIONES_OPERARIOS,
  cargarRegistros,
  type Agrupacion,
  type DetalleCompleto,
} from '@/pages/reportes-indicadores/panel/registros'
import TablaRegistros from '@/pages/reportes-indicadores/panel/TablaRegistros'
import type { FiltrosPanel } from '@/pages/reportes-indicadores/panel/useFiltrosPanel'
import type {
  ClaveIndicadorPanel,
  FilaActividadCampo,
  FilaAtencionEspacio,
  FilaAtencionPeriodo,
  FilaMovimientoMaterial,
  FilaParticipacionOperario,
} from '@/types/reportesGestion'
import { formatearFecha, formatearNumero } from '@/utils/formato'
import { esClaveIndicador, notasUnicas } from '@/utils/reportesGestion'
import PanelLateral from '../base/PanelLateral/PanelLateral'
import { nombresTransicion, panel as nombrePanel } from '../base/movimiento'
import estilos from './PanelIndicador.module.css'

const TITULO_NO_EXISTE = 'No existe ese indicador'
const unidadMovimiento = (f: FilaMovimientoMaterial) => f.unidad

function NoExiste() {
  return (
    <EstadoVacio
      nivel={3}
      icono="triangulo"
      titulo={TITULO_NO_EXISTE}
      descripcion="Cierra este panel y elige uno de los cinco indicadores."
    />
  )
}

interface ContenidoProps<F> {
  clave: ClaveIndicadorPanel
  agrupaciones: Agrupacion<F>[]
  unidadDe?: (fila: F) => string
  filtrosPanel: FiltrosPanel
}

/** Gráfico y tabla completa de un indicador, con los filtros del panel de cifras. */
function Contenido<F>({ clave, agrupaciones, unidadDe, filtrosPanel }: ContenidoProps<F>) {
  const { filtros, claveAplicados, consulta: parametros } = filtrosPanel
  const [elegida, setElegida] = useState<{ titulo: string; filas: F[] } | null>(null)
  const detalle = useConsulta<DetalleCompleto<F>>(
    `detalle|${clave}|${filtros.desde}|${filtros.hasta}|${claveAplicados}`,
    (signal) => cargarRegistros<F>(clave, parametros, signal),
    (datos) => datos.sin_datos,
  )
  const { datos, error, estado, cargaVisible, reintentar } = detalle

  if (error?.codigo === 'indicador-no-encontrado' || error?.estado === 404) return <NoExiste />
  if (error?.estado === 403) return <EstadoSinAcceso nivel={3} descripcion={error.detalle} />
  if (estado === 'error' && error) {
    return (
      <EstadoError
        nivel={3}
        titulo="No se pudo cargar el indicador"
        descripcion={error.detalle}
        onReintentar={reintentar}
      />
    )
  }
  if (!datos) return cargaVisible ? <EstadoCarga forma="pagina" /> : null
  if (datos.sin_datos) {
    return (
      <EstadoVacio
        nivel={3}
        titulo="Sin registros para este indicador"
        descripcion={datos.mensaje_sin_datos ?? 'No hay registros en el periodo con estos filtros.'}
      />
    )
  }

  const filas = elegida?.filas ?? datos.results
  return (
    <div className={estilos.contenido} aria-busy={estado === 'cargando' || undefined}>
      <section className={estilos.bloque} aria-labelledby="calculo-indicador">
        <h3 id="calculo-indicador" className={estilos.titulo}>
          Cómo se calcula
        </h3>
        <p className={estilos.ayuda}>{datos.indicador.descripcion_calculo}</p>
        <p className={estilos.ayuda}>
          Unidad: {datos.indicador.unidad} · Del {formatearFecha(filtros.desde)} al {formatearFecha(filtros.hasta)}
        </p>
      </section>
      {!datos.completo && (
        <AvisoEnLinea tono="advertencia" titulo="El gráfico resume solo una parte de los registros">
          Hay {formatearNumero(datos.count)} registros con estos filtros y se descargaron{' '}
          {formatearNumero(datos.results.length)}. Acota el periodo para verlos todos.
        </AvisoEnLinea>
      )}
      <section className={`${estilos.bloque} ${estilos.entra}`} aria-labelledby="grafico-indicador">
        <h3 id="grafico-indicador" className={estilos.titulo}>
          Registros del periodo
        </h3>
        <GraficoAgrupado<F>
          // Con otra consulta, el gráfico olvida la barra elegida.
          key={datos.generado_en}
          filas={datos.results}
          agrupaciones={agrupaciones}
          unidadDe={unidadDe}
          onVerDetalle={(titulo, subconjunto) => setElegida({ titulo, filas: subconjunto })}
        />
      </section>
      <section className={`${estilos.bloque} ${estilos.entra}`} aria-labelledby="tabla-indicador">
        <h3 id="tabla-indicador" className={estilos.titulo}>
          {elegida ? elegida.titulo : 'Todos los registros'} ({formatearNumero(filas.length)})
        </h3>
        {elegida && (
          <div>
            <Boton variante="secundario" onClick={() => setElegida(null)}>
              Ver todos los registros
            </Boton>
          </div>
        )}
        <TablaRegistros
          clave={clave}
          titulo={elegida ? elegida.titulo : `Registros de ${datos.indicador.nombre}`}
          filas={filas}
          incompleto={!datos.completo}
        />
      </section>
      {notasUnicas(datos.notas).map((nota) => (
        <AvisoEnLinea key={nota} tono="info">
          {nota}
        </AvisoEnLinea>
      ))}
    </div>
  )
}

function DetalleTipado({ clave, filtrosPanel }: { clave: ClaveIndicadorPanel; filtrosPanel: FiltrosPanel }) {
  switch (clave) {
    case 'atenciones-por-espacio':
      return (
        <Contenido<FilaAtencionEspacio>
          clave={clave}
          agrupaciones={AGRUPACIONES_ATENCIONES_ESPACIO}
          filtrosPanel={filtrosPanel}
        />
      )
    case 'cumplimiento-tercerizados':
      return (
        <Contenido<FilaAtencionPeriodo>
          clave={clave}
          agrupaciones={AGRUPACIONES_CUMPLIMIENTO}
          filtrosPanel={filtrosPanel}
        />
      )
    case 'consumo-materiales':
      return (
        <Contenido<FilaMovimientoMaterial>
          clave={clave}
          agrupaciones={AGRUPACIONES_CONSUMO}
          unidadDe={unidadMovimiento}
          filtrosPanel={filtrosPanel}
        />
      )
    case 'actividades-por-estado':
      return (
        <Contenido<FilaActividadCampo>
          clave={clave}
          agrupaciones={AGRUPACIONES_ACTIVIDADES}
          filtrosPanel={filtrosPanel}
        />
      )
    case 'distribucion-operarios':
      return (
        <Contenido<FilaParticipacionOperario>
          clave={clave}
          agrupaciones={AGRUPACIONES_OPERARIOS}
          filtrosPanel={filtrosPanel}
        />
      )
  }
}

export interface PanelIndicadorProps {
  /** Valor de `?indicador=`; `null` con el panel cerrado. */
  clave: string | null
  /** Nombre del indicador, si el panel de cifras ya lo conoce. */
  nombre?: string
  filtrosPanel: FiltrosPanel
  onCerrar: () => void
}

/** Panel lateral con el gráfico y la tabla completa de un indicador; una clave desconocida dice que no existe. */
export default function PanelIndicador({ clave, nombre, filtrosPanel, onCerrar }: PanelIndicadorProps) {
  const valida = clave !== null && esClaveIndicador(clave) ? clave : null
  return (
    <PanelLateral
      abierto={clave !== null}
      onCerrar={onCerrar}
      titulo={valida ? (nombre ?? 'Detalle del indicador') : 'Indicador'}
      subtitulo={valida ? 'Con los filtros de las cifras' : undefined}
      viewTransitionName={valida ? nombrePanel(valida) : nombresTransicion.panel}
    >
      {valida ? <DetalleTipado key={valida} clave={valida} filtrosPanel={filtrosPanel} /> : <NoExiste />}
    </PanelLateral>
  )
}
