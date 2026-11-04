/**
 * Cabecera de la revisión del cronograma (RF-IA-003): estado, la marca de que es una propuesta y no una programación
 * confirmada (criterio 2), el periodo, el contexto de la IA (A3), los criterios y las restricciones (criterio 5), y los
 * avisos de estado: confirmada (con las programaciones creadas, criterio 7), descartada o sin permiso para decidir.
 */
import BloqueContextoIA from '@/components/reportes-indicadores/BloqueContextoIA'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import { BotonEnlace } from '@/components/ui/Boton'
import { RUTAS_PLANIFICACION } from '@/router/rutasApp'
import type { SugerenciaCronograma } from '@/types/cronogramaIa'
import { textoPeriodoCorto } from '@/utils/cronogramaIa'
import { insigniaSugerencia } from '@/utils/estados'
import { formatearFechaHora, formatearNumero } from '@/utils/formato'
import estilos from './Cronograma.module.css'
import RestriccionesConsideradas from './RestriccionesConsideradas'
import Estado from '@/components/ui/Estado'
import { insigniaAEstado } from '@/components/ui/tonos'

export default function CabeceraCronograma({ propuesta, puedeConfirmar }: { propuesta: SugerenciaCronograma; puedeConfirmar: boolean }) {
  const { contenido } = propuesta
  const decision = contenido.decision
  return (
    <>
      <section className={`${estilos.panel} ${estilos.cabecera}`} aria-label="Identificación de la propuesta">
        <div className={estilos.lineaTitulo}>
          <Estado {...insigniaAEstado(insigniaSugerencia(propuesta.estado, propuesta.etiqueta_estado))} />
          {propuesta.estado === 'Propuesta' && <Estado tono="aviso" texto="Propuesta: no es una programación confirmada" />}
        </div>
        <p className="cifra">
          Periodo: {textoPeriodoCorto(contenido.entrada.desde, contenido.entrada.hasta)} · {formatearNumero(contenido.propuestas.length)}{' '}
          propuestas
        </p>
        <p className={estilos.secundario}>
          Generada el {formatearFechaHora(propuesta.fecha_creacion)} · {contenido.ia.proveedor} · {contenido.ia.modelo}
        </p>
      </section>

      <BloqueContextoIA contexto={contenido} tituloFaltantes="Faltan datos para una propuesta completa" />
      <section className={estilos.panel} aria-labelledby="titulo-criterios">
        <h2 id="titulo-criterios" className={estilos.tituloPanel}>
          Criterios de la propuesta
        </h2>
        <ul className={estilos.criterios}>
          {contenido.criterios.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
      <RestriccionesConsideradas restricciones={contenido.restricciones} />

      {propuesta.estado === 'Validada' && (
        <AvisoEnLinea tono="exito" titulo={`Planificación confirmada el ${formatearFechaHora(propuesta.fecha_validacion)}`}>
          <p>
            {decision?.resumen.aceptados ?? 0} aceptadas, {decision?.resumen.corregidos ?? 0} modificadas y {decision?.resumen.descartados ?? 0}{' '}
            descartadas. Programaciones creadas: {formatearNumero(decision?.programaciones_creadas.length ?? 0)}.
          </p>
          <BotonEnlace to={RUTAS_PLANIFICACION.resumen} variante="fantasma">
            Ver en Planificación
          </BotonEnlace>
        </AvisoEnLinea>
      )}
      {propuesta.estado === 'Rechazada' && (
        <AvisoEnLinea tono="info" titulo={`Propuesta descartada el ${formatearFechaHora(propuesta.fecha_validacion)}`}>
          {decision?.motivo_rechazo ? `Motivo: ${decision.motivo_rechazo}` : undefined}
        </AvisoEnLinea>
      )}
      {propuesta.estado === 'Propuesta' && !puedeConfirmar && (
        <AvisoEnLinea tono="info">Solo la jefatura de sección puede confirmar o descartar esta propuesta</AvisoEnLinea>
      )}
    </>
  )
}
