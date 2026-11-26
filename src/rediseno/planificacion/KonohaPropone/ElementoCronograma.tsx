/** Piezas de cada sugerencia dentro de `RevisionIa`: lo que propone Konoha y el hueco de la decisión. */
import { useState } from 'react'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import { useConsulta } from '@/hooks/useConsulta'
import DialogoModificar from '@/pages/reportes-indicadores/asistencia-ia/cronograma/DialogoModificar'
import { obtenerCatalogoComparacion } from '@/services/api/reportesGestion'
import type { PropuestaCronograma, ValoresCronograma } from '@/types/cronogramaIa'
import {
  coincideConProhibicion,
  textoPeriodoCorto,
  textoRecursos,
  valoresDePropuesta,
  type RecursoOpcion,
} from '@/utils/cronogramaIa'
import type { ContextoHueco } from '@/rediseno/base/RevisionIa/contrato'
import estilos from './KonohaPropone.module.css'
import { textoValores } from './textoValores'

export function SugerenciaElemento({ propuesta }: { propuesta: PropuestaCronograma }) {
  return (
    <div className={estilos.sugerencia}>
      <p className="cifra">{textoPeriodoCorto(propuesta.fecha_inicio, propuesta.fecha_fin)}</p>
      <p>{textoRecursos(propuesta.recursos)}</p>
      <p className={estilos.motivo}>{propuesta.motivo}</p>
      {coincideConProhibicion(propuesta) && <Estado tono="error" texto="Bloqueada por una prohibición" punto />}
      {propuesta.coincidencias.map((c) => (
        <AvisoEnLinea key={`${c.tipo}-${c.descripcion}`} tono={c.tipo === 'Prohibicion' ? 'error' : 'advertencia'}>
          {c.tipo === 'Prohibicion' ? 'Coincide con una prohibición' : 'Coincide con una advertencia'}: {c.descripcion} (
          {textoPeriodoCorto(c.fecha_inicio, c.fecha_fin)})
        </AvisoEnLinea>
      ))}
    </div>
  )
}

interface HuecoProps {
  propuesta: PropuestaCronograma
  contexto: ContextoHueco<ValoresCronograma>
  recursos: { cuadrillas: RecursoOpcion[]; proveedores: RecursoOpcion[] }
}

/** Debajo de la decisión: el estado con un cambio corto de color y opacidad, «Modificar» y el bloqueo (v6). */
export function HuecoDecision({ propuesta, contexto, recursos }: HuecoProps) {
  const { decision, cambiar } = contexto
  const [modificando, setModificando] = useState(false)
  const catalogo = useConsulta(modificando ? 'catalogo-comparacion' : null, obtenerCatalogoComparacion)
  const espacios = (catalogo.datos?.espacios ?? []).map((e) => ({ id: e.id, nombre: e.nombre }))
  const bloqueada = coincideConProhibicion(propuesta) && decision.accion !== 'descartar'
  const texto =
    decision.accion === 'descartar'
      ? 'Descartada: no se programa'
      : decision.accion === 'corregir' && decision.valorFinal
        ? `Modificada: ${textoValores(decision.valorFinal)}`
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
      {decision.accion === 'corregir' && (
        <Boton variante="fantasma" compacto onClick={() => setModificando(true)}>
          Indicar los cambios
        </Boton>
      )}
      {modificando && (
        <DialogoModificar
          propuesta={propuesta}
          valoresIniciales={decision.valorFinal ?? valoresDePropuesta(propuesta)}
          espacios={espacios}
          cuadrillas={recursos.cuadrillas}
          proveedores={recursos.proveedores}
          onGuardar={(valores) => {
            cambiar({ valorFinal: valores })
            setModificando(false)
          }}
          onCerrar={() => setModificando(false)}
        />
      )}
    </div>
  )
}
