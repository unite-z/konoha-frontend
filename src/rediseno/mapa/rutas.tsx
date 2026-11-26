import type { RouteObject } from 'react-router'
import EnConstruccion from '../base/EnConstruccion'
import { SEGMENTO_MAPA } from './enlaces'

export const rutasMapa: RouteObject[] = [
  { path: SEGMENTO_MAPA, children: [{ index: true, element: <EnConstruccion seccion="Mapa" /> }] },
]
