import type { RouteObject } from 'react-router'
import EnConstruccion from '../base/EnConstruccion'
import { SEGMENTO_PROVEEDORES } from './enlaces'

export const rutasProveedores: RouteObject[] = [
  { path: SEGMENTO_PROVEEDORES, children: [{ index: true, element: <EnConstruccion seccion="Proveedores" /> }] },
]
