/**
 * Ficha de un elemento priorizado (RN-IA-002), con el mismo aspecto que la ficha de un dato de RF-IA-001 (reutiliza
 * sus estilos): a la izquierda, el panel azul «Sugerencia de la IA» (prioridad, motivos y datos que la sustentan); a
 * la derecha, «Tu decisión» (aceptar, corregir la prioridad o descartar) o, ya validada, la decisión final.
 */
import type { ReactNode } from 'react'
import Icono from '../../../../components/ui/Icono'
import Selector from '../../../../components/ui/Selector'
import type { AccionDecision } from '../../../../types/ia'
import type { DecisionElementoPrioridad, ElementoPriorizado, PrioridadAtencion, SustentoPrioridad } from '../../../../types/priorizacionIa'
import { ETIQUETA_OPCION_ACCION, insigniaAccion } from '../../../../utils/estados'
import { formatearNumero } from '../../../../utils/formato'
import {
  idPrioridadFinal,
  insigniaPrioridad,
  MENSAJES_PRIORIZACION,
  PRIORIDADES,
  textoDecisionFinal,
  type DecisionEnCurso,
} from '../../../../utils/priorizacionIa'
import estilos from '../extraccion/FichaCampo.module.css'
import { ACCIONES } from '../extraccion/valoresCampo'
import estilosElemento from './FichaElemento.module.css'
import GrupoOpciones from '../../../../components/ui/GrupoOpciones'
import Estado from '../../../../components/ui/Estado'
import { insigniaAEstado } from '../../../../components/ui/tonos'

const NO_DISPONIBLE = 'No disponible'

function dias(valor: number | null, texto: (n: string) => string): string | null {
  return valor === null ? null : texto(formatearNumero(valor))
}

/** «Datos que la sustentan»: los null se muestran como «No disponible» (criterio 3). */
function datosSustento(s: SustentoPrioridad): { etiqueta: string; valor: string | null }[] {
  return [
    { etiqueta: 'Incidencias abiertas', valor: s.incidencias_abiertas === null ? null : formatearNumero(s.incidencias_abiertas) },
    { etiqueta: 'Incidencias en 12 meses', valor: s.incidencias_ultimos_12_meses === null ? null : formatearNumero(s.incidencias_ultimos_12_meses) },
    { etiqueta: 'Última atención', valor: dias(s.dias_desde_ultima_atencion, (n) => `hace ${n} días`) },
    { etiqueta: 'Frecuencia', valor: dias(s.frecuencia_mantenimiento_dias, (n) => `cada ${n} días`) },
    {
      etiqueta: 'Retraso',
      valor: s.dias_vencida === null ? null : s.dias_vencida > 0 ? `${formatearNumero(s.dias_vencida)} días vencida` : 'En plazo',
    },
    { etiqueta: 'Estado sanitario', valor: s.estado_sanitario },
  ]
}

export interface FichaElementoProps {
  elemento: ElementoPriorizado
  /** editar: decide la persona; final: ya validada; consulta: sin permiso para decidir. */
  modo: 'editar' | 'final' | 'consulta'
  decision?: DecisionEnCurso
  error?: string
  final?: DecisionElementoPrioridad
  onAccion: (accion: AccionDecision) => void
  onPrioridad: (prioridad: PrioridadAtencion | '') => void
}

export default function FichaElemento({ elemento: e, modo, decision, error, final, onAccion, onPrioridad }: FichaElementoProps) {
  const idTitulo = `elemento-${e.clave}`
  const sinDecision = error === MENSAJES_PRIORIZACION.sinDecision

  let estado = estilos.pendiente
  let insignia: ReactNode = modo === 'editar' ? <Estado tono="neutro" texto="Pendiente" /> : null
  if (error) {
    estado = estilos.conError
    insignia = <Estado tono="error" texto={sinDecision ? 'Falta decidir' : 'Falta la prioridad'} />
  } else if (modo === 'editar' && decision?.accion) {
    estado = estilos.decidido
    insignia = <Estado {...insigniaAEstado(insigniaAccion(decision.accion))} />
  } else if (modo === 'final' && final) {
    estado = estilos.decidido
    insignia = <Estado {...insigniaAEstado(insigniaAccion(final.accion))} />
  }

  return (
    <li>
      <article className={`${estilos.ficha} ${estado}`} aria-labelledby={idTitulo}>
        <div className={estilos.cabecera}>
          <h3 id={idTitulo} className={estilos.nombre}>
            {e.nombre}
            {e.codigo && <span className="cifra"> · {e.codigo}</span>}
          </h3>
          <span className={estilos.tipo}>{e.tipo === 'Area' ? 'Espacio' : `Ejemplar${e.espacio ? ` · ${e.espacio}` : ''}`}</span>
          <span className={estilos.insignia}>{insignia}</span>
        </div>

        <div className={`${estilos.cuerpo} ${modo === 'consulta' ? estilos.unaColumna : ''}`}>
          <div className={estilos.panelIa}>
            <span className={estilos.etiquetaIa}>
              <Icono nombre="destello" tamano="sm" /> Sugerencia de la IA
            </span>
            <div className={estilosElemento.prioridad}>
              <Estado {...insigniaAEstado(insigniaPrioridad(e.prioridad_sugerida))} texto={`Prioridad ${e.prioridad_sugerida.toLowerCase()}`} />
              <span className={`${estilosElemento.puntuacion} cifra`}>{formatearNumero(e.puntuacion)} de 100 puntos</span>
            </div>
            <ul className={estilos.lineas}>
              {e.motivos.map((motivo) => (
                <li key={motivo}>{motivo}</li>
              ))}
            </ul>
            <h4 className={estilosElemento.subtitulo}>Datos que la sustentan</h4>
            <dl className={estilosElemento.sustento}>
              {datosSustento(e.sustento).map((d) => (
                <div key={d.etiqueta}>
                  <dt>{d.etiqueta}</dt>
                  <dd className={d.valor === null ? estilos.noEncontrado : undefined}>{d.valor ?? NO_DISPONIBLE}</dd>
                </div>
              ))}
            </dl>
            {e.faltantes.length > 0 && <p className={estilos.ayuda}>Sin datos de: {e.faltantes.join(', ').toLowerCase()}</p>}
          </div>

          {modo === 'editar' && (
            <div className={estilos.panelDecision}>
              <GrupoOpciones
                etiqueta="Tu decisión"
                idBase={`decision-${e.clave}`}
                horizontal
                opciones={ACCIONES.map((accion) => ({ valor: accion, texto: ETIQUETA_OPCION_ACCION[accion] }))}
                valor={decision?.accion ?? null}
                onCambiar={onAccion}
                descritoPor={sinDecision ? `error-${e.clave}` : undefined}
              />
              {sinDecision && (
                <p id={`error-${e.clave}`} className={estilos.error}>
                  {MENSAJES_PRIORIZACION.sinDecision}
                </p>
              )}
              {decision?.accion === 'corregir' && (
                <div className={estilos.correccion}>
                  <Selector
                    id={idPrioridadFinal(e.clave)}
                    etiqueta={`Prioridad final de ${e.nombre}`}
                    valor={decision.prioridad}
                    opcionTodos="Elige la prioridad"
                    opciones={PRIORIDADES.map((p) => ({ valor: p, texto: p }))}
                    error={error === MENSAJES_PRIORIZACION.sinPrioridad ? error : undefined}
                    onCambiar={(valor) => onPrioridad(PRIORIDADES.find((p) => p === valor) ?? '')}
                  />
                </div>
              )}
            </div>
          )}

          {modo === 'final' && (
            <div className={estilos.panelFinal}>
              <span className={estilos.etiquetaDecision}>Decisión</span>
              <div className={estilos.valor}>{textoDecisionFinal(e.prioridad_sugerida, final)}</div>
            </div>
          )}
        </div>
      </article>
    </li>
  )
}
