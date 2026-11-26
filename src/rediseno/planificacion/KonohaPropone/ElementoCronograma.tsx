/** Piezas de cada sugerencia dentro de `RevisionIa`: lo que propone Konoha y el hueco de la decisión. */
import { useState } from 'react'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import { useConsulta } from '@/hooks/useConsulta'
import DialogoModificar from '@/pages/reportes-indicadores/asistencia-ia/cronograma/DialogoModificar'
import { obtenerCatalogoComparacion } from '@/services/api/reportesGestion'
import type { PropuestaCronograma, ValoresCronograma } from '@/types/cronogramaIa'
import type { AccionDecision } from '@/types/ia'
import {
  coincideConProhibicion,
  recursosDisponibles,
  textoCambios,
  textoPeriodoCorto,
  textoRecursos,
  valoresDePropuesta,
} from '@/utils/cronogramaIa'
import type { ContextoHueco } from '@/rediseno/base/RevisionIa/contrato'
import estilos from './KonohaPropone.module.css'
import { nombresCronograma, sinCambios } from './textoValores'

export function SugerenciaElemento({ propuesta }: { propuesta: PropuestaCronograma }) {
  return (
    <div className={estilos.sugerencia}>
      <p className="cifra">{textoPeriodoCorto(propuesta.fecha_inicio, propuesta.fecha_fin)}</p>
      <p>{textoRecursos(propuesta.recursos)}</p>
      <p className={estilos.motivo}>{propuesta.motivo}</p>
      {coincideConProhibicion(propuesta) && <Estado tono="error" texto="Bloqueada por una prohibición" punto />}
      {propuesta.coincidencias.map((c) => (
        <AvisoEnLinea key={`${c.tipo}-${c.descripcion}`} tono={c.tipo === 'Prohibicion' ? 'error' : 'advertencia'}>
          {c.tipo === 'Prohibicion' ? 'Coincide con una prohibición' : 'Coincide con una advertencia'}: {c.descripcion}{' '}
          ({textoPeriodoCorto(c.fecha_inicio, c.fecha_fin)})
        </AvisoEnLinea>
      ))}
    </div>
  )
}

interface HuecoProps {
  propuesta: PropuestaCronograma
  /** Todas las sugerencias: de ellas salen las cuadrillas y los proveedores que se pueden elegir. */
  propuestas: PropuestaCronograma[]
  contexto: ContextoHueco<ValoresCronograma>
}

/**
 * Debajo de la decisión: el estado con un cambio corto de color y opacidad, «Modificar» y el bloqueo (v6). Al elegir
 * «Corregir» sin cambios todavía, el diálogo de cambios se abre solo, como en la revisión actual.
 */
export function HuecoDecision({ propuesta, propuestas, contexto }: HuecoProps) {
  const { decision, cambiar } = contexto
  const bloqueada = coincideConProhibicion(propuesta) && decision.accion !== 'descartar'
  const [modificando, setModificando] = useState(false)
  const [accionVista, setAccionVista] = useState<AccionDecision | null>(null)
  if (decision.accion !== accionVista) {
    setAccionVista(decision.accion)
    if (decision.accion === 'corregir' && !bloqueada && sinCambios(propuesta, decision.valorFinal)) setModificando(true)
  }
  const catalogo = useConsulta(
    decision.accion === 'corregir' ? 'catalogo-comparacion' : null,
    obtenerCatalogoComparacion,
  )
  const espacios = (catalogo.datos?.espacios ?? []).map((e) => ({ id: e.id, nombre: e.nombre }))
  const recursos = recursosDisponibles(propuestas)
  const valores = decision.valorFinal
  const texto =
    decision.accion === 'descartar'
      ? 'Descartada: no se programa'
      : decision.accion === 'corregir'
        ? valores && !sinCambios(propuesta, valores)
          ? `Modificada: ${textoCambios(propuesta, valores, nombresCronograma(propuestas, espacios))}`
          : 'Aún no has indicado los cambios'
        : 'Aceptada: se programará'

  return (
    <div className={estilos.hueco}>
      {bloqueada && (
        <AvisoEnLinea tono="error" titulo="Sugerencia bloqueada por una prohibición">
          No se puede programar. Descártala para poder confirmar.
        </AvisoEnLinea>
      )}
      <p key={decision.accion} className={estilos.decision} data-accion={decision.accion} role="status">
        {texto}
      </p>
      {decision.accion === 'corregir' && !bloqueada && (
        <Boton variante="fantasma" compacto onClick={() => setModificando(true)}>
          Indicar los cambios
        </Boton>
      )}
      {modificando && (
        <DialogoModificar
          propuesta={propuesta}
          valoresIniciales={valores ?? valoresDePropuesta(propuesta)}
          espacios={espacios}
          cuadrillas={recursos.cuadrillas}
          proveedores={recursos.proveedores}
          onGuardar={(nuevos) => {
            cambiar({ valorFinal: nuevos })
            setModificando(false)
          }}
          onCerrar={() => setModificando(false)}
        />
      )}
    </div>
  )
}
