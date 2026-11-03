/**
 * Vista «Lista» de la revisión del cronograma (RF-IA-003): las propuestas agrupadas por semana (de lunes a domingo).
 * En móvil es la única vista, a modo de agenda.
 */
import type { ReactNode } from 'react'
import type { PropuestaCronograma } from '../../../../types/cronogramaIa'
import { agruparPorSemana } from '../../../../utils/cronogramaIa'
import estilosIa from '../AsistenciaIa.module.css'
import estilos from './Cronograma.module.css'

export interface ListaPorSemanaProps {
  propuestas: PropuestaCronograma[]
  renderFicha: (propuesta: PropuestaCronograma) => ReactNode
}

export default function ListaPorSemana({ propuestas, renderFicha }: ListaPorSemanaProps) {
  return (
    <div className={estilos.semana}>
      {agruparPorSemana(propuestas).map((semana) => (
        <section key={semana.lunes} className={estilos.semana} aria-labelledby={`semana-${semana.lunes}`}>
          <h3 id={`semana-${semana.lunes}`} className={estilos.tituloSemana}>
            {semana.titulo}
          </h3>
          <ul className={estilosIa.fichasCampo}>{semana.propuestas.map(renderFicha)}</ul>
        </section>
      ))}
    </div>
  )
}
