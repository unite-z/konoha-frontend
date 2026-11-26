import type { RouteObject } from 'react-router'
import EnConstruccion from '../base/EnConstruccion'
import { SEGMENTO_REPORTES } from './enlaces'

export const rutasReportes: RouteObject[] = [
  { path: SEGMENTO_REPORTES, children: [{ index: true, element: <EnConstruccion seccion="Reportes" /> }] },
]
