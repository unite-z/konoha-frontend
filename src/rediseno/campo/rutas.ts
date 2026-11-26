import { createElement } from 'react'
import { Navigate, type RouteObject } from 'react-router'
import EnConstruccion from '../base/EnConstruccion'
import Mas from './Mas'
import RutaDeHoyPage from './RutaDeHoyPage'
import Semana from './Semana'
import {
  rutaCampoRutaDeHoy,
  SEGMENTO_CAMPO,
  SEGMENTO_ENCARGOS,
  SEGMENTO_INCIDENCIAS,
  SEGMENTO_MAS,
  SEGMENTO_RUTA_DE_HOY,
  SEGMENTO_SEMANA,
} from './enlaces'

/** Encargos e Incidencias quedan «En construcción» hasta sus tickets (RD-71 y RD-70). */
export const rutasCampo: RouteObject[] = [
  {
    path: SEGMENTO_CAMPO,
    children: [
      {
        index: true,
        element: createElement(Navigate, {
          to: rutaCampoRutaDeHoy(),
          replace: true,
        }),
      },
      { path: SEGMENTO_RUTA_DE_HOY, Component: RutaDeHoyPage },
      { path: SEGMENTO_SEMANA, Component: Semana },
      {
        path: SEGMENTO_ENCARGOS,
        element: createElement(EnConstruccion, { seccion: 'Encargos' }),
      },
      {
        path: SEGMENTO_INCIDENCIAS,
        element: createElement(EnConstruccion, { seccion: 'Incidencias' }),
      },
      { path: SEGMENTO_MAS, Component: Mas },
    ],
  },
]
