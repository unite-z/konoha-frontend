/**
 * Puntos de entrada de `/proveedores/fitosanitario` (RD-55): `?atencion_id=<id>` lleva a la ficha de esa atención con
 * la revisión de su evidencia abierta y `?ejemplar_id=<id>` abre el análisis de ese ejemplar. Sin ninguno, deja pasar
 * la vista de control fitosanitario (RD-57).
 */
import type { ReactNode } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { PARAM_ATENCION, PARAM_EJEMPLAR, rutaEvidenciaAtencion } from '../enlaces'
import EvidenciaEjemplarPage from './EvidenciaEjemplarPage'

const ENTERO = /^\d{1,9}$/

export default function PuntoEntradaEvidencia({ children }: { children: ReactNode }) {
  const [consulta] = useSearchParams()
  const atencion = consulta.get(PARAM_ATENCION)
  const ejemplar = consulta.get(PARAM_EJEMPLAR)
  if (atencion && ENTERO.test(atencion)) return <Navigate to={rutaEvidenciaAtencion(Number(atencion))} replace />
  if (ejemplar && ENTERO.test(ejemplar)) return <EvidenciaEjemplarPage ejemplarId={Number(ejemplar)} />
  return children
}
