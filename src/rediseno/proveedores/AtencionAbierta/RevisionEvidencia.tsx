/** `RevisionIa` con el adaptador de la evidencia (RD-55): el análisis que se revisa dentro del bloque de la ficha. */
import { useEffect, useMemo, useState } from 'react'
import RevisionIa from '@/rediseno/base/RevisionIa/RevisionIa'
import { crearAdaptadorEvidencia } from './adaptadorEvidencia'
import type { AccionesEvidencia } from './ResumenEvidencia'

export interface RevisionEvidenciaProps {
  id: number
  acciones: AccionesEvidencia
  /** El análisis se validó o se descartó: el bloque vuelve a leer el último. */
  onCambio: () => void
}

export default function RevisionEvidencia({ id, acciones, onCambio }: RevisionEvidenciaProps) {
  // Las llamadas más recientes, sin rehacer el adaptador (y con él la consulta) en cada render.
  const [recientes] = useState({ acciones, onCambio })
  useEffect(() => {
    Object.assign(recientes, { acciones, onCambio })
  })
  const adaptador = useMemo(
    () =>
      crearAdaptadorEvidencia({
        id,
        acciones: {
          get puedeSolicitar() {
            return recientes.acciones.puedeSolicitar
          },
          get puedeValidar() {
            return recientes.acciones.puedeValidar
          },
          nuevasFotos: (analisis) => recientes.acciones.nuevasFotos(analisis),
          registrarManual: (analisis) => recientes.acciones.registrarManual(analisis),
        },
        alCambio: () => recientes.onCambio(),
      }),
    [id, recientes],
  )
  return <RevisionIa adaptador={adaptador} />
}
