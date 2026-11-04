/**
 * Vista «Calendario» de la revisión del cronograma (RF-IA-003): el calendario al estilo de Teams con lo programado y
 * la propuesta, y a la derecha (debajo en tablet) el panel con la ficha de la propuesta elegida. Avisa si la
 * propuesta se cruza con algo ya programado en el mismo espacio.
 */
import type { ReactNode } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import type { ProgramacionExistente, PropuestaCronograma, RestriccionConsiderada } from '@/types/cronogramaIa'
import { crucesConProgramado, fechasEfectivas, textoPeriodoCorto } from '@/utils/cronogramaIa'
import { formatearNumero } from '@/utils/formato'
import CalendarioCronograma, { type CalendarioCronogramaProps } from './CalendarioCronograma'
import estilos from './Cronograma.module.css'

export interface VistaCalendarioProps {
  desde: string
  hasta: string
  propuestas: PropuestaCronograma[]
  existentes: ProgramacionExistente[]
  existentesDisponibles: boolean
  restricciones: RestriccionConsiderada[]
  /** Decisiones que se pintan: las de la revisión en curso o, ya confirmada, las finales. */
  decisiones: CalendarioCronogramaProps['decisiones']
  elegida: string | null
  onElegir: (clave: string | null) => void
  renderFicha: (propuesta: PropuestaCronograma) => ReactNode
}

export default function VistaCalendario({
  desde,
  hasta,
  propuestas,
  existentes,
  existentesDisponibles,
  restricciones,
  decisiones,
  elegida,
  onElegir,
  renderFicha,
}: VistaCalendarioProps) {
  const propuesta = propuestas.find((p) => p.clave === elegida)
  const valores = propuesta ? decisiones[propuesta.clave]?.valores : null
  const cruces = propuesta
    ? crucesConProgramado({ area_verde_id: valores?.area_verde_id ?? propuesta.area_verde_id, ...fechasEfectivas(propuesta, valores) }, existentes)
    : []
  const decididas = propuestas.filter((p) => decisiones[p.clave]?.accion).length

  return (
    <div className={estilos.conPanel}>
      <CalendarioCronograma
        desde={desde}
        hasta={hasta}
        propuestas={propuestas}
        existentes={existentes}
        existentesDisponibles={existentesDisponibles}
        restricciones={restricciones}
        decisiones={decisiones}
        elegida={elegida}
        onElegir={(clave) => onElegir(elegida === clave ? null : clave)}
      />
      <aside className={`${estilos.panel} ${estilos.panelLateral}`} aria-label="Propuesta seleccionada">
        {propuesta ? (
          <>
            <div className={estilos.cabeceraPanel}>
              <h3 className={estilos.tituloPanel}>Propuesta seleccionada</h3>
              <Boton variante="fantasma" compacto onClick={() => onElegir(null)}>
                Cerrar
              </Boton>
            </div>
            {cruces.length > 0 && (
              <AvisoEnLinea tono="advertencia" titulo="Se cruza con lo ya programado">
                {cruces.map((c) => `${c.actividad} (${textoPeriodoCorto(c.fecha_inicio, c.fecha_fin)})`).join(', ')}
              </AvisoEnLinea>
            )}
            <ul className={estilos.fichaPanel}>{renderFicha(propuesta)}</ul>
          </>
        ) : (
          <>
            <h3 className={estilos.tituloPanel}>Revisa la propuesta en el calendario</h3>
            <p className={estilos.secundario}>
              Pulsa un bloque «Propuesta IA» para ver por qué se sugiere y decidir si aceptarlo, modificarlo o descartarlo.
            </p>
            <p className="cifra">
              {formatearNumero(decididas)} de {formatearNumero(propuestas.length)} decididas
            </p>
          </>
        )}
      </aside>
    </div>
  )
}
