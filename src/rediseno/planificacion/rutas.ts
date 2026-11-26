import { createElement } from 'react'
import type { RouteObject } from 'react-router'
import EnConstruccion from '../base/EnConstruccion'
import CiclosPage from './Ciclos/CiclosPage'
import CuadrillasPage from './Cuadrillas/CuadrillasPage'
import SectoresPage from './SectoresPage'
import { SEGMENTO_CICLOS, SEGMENTO_CUADRILLAS, SEGMENTO_PLANIFICACION, SEGMENTO_REGLAS } from './enlaces'

/** Reglas queda «En construcción» hasta su ticket (RD-40). */
export const rutasPlanificacion: RouteObject[] = [
  {
    path: SEGMENTO_PLANIFICACION,
    children: [
      { index: true, Component: SectoresPage },
      { path: SEGMENTO_CICLOS, Component: CiclosPage },
      { path: SEGMENTO_CUADRILLAS, Component: CuadrillasPage },
      { path: SEGMENTO_REGLAS, element: createElement(EnConstruccion, { seccion: 'Reglas del ciclo' }) },
    ],
  },
]
