import type { ResumenArea } from '@/types/resumenArea'
import { formatearFecha } from '@/utils/formato'
import { prioridadLegible } from './formato'
import estilos from './PanelArea.module.css'

/**
 * «Nota» del área: datos calculados por el sistema (prioridad validada por una persona, incidencias abiertas y última
 * atención). No es un texto de IA y no se presenta como tal. Un dato que no llega (sin permiso o sin fuente) no se
 * muestra; las incidencias solo salen cuando el servidor las cuenta por `area_verde_id`.
 */
export default function NotaArea({ resumen }: { resumen: ResumenArea }) {
  const { prioridad_validada: prioridad, incidencias_abiertas: incidencias, ultima_atencion: atencion } = resumen
  const lineas = [
    prioridad && {
      etiqueta: 'Prioridad validada',
      valor: `${prioridadLegible(prioridad.prioridad)} · validada el ${formatearFecha(prioridad.fecha_validacion)}`,
    },
    incidencias !== null && {
      etiqueta: 'Incidencias abiertas',
      valor: incidencias === 0 ? 'Ninguna' : String(incidencias),
    },
    atencion && {
      etiqueta: 'Última atención',
      valor: [atencion.titulo, formatearFecha(atencion.fecha)].filter(Boolean).join(' · '),
    },
  ].filter((l): l is { etiqueta: string; valor: string } => Boolean(l))

  return (
    <section className={estilos.nota} aria-label="Nota del área">
      <h3 className={estilos.subtitulo}>Nota</h3>
      {lineas.length === 0 ? (
        <p className={estilos.secundario}>Aún no hay datos calculados para esta área.</p>
      ) : (
        <dl className={estilos.datos}>
          {lineas.map((l) => (
            <div key={l.etiqueta}>
              <dt className={estilos.secundario}>{l.etiqueta}</dt>
              <dd>{l.valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
