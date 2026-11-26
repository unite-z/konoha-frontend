import { createElement } from 'react'
import type { RouteObject } from 'react-router'
import EnConstruccion from '../base/EnConstruccion'
import { SEGMENTO_PLANIFICACION } from './enlaces'

export const rutasPlanificacion: RouteObject[] = [
  {
    path: SEGMENTO_PLANIFICACION,
    children: [{ index: true, element: createElement(EnConstruccion, { seccion: 'Planificación' }) }],
  },
]
