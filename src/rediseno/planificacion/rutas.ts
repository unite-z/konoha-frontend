import { createElement } from 'react'
import type { RouteObject } from 'react-router'
import EnConstruccion from '../base/EnConstruccion'
import CuadrillasPage from './Cuadrillas/CuadrillasPage'
import SectoresPage from './SectoresPage'
import { SEGMENTO_CICLOS, SEGMENTO_CUADRILLAS, SEGMENTO_PLANIFICACION, SEGMENTO_REGLAS } from './enlaces'

/** Ciclos y Reglas quedan «En construcción» hasta sus tickets (RD-29 y RD-40). */
export const rutasPlanificacion: RouteObject[] = [
  {
    path: SEGMENTO_PLANIFICACION,
    children: [
      { index: true, Component: SectoresPage },
      { path: SEGMENTO_CICLOS, element: createElement(EnConstruccion, { seccion: 'Ciclos' }) },
      { path: SEGMENTO_CUADRILLAS, Component: CuadrillasPage },
      { path: SEGMENTO_REGLAS, element: createElement(EnConstruccion, { seccion: 'Reglas del ciclo' }) },
    ],
  },
]
