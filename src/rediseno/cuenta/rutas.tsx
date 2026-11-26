import type { RouteObject } from 'react-router'
import EnConstruccion from '../base/EnConstruccion'
import { SEGMENTO_CUENTA } from './enlaces'

export const rutasCuenta: RouteObject[] = [
  { path: SEGMENTO_CUENTA, children: [{ index: true, element: <EnConstruccion seccion="Cuenta" /> }] },
]
