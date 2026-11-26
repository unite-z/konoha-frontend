import type { RouteObject } from 'react-router'
import SectoresPage from './SectoresPage'
import { SEGMENTO_PLANIFICACION } from './enlaces'

export const rutasPlanificacion: RouteObject[] = [
  { path: SEGMENTO_PLANIFICACION, children: [{ index: true, Component: SectoresPage }] },
]
