/**
 * Panel «Ciclo» (RD-29): código, proveedor, fechas, franja, avance, indicadores, historial y enlace al requerimiento.
 * La fila de la lista crece hasta este panel (`fila(id)` → `panel(id)`) y el cambio de estado anima la etiqueta con
 * `transicionar()`. Los cambios de estado (iniciar, finalizar, cancelar) solo se ofrecen a quien gestiona la
 * planificación; el servidor vuelve a comprobarlo. En un corte en curso con la ruta completa, «Finalizar ciclo» pasa a
 * «Cerrar ciclo», como en la ficha actual (la ruta, las interrupciones y la limpieza son de RD-30).
 */
import BarraAvance from '@/design-system/BarraAvance'
import Boton from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { useConsulta } from '@/hooks/useConsulta'
import { avanceCiclo } from '@/pages/planificacion/ciclos/ciclos'
import { esCorte, rutaCompleta } from '@/pages/planificacion/ciclos/corte'
import {
  accionesCiclo,
  historialCiclo,
  indicadoresCiclo,
  periodoCiclo,
  subtituloCiclo,
} from '@/pages/planificacion/ciclos/detalleCiclo'
import { conflictosDelPeriodo } from '@/pages/planificacion/calendario/programarCiclo'
import { ESTADO_PROGRAMACION } from '@/pages/planificacion/resumen/resumenPlanificacion'
import {
  listarRestricciones,
  listarServiciosPeriodicos,
  obtenerProgramacion,
  type CambioEstadoCiclo,
} from '@/services/api/planificacion'
import { obtenerCicloCorte } from '@/services/api/corte'
import { obtenerResumenSectores } from '@/services/api/resumenSectores'
import type { FechaIso } from '@/types/comun'
import type { Programacion } from '@/types/planificacion'
import { codigoCorto } from '@/utils/estadosTercerizados'
import { EnlaceTransicion, estiloTransicion, panel } from '@/rediseno/base/movimiento'
import PanelLateral from '@/rediseno/base/PanelLateral/PanelLateral'
import { rutaAtencion } from '@/rediseno/proveedores/enlaces'
import { avanceGlobal, resumenDelCiclo, textoActualizacion, textoPorcentaje, ultimaActualizacion } from '../sectores'
import estilos from './Ciclos.module.css'

/** Nombre de la etiqueta de estado: al cambiar de estado, la etiqueta vieja se funde con la nueva. */
export const ETIQUETA_ESTADO_CICLO = 'estado-ciclo'

export interface PanelCicloProps {
  id: number
  hoy: FechaIso
  /** El ciclo ya cargado en la lista (para abrir al instante) y el devuelto por el último cambio de estado. */
  deLista: Programacion | null
  actualizado: Programacion | null
  /** Cambia con cada cambio de estado: fuerza a leer de nuevo el ciclo con su historial. */
  version: number
  puedeEditar: boolean
  onCerrar: () => void
  onAccion: (ciclo: Programacion, cambio: CambioEstadoCiclo) => void
}

export default function PanelCiclo({
  id,
  hoy,
  deLista,
  actualizado,
  version,
  puedeEditar,
  onCerrar,
  onAccion,
}: PanelCicloProps) {
  const detalle = useConsulta(`rd-ciclo:${id}:${version}`, (signal) => obtenerProgramacion(id, signal))
  const servicios = useConsulta('rd-servicios', listarServiciosPeriodicos)
  // `useConsulta` conserva los datos anteriores mientras llegan los nuevos: solo valen los de este ciclo.
  const delServidor = detalle.datos?.id === id ? detalle.datos : null
  const suyo = actualizado?.id === id ? actualizado : null
  const base = delServidor ?? suyo ?? deLista
  const ciclo: Programacion | null = base && {
    ...base,
    ...suyo,
    historial: suyo?.historial ?? delServidor?.historial ?? deLista?.historial,
  }
  const servicio = servicios.datos?.find((s) => s.id === ciclo?.tipo_servicio_id)
  const periodo = ciclo ? periodoCiclo(ciclo, hoy) : null
  const restricciones = useConsulta(
    periodo ? `ciclo-restricciones:${periodo.desde}:${periodo.hasta}` : null,
    (signal) =>
      periodo ? listarRestricciones(periodo.desde, periodo.hasta, signal) : Promise.reject(new Error('Sin ciclo')),
  )
  const resumen = useConsulta(ciclo ? `rd-resumen-ciclo:${id}:${version}` : null, (signal) =>
    obtenerResumenSectores({ cicloId: id }, signal),
  )
  // Solo para saber si la ruta del corte en curso está completa («Cerrar ciclo»); sin ella, «Finalizar ciclo».
  const corteEnCurso = puedeEditar && ciclo?.estado === 'EnCurso' && esCorte(ciclo.servicio) ? ciclo : null
  const corte = useConsulta(corteEnCurso ? `rd-ciclo-corte:${id}:${version}` : null, (signal) =>
    corteEnCurso ? obtenerCicloCorte(corteEnCurso, signal) : Promise.reject(new Error('Sin corte en curso')),
  )

  const noExiste = detalle.error?.estado === 404 && !ciclo
  let cuerpo
  if (detalle.error?.estado === 403 && !ciclo) {
    cuerpo = (
      <EstadoSinAcceso
        nivel={3}
        titulo="No puedes ver este ciclo"
        descripcion="El servidor no permite consultarlo con tu cuenta."
      />
    )
  } else if (noExiste) {
    cuerpo = (
      <EstadoVacio
        nivel={3}
        titulo="No existe este ciclo"
        descripcion="Revisa el enlace o búscalo en la lista de ciclos."
      />
    )
  } else if (detalle.estado === 'error' && !ciclo) {
    cuerpo = (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar el ciclo"
        descripcion={detalle.error?.detalle ?? ''}
        onReintentar={detalle.reintentar}
      />
    )
  } else if (!ciclo) {
    cuerpo = <EstadoCarga forma="tarjetas" texto="Cargando el ciclo…" />
  }
  if (!ciclo || cuerpo) {
    return (
      <PanelLateral abierto onCerrar={onCerrar} titulo="Ciclo" viewTransitionName={panel(`ciclo-${id}`)}>
        {cuerpo}
      </PanelLateral>
    )
  }

  const estado = ESTADO_PROGRAMACION[ciclo.estado]
  const conflictos = conflictosDelPeriodo(
    restricciones.datos ?? [],
    periodo?.desde ?? ciclo.fecha_inicio_prevista,
    periodo?.hasta ?? ciclo.fecha_fin_prevista,
    servicio?.es_ruidoso ?? true,
  )
  // Sin las restricciones leídas, no se dice «Ninguna»: ese indicador espera a tenerlas.
  const indicadores = indicadoresCiclo(ciclo, servicio, conflictos, hoy).filter(
    (i) => i.etiqueta !== 'Restricciones' || restricciones.datos,
  )
  const datosResumen = resumenDelCiclo(resumen.datos, ciclo)
  const global = datosResumen ? avanceGlobal(datosResumen) : null
  const enDias = avanceCiclo(ciclo, hoy)
  const porcentaje = global?.porcentaje ?? enDias
  const actualizadoA = datosResumen ? textoActualizacion(ultimaActualizacion(datosResumen)) : null
  const historial = historialCiclo(ciclo)
  const conRutaCompleta = corteEnCurso !== null && corte.datos !== null && rutaCompleta(corte.datos)
  const acciones = (puedeEditar ? accionesCiclo(ciclo.estado) : []).map((a) =>
    a.cambio === 'fin' && conRutaCompleta ? { ...a, texto: 'Cerrar ciclo' } : a,
  )

  const detalleCiclo = (
    <>
      <p className={estilos.estadoCiclo}>
        <span style={estiloTransicion(ETIQUETA_ESTADO_CICLO)} /* estilo-calculado */>
          <Estado tono={estado.tono} texto={estado.texto} punto={ciclo.estado !== 'EnCurso'} />
        </span>
      </p>
      <section className={estilos.seccion} aria-labelledby="avance-ciclo">
        <h3 id="avance-ciclo">Avance</h3>
        {porcentaje === null ? (
          <p className={estilos.nota}>Aún sin avance.</p>
        ) : (
          <>
            <p className={estilos.cifra}>{textoPorcentaje(porcentaje)}</p>
            <BarraAvance
              valor={porcentaje}
              maximo={100}
              etiqueta={`Avance de ${ciclo.codigo ?? ciclo.servicio}`}
              textoValor={textoPorcentaje(porcentaje)}
            />
            <p className={estilos.nota}>
              {global && global.porcentaje !== null
                ? `${global.ejecutado} de ${global.programado} áreas`
                : 'Avance en días del ciclo'}
              {actualizadoA && ` · ${actualizadoA}`}
            </p>
          </>
        )}
      </section>
      <ul className={estilos.indicadores} aria-label="Indicadores del ciclo">
        {indicadores.map((i) => (
          <li key={i.etiqueta} className={estilos.indicador} data-alerta={i.exceso > 0 || undefined}>
            <span className={estilos.etiquetaIndicador}>{i.etiqueta}</span>
            <span className={estilos.valorIndicador}>{i.valor}</span>
            {i.contexto && <span className={estilos.nota}>{i.contexto}</span>}
            {i.exceso > 0 && <Estado tono="error" texto={`Excede en ${i.exceso} ${i.exceso === 1 ? 'día' : 'días'}`} />}
            {i.nota && <span className={estilos.nota}>{i.nota}</span>}
          </li>
        ))}
      </ul>
      <section className={estilos.seccion} aria-labelledby="requerimiento-ciclo">
        <h3 id="requerimiento-ciclo">Requerimiento</h3>
        {ciclo.requerimiento ? (
          <EnlaceTransicion to={rutaAtencion(ciclo.requerimiento.id)}>
            Requerimiento {codigoCorto(ciclo.requerimiento.codigo)} · Servicios tercerizados
          </EnlaceTransicion>
        ) : (
          <p className={estilos.nota}>
            {ciclo.motivo_sin_requerimiento
              ? `Sin requerimiento en Servicios tercerizados: ${ciclo.motivo_sin_requerimiento}`
              : 'Este ciclo no tiene requerimiento en Servicios tercerizados.'}
          </p>
        )}
      </section>
    </>
  )

  let contenidoHistorial
  if (historial.length > 0) {
    contenidoHistorial = (
      <ul className={estilos.historial}>
        {historial.map((e) => (
          <li key={e.clave}>
            <span>{e.texto}</span>
            <span className={estilos.nota}>{e.detalle}</span>
          </li>
        ))}
      </ul>
    )
  } else if (detalle.estado === 'error' && !delServidor) {
    contenidoHistorial = (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar el historial"
        descripcion={detalle.error?.detalle ?? ''}
        onReintentar={detalle.reintentar}
      />
    )
  } else if (!delServidor) {
    contenidoHistorial = <EstadoCarga forma="tarjetas" texto="Cargando el historial…" />
  } else {
    contenidoHistorial = (
      <EstadoVacio nivel={3} titulo="Sin historial" descripcion="Los cambios de estado del ciclo aparecerán aquí." />
    )
  }

  return (
    <PanelLateral
      abierto
      onCerrar={onCerrar}
      titulo={ciclo.codigo ?? ciclo.servicio}
      subtitulo={[ciclo.codigo && ciclo.servicio, subtituloCiclo(ciclo, servicio)].filter(Boolean).join(' · ')}
      viewTransitionName={panel(`ciclo-${id}`)}
      pestanas={[
        { valor: 'detalle', texto: 'Detalle', contenido: detalleCiclo },
        { valor: 'historial', texto: 'Historial', contenido: contenidoHistorial },
      ]}
      pie={
        acciones.length > 0 && (
          <>
            {acciones.map((a) => (
              <Boton key={a.cambio} variante={a.variante} onClick={() => onAccion(ciclo, a.cambio)}>
                {a.texto}
              </Boton>
            ))}
          </>
        )
      }
    />
  )
}
