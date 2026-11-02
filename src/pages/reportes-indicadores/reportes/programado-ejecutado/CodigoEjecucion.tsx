/** Código de una ejecución vinculada (RF-REP-010): la atención enlaza a su ficha de MOD-05. */
import { Link } from 'react-router'
import { rutaDetalleAtencion } from '../../../../router/rutasApp'
import type { EjecucionVinculada } from '../../../../types/reportesGestion'

export default function CodigoEjecucion({ ejecucion }: { ejecucion: EjecucionVinculada }) {
  if (ejecucion.origen === 'Atencion') return <Link to={rutaDetalleAtencion(ejecucion.id)}>{ejecucion.codigo}</Link>
  // TODO: enlazar la actividad cuando Operación de campo (MOD-04) tenga su ficha de actividad.
  return <span>{ejecucion.codigo}</span>
}
