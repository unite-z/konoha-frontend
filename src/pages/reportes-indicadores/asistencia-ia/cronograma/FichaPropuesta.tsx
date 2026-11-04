/**
 * Ficha de una propuesta del cronograma (RF-IA-003), con el aspecto de la ficha de RF-IA-001 (reutiliza sus estilos):
 * a la izquierda, «Sugerencia de la IA» (actividad, ubicación, fechas, recursos y motivo, con el aviso si coincide
 * con una restricción); a la derecha, «Tu decisión» (aceptar, modificar o descartar) o, ya confirmada, la decisión.
 * Si coincide con una prohibición y no se descarta, exige la confirmación expresa de RI-25.
 */
import type { ReactNode } from 'react'
import { useEsMovil } from '../../../../components/reportes-indicadores/useEsMovil'
import AvisoEnLinea from '../../../../components/ui/AvisoEnLinea'
import Boton from '../../../../components/ui/Boton'
import Icono from '../../../../components/ui/Icono'
import type { AccionDecision } from '../../../../types/ia'
import type { DecisionPropuestaCronograma, PropuestaCronograma, ValoresCronograma } from '../../../../types/cronogramaIa'
import { insigniaAccion } from '../../../../utils/estados'
import {
  idConfirmaRestriccion,
  MENSAJES_CRONOGRAMA,
  prohibicionesDe,
  textoPeriodoCorto,
  textoRecursos,
  type DecisionEnCursoCronograma,
} from '../../../../utils/cronogramaIa'
import estilos from '../extraccion/FichaCampo.module.css'
import { ACCIONES } from '../extraccion/valoresCampo'
import estilosCronograma from './Cronograma.module.css'
import GrupoOpciones from '../../../../components/ui/GrupoOpciones'
import Casilla from '../../../../components/ui/Casilla'
import Estado from '../../../../components/ui/Estado'
import { insigniaAEstado } from '../../../../components/ui/tonos'

const ETIQUETA_ACCION: Record<AccionDecision, string> = { aceptar: 'Aceptar', corregir: 'Modificar', descartar: 'Descartar' }

export interface FichaPropuestaProps {
  propuesta: PropuestaCronograma
  modo: 'editar' | 'final' | 'consulta'
  decision?: DecisionEnCursoCronograma
  error?: string
  final?: DecisionPropuestaCronograma
  /** Texto de los cambios del usuario («04 nov. → 06 nov.; …»). */
  textoCambios: (valores: ValoresCronograma) => string
  onAccion: (accion: AccionDecision) => void
  onModificar: () => void
  onConfirma: (confirma: boolean) => void
}

export default function FichaPropuesta({ propuesta: p, modo, decision, error, final, textoCambios, onAccion, onModificar, onConfirma }: FichaPropuestaProps) {
  const esMovil = useEsMovil()
  const prohibiciones = prohibicionesDe(p)
  const idTitulo = `propuesta-${p.clave}`

  let estado = estilos.pendiente
  let insignia: ReactNode = modo === 'editar' ? <Estado tono="neutro" texto="Pendiente" /> : null
  if (error) {
    estado = estilos.conError
    insignia = <Estado tono="error" texto="Revisa la decisión" />
  } else if (modo === 'editar' && decision?.accion) {
    estado = estilos.decidido
    insignia = <Estado {...insigniaAEstado(insigniaAccion(decision.accion))} texto={decision.accion === 'corregir' ? 'Modificada' : insigniaAccion(decision.accion).texto} />
  } else if (modo === 'final' && final) {
    estado = estilos.decidido
    insignia = <Estado {...insigniaAEstado(insigniaAccion(final.accion))} texto={final.accion === 'corregir' ? 'Modificada' : insigniaAccion(final.accion).texto} />
  }

  return (
    <li>
      <article className={`${estilos.ficha} ${estado}`} aria-labelledby={idTitulo}>
        <div className={estilos.cabecera}>
          <h4 id={idTitulo} className={estilos.nombre}>
            {p.actividad}
          </h4>
          <span className={estilos.tipo}>{p.ubicacion}</span>
          <span className={estilos.insignia}>{insignia}</span>
        </div>

        <div className={`${estilos.cuerpo} ${modo === 'consulta' ? estilos.unaColumna : ''}`}>
          <div className={estilos.panelIa}>
            <span className={estilos.etiquetaIa}>
              <Icono nombre="destello" tamano="sm" /> Sugerencia de la IA
            </span>
            <p className={`${estilosCronograma.fechas} cifra`}>{textoPeriodoCorto(p.fecha_inicio, p.fecha_fin)}</p>
            <p>{textoRecursos(p.recursos)}</p>
            <details className={estilosCronograma.motivo} open={!esMovil}>
              <summary>Ver por qué</summary>
              <p>{p.motivo}</p>
            </details>
            {p.coincidencias.map((c) => (
              <AvisoEnLinea key={`${c.tipo}-${c.descripcion}`} tono={c.tipo === 'Prohibicion' ? 'error' : 'advertencia'}>
                {c.tipo === 'Prohibicion' ? 'Coincide con una prohibición' : 'Coincide con una advertencia'}: {c.descripcion} (
                {textoPeriodoCorto(c.fecha_inicio, c.fecha_fin)})
              </AvisoEnLinea>
            ))}
          </div>

          {modo === 'editar' && (
            <div className={estilos.panelDecision}>
              <GrupoOpciones
                etiqueta="Tu decisión"
                idBase={`decision-${p.clave}`}
                horizontal
                opciones={ACCIONES.map((accion) => ({ valor: accion, texto: ETIQUETA_ACCION[accion] }))}
                valor={decision?.accion ?? null}
                onCambiar={onAccion}
              />
              {decision?.accion === 'corregir' && (
                <div className={estilos.correccion}>
                  <p>{decision.valores ? `Modificado: ${textoCambios(decision.valores)}` : 'Aún no has indicado los cambios'}</p>
                  <Boton variante="fantasma" onClick={onModificar}>
                    {decision.valores ? 'Cambiar la modificación' : 'Indicar los cambios'}
                  </Boton>
                </div>
              )}
              {prohibiciones.length > 0 && decision?.accion && decision.accion !== 'descartar' && (
                <Casilla
                  id={idConfirmaRestriccion(p.clave)}
                  etiqueta={`Confirmo programar pese a la prohibición: ${prohibiciones.map((r) => r.descripcion).join(', ')}`}
                  marcada={decision.confirma}
                  onCambiar={onConfirma}
                />
              )}
              {error && <p className={estilos.error}>{error}</p>}
            </div>
          )}

          {modo === 'final' && (
            <div className={estilos.panelFinal}>
              <span className={estilos.etiquetaDecision}>Decisión</span>
              <div className={estilos.valor}>
                {!final
                  ? MENSAJES_CRONOGRAMA.sinDecision
                  : final.accion === 'descartar'
                    ? 'Descartada: no se programa'
                    : final.accion === 'corregir' && final.valores_finales
                      ? `Modificada: ${textoCambios(final.valores_finales)}`
                      : 'Aceptada tal como se propuso'}
              </div>
            </div>
          )}
        </div>
      </article>
    </li>
  )
}
