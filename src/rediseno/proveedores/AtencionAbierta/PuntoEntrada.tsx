/**
 * Punto de entrada `?atencion_id=<id>` (RD-85): en la pestaña Atenciones lleva a la ficha de esa atención. Sin el
 * parámetro, o con uno que no es un número, deja pasar la bandeja.
 */
import type { ReactNode } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { rutaAtencion } from '../enlaces'

export const PARAM_ATENCION = 'atencion_id'

export default function PuntoEntradaAtencion({ children }: { children: ReactNode }) {
  const [consulta] = useSearchParams()
  const valor = consulta.get(PARAM_ATENCION)
  if (valor && /^\d{1,9}$/.test(valor)) return <Navigate to={rutaAtencion(Number(valor))} replace />
  return children
}
