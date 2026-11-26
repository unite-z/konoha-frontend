import type { RouteObject } from 'react-router'
import MapaPage from './MapaPage'
import { SEGMENTO_MAPA } from './enlaces'

export const rutasMapa: RouteObject[] = [{ path: SEGMENTO_MAPA, children: [{ index: true, Component: MapaPage }] }]
