/** `RevisionIa` con el adaptador de la extracción (RD-56): la propuesta de un informe, con filtros de datos. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PERMISO_VALIDAR_IA } from '@/config/permisos'
import { tiene } from '@/config/permisosSesion'
import type { FiltroCampos } from '@/pages/reportes-indicadores/asistencia-ia/extraccion/valoresCampo'
import RevisionIa from '@/rediseno/base/RevisionIa/RevisionIa'
import { usePermisos } from '@/sesion/ContextoSesion'
import { crearAdaptadorExtraccion, type MemoriaExtraccion } from './adaptadorExtraccion'
import estilos from './SubirInforme.module.css'

export interface RevisionExtraccionProps {
  id: number
  /** La propuesta se validó o se rechazó. */
  onCambio?: () => void
}

const SIN_DECIDIR: ReadonlySet<string> = new Set()

export default function RevisionExtraccion({ id, onCambio }: RevisionExtraccionProps) {
  const puedeValidar = tiene(usePermisos(), PERMISO_VALIDAR_IA)
  const [filtro, setFiltro] = useState<FiltroCampos>('todos')
  const [decididos, setDecididos] = useState<ReadonlySet<string>>(SIN_DECIDIR)
  const [memoria] = useState<MemoriaExtraccion>({ sugerencia: null })
  // La llamada más reciente, sin rehacer el adaptador (y con él la consulta) en cada render.
  const [recientes] = useState({ onCambio })
  useEffect(() => {
    Object.assign(recientes, { onCambio })
  })
  const onDecidido = useCallback(
    (clave: string) => setDecididos((previo) => (previo.has(clave) ? previo : new Set(previo).add(clave))),
    [],
  )
  // Solo «Pendientes» depende de qué datos están decididos: con otro filtro la consulta no se repite al decidir.
  const vistos = filtro === 'pendientes' ? decididos : SIN_DECIDIR
  const adaptador = useMemo(
    () =>
      crearAdaptadorExtraccion({
        id,
        filtro,
        onFiltro: setFiltro,
        decididos: vistos,
        onDecidido,
        puedeValidar,
        memoria,
        alCambio: () => recientes.onCambio?.(),
      }),
    [id, filtro, vistos, onDecidido, puedeValidar, memoria, recientes],
  )
  return (
    <div className={estilos.cascada}>
      <RevisionIa adaptador={adaptador} />
    </div>
  )
}
