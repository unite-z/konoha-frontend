import { createElement } from 'react'
import type { RouteObject } from 'react-router'
import { SEGMENTO_INCIDENCIAS } from './enlaces'
import IncidenciasPage from './IncidenciasPage'

export const rutasIncidencias: RouteObject[] = [
  {
    path: SEGMENTO_INCIDENCIAS,
    children: [{ index: true, element: createElement(IncidenciasPage) }],
  },
]
