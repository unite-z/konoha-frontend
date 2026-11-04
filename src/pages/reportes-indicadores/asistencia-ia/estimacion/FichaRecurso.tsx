/**
 * Ficha de decisión de un bloque de la estimación (operarios, duración o insumos) con el sistema de diseño: una
 * `Tarjeta` con la «Sugerencia de la IA» (fondo informativo) a la izquierda y «Tu decisión» (`GrupoOpciones`) a la
 * derecha. Al corregir, la ficha muestra los campos que recibe en `correccion`. Ya confirmada, muestra la decisión.
 */
import type { ReactNode } from 'react'
import Estado from '../../../../components/ui/Estado'
import GrupoOpciones from '../../../../components/ui/GrupoOpciones'
import Icono from '../../../../components/ui/Icono'
import Tarjeta from '../../../../components/ui/Tarjeta'
import type { AccionDecision } from '../../../../types/ia'
import estilos from './Estimacion.module.css'

const OPCIONES: { valor: AccionDecision; texto: string }[] = [
  { valor: 'aceptar', texto: 'Aceptar' },
  { valor: 'corregir', texto: 'Corregir' },
  { valor: 'descartar', texto: 'Descartar' },
]

const ESTADO_ACCION: Record<AccionDecision, { tono: 'exito' | 'info' | 'neutro'; texto: string }> = {
  aceptar: { tono: 'exito', texto: 'Aceptado' },
  corregir: { tono: 'info', texto: 'Corregido' },
  descartar: { tono: 'neutro', texto: 'Descartado' },
}

export interface FichaRecursoProps {
  titulo: string
  /** Lo que propone la IA, con unidades. */
  sugerencia: ReactNode
  /** editar: decide la persona; final: ya confirmada; consulta: sin permiso para decidir. */
  modo: 'editar' | 'final' | 'consulta'
  accion?: AccionDecision
  onAccion: (accion: AccionDecision) => void
  /** Campos para corregir (se muestran al elegir «Corregir»). */
  correccion?: ReactNode
  /** Valor confirmado (modo final). */
  final?: ReactNode
  error?: string
}

export default function FichaRecurso({ titulo, sugerencia, modo, accion, onAccion, correccion, final, error }: FichaRecursoProps) {
  const estado = accion ? ESTADO_ACCION[accion] : modo === 'editar' ? { tono: 'neutro' as const, texto: 'Pendiente' } : null
  return (
    <Tarjeta titulo={titulo} nivel={3} acciones={estado && <Estado tono={error ? 'error' : estado.tono} texto={error ? 'Falta decidir' : estado.texto} />}>
      <div className={`${estilos.ficha} ${modo === 'consulta' ? estilos.unaColumna : ''}`}>
        <div className={estilos.sugerencia}>
          <span className={estilos.etiquetaIa}>
            <Icono nombre="destello" tamano="sm" /> Sugerencia de la IA
          </span>
          <div className={estilos.valor}>{sugerencia}</div>
        </div>

        {modo === 'editar' && (
          <div className={estilos.decision}>
            <GrupoOpciones etiqueta="Tu decisión" opciones={OPCIONES} valor={accion ?? null} onCambiar={onAccion} error={error} />
            {accion === 'corregir' && correccion}
          </div>
        )}
        {modo === 'final' && (
          <div className={estilos.decision}>
            <span className={estilos.etiquetaIa}>Confirmado</span>
            <div className={estilos.final}>{final}</div>
          </div>
        )}
      </div>
    </Tarjeta>
  )
}
