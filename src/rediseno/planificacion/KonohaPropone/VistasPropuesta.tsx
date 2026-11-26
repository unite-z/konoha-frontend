/**
 * Resumen de la propuesta dentro de `RevisionIa`: la marca de que no es una programación confirmada, los criterios y
 * las restricciones consideradas, el recuento al confirmarla y las vistas Calendario y Lista por semanas con las
 * piezas actuales (en móvil, solo la lista).
 */
import { useState } from 'react'
import { useEsMovil } from '@/components/reportes-indicadores/useEsMovil'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import { BotonEnlace } from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import EstadoVacio from '@/design-system/EstadoVacio'
import Pestanas from '@/design-system/Pestanas'
import { PERMISO_VALIDAR_IA } from '@/config/permisos'
import { tiene } from '@/config/permisosSesion'
import { useConsulta } from '@/hooks/useConsulta'
import FichaPropuesta from '@/pages/reportes-indicadores/asistencia-ia/cronograma/FichaPropuesta'
import ListaPorSemana from '@/pages/reportes-indicadores/asistencia-ia/cronograma/ListaPorSemana'
import RestriccionesConsideradas from '@/pages/reportes-indicadores/asistencia-ia/cronograma/RestriccionesConsideradas'
import VistaCalendario from '@/pages/reportes-indicadores/asistencia-ia/cronograma/VistaCalendario'
import { listarProgramacionExistente, programacionExistenteDisponible } from '@/services/api/cronogramaIa'
import { obtenerCatalogoComparacion } from '@/services/api/reportesGestion'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { PropuestaCronograma, SugerenciaCronograma } from '@/types/cronogramaIa'
import { textoCambios, textoPeriodoCorto } from '@/utils/cronogramaIa'
import { formatearNumero } from '@/utils/formato'
import { rutaPlanificacionProgramar } from '@/rediseno/planificacion/enlaces'
import estilos from './KonohaPropone.module.css'
import { nombresCronograma } from './textoValores'

const noHacerNada = () => undefined

export default function VistasPropuesta({ sugerencia }: { sugerencia: SugerenciaCronograma }) {
  const esMovil = useEsMovil()
  const puedeConfirmar = tiene(usePermisos(), PERMISO_VALIDAR_IA)
  const [vista, setVista] = useState('calendario')
  const [elegida, setElegida] = useState<string | null>(null)
  const { entrada, propuestas, restricciones, criterios, decision } = sugerencia.contenido
  const existentes = useConsulta(`rd-propuesta-existentes|${entrada.desde}|${entrada.hasta}`, (signal) =>
    listarProgramacionExistente(entrada.desde, entrada.hasta, signal),
  )
  const hayModificadas = Object.values(decision?.por_propuesta ?? {}).some((d) => d.accion === 'corregir')
  const catalogo = useConsulta(hayModificadas ? 'catalogo-comparacion' : null, obtenerCatalogoComparacion)
  const nombres = nombresCronograma(
    propuestas,
    (catalogo.datos?.espacios ?? []).map((e) => ({ id: e.id, nombre: e.nombre })),
  )
  const enPropuesta = sugerencia.estado === 'Propuesta'
  const decisiones = Object.fromEntries(
    Object.entries(decision?.por_propuesta ?? {}).map(([clave, d]) => [
      clave,
      { accion: d.accion, valores: d.valores_finales },
    ]),
  )
  const ficha = (p: PropuestaCronograma) => (
    <FichaPropuesta
      key={p.clave}
      propuesta={p}
      modo={enPropuesta ? 'consulta' : 'final'}
      final={decision?.por_propuesta[p.clave]}
      textoCambios={(valores) => textoCambios(p, valores, nombres)}
      onAccion={noHacerNada}
      onModificar={noHacerNada}
      onConfirma={noHacerNada}
    />
  )
  const lista = <ListaPorSemana propuestas={propuestas} renderFicha={ficha} />

  return (
    <div className={estilos.vistas}>
      {enPropuesta && <Estado tono="aviso" texto="Propuesta: no es una programación confirmada" />}
      <p className={`${estilos.periodo} cifra`}>
        {propuestas.length} sugerencias para {textoPeriodoCorto(entrada.desde, entrada.hasta)}
      </p>
      {sugerencia.estado === 'Validada' && decision && (
        <AvisoEnLinea tono="exito" titulo="Planificación confirmada">
          {formatearNumero(decision.resumen.aceptados)} aceptadas, {formatearNumero(decision.resumen.corregidos)}{' '}
          modificadas y {formatearNumero(decision.resumen.descartados)} descartadas. Programaciones creadas:{' '}
          {formatearNumero(decision.programaciones_creadas.length)}.
        </AvisoEnLinea>
      )}
      {enPropuesta && !puedeConfirmar && (
        <AvisoEnLinea tono="info">Solo la jefatura de sección puede confirmar o descartar esta propuesta.</AvisoEnLinea>
      )}
      <details className={estilos.criterios}>
        <summary>Criterios y restricciones consideradas</summary>
        {criterios.length > 0 && (
          <ul>
            {criterios.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
        <RestriccionesConsideradas restricciones={restricciones} />
      </details>
      {propuestas.length === 0 ? (
        <EstadoVacio
          nivel={3}
          titulo="No hay actividades pendientes en el periodo"
          descripcion="Puedes planificar de forma manual."
          accion={
            <BotonEnlace to={rutaPlanificacionProgramar()} variante="secundario">
              Planificar de forma manual
            </BotonEnlace>
          }
        />
      ) : esMovil ? (
        lista
      ) : (
        <Pestanas
          etiqueta="Vista de la propuesta"
          valor={vista}
          onCambiar={setVista}
          pestanas={[
            { valor: 'calendario', texto: 'Calendario' },
            { valor: 'lista', texto: 'Lista' },
          ]}
        >
          {vista === 'calendario' ? (
            <VistaCalendario
              desde={entrada.desde}
              hasta={entrada.hasta}
              propuestas={propuestas}
              existentes={existentes.datos ?? []}
              existentesDisponibles={programacionExistenteDisponible() && existentes.estado !== 'error'}
              restricciones={restricciones}
              decisiones={decisiones}
              elegida={elegida}
              onElegir={setElegida}
              renderFicha={ficha}
            />
          ) : (
            lista
          )}
        </Pestanas>
      )}
    </div>
  )
}
