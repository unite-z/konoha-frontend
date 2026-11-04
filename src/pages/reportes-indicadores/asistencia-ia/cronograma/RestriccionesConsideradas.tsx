/**
 * «Restricciones consideradas» (RF-IA-003, criterio 5): las restricciones de calendario que usó la IA, con la misma
 * presentación que Planificación (prohibición en rojo y advertencia en ámbar, siempre con texto e icono).
 */
import type { RestriccionConsiderada } from '../../../../types/cronogramaIa'
import { PRESENTACION_RESTRICCION, textoPeriodoCorto } from '../../../../utils/cronogramaIa'
import estilos from './Cronograma.module.css'
import Estado from '../../../../components/ui/Estado'
import { insigniaAEstado } from '../../../../components/ui/tonos'

export default function RestriccionesConsideradas({ restricciones }: { restricciones: RestriccionConsiderada[] }) {
  return (
    <section className={estilos.panel} aria-labelledby="titulo-restricciones">
      <h2 id="titulo-restricciones" className={estilos.tituloPanel}>
        Restricciones consideradas
      </h2>
      {restricciones.length === 0 ? (
        <p className={estilos.secundario}>No hay restricciones de calendario en el periodo.</p>
      ) : (
        <ul className={estilos.listaRestricciones}>
          {restricciones.map((r) => (
            <li key={`${r.tipo}-${r.fecha_inicio}-${r.descripcion}`}>
              <Estado {...insigniaAEstado(PRESENTACION_RESTRICCION[r.tipo])} />
              <span className="cifra">{textoPeriodoCorto(r.fecha_inicio, r.fecha_fin)}</span>
              <span>
                {r.descripcion}
                {r.espacio ? ` · ${r.espacio}` : ' · Todo el campus'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
