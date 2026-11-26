import { createElement } from 'react'
import type { RouteObject } from 'react-router'
import EnConstruccion from '../base/EnConstruccion'
import { SEGMENTO_INCIDENCIAS } from './enlaces'

export const rutasIncidencias: RouteObject[] = [
  {
    path: SEGMENTO_INCIDENCIAS,
    children: [{ index: true, element: createElement(EnConstruccion, { seccion: 'Incidencias' }) }],
  },
]
