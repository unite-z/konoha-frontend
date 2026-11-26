import { createElement } from 'react'
import type { RouteObject } from 'react-router'
import EnConstruccion from '../base/EnConstruccion'
import { SEGMENTO_CAMPO } from './enlaces'

export const rutasCampo: RouteObject[] = [
  { path: SEGMENTO_CAMPO, children: [{ index: true, element: createElement(EnConstruccion, { seccion: 'Campo' }) }] },
]
