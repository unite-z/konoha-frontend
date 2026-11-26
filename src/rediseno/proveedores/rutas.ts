import { createElement } from 'react'
import type { RouteObject } from 'react-router'
import EnConstruccion from '../base/EnConstruccion'
import ProveedoresPage from './ProveedoresPage'
import { SEGMENTO_ATENCIONES, SEGMENTO_PROVEEDORES } from './enlaces'

export const rutasProveedores: RouteObject[] = [
  {
    path: SEGMENTO_PROVEEDORES,
    children: [
      { index: true, element: createElement(ProveedoresPage) },
      // La ficha de la atención la construye RD-53; hasta entonces, «En construcción».
      {
        path: `${SEGMENTO_ATENCIONES}/:id`,
        element: createElement(EnConstruccion, { seccion: 'Atención' }),
      },
    ],
  },
]
