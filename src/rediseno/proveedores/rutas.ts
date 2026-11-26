import { createElement } from 'react'
import type { RouteObject } from 'react-router'
import EnConstruccion from '../base/EnConstruccion'
import AtencionAbiertaPage from './AtencionAbierta/AtencionAbiertaPage'
import PuntoEntradaAtencion from './AtencionAbierta/PuntoEntrada'
import ProveedoresPage from './ProveedoresPage'
import AtencionesPage from './Atenciones/AtencionesPage'
import { SEGMENTO_ATENCIONES, SEGMENTO_INFORMES, SEGMENTO_PROVEEDORES, SEGMENTO_SUBIR_INFORME } from './enlaces'

export const rutasProveedores: RouteObject[] = [
  {
    path: SEGMENTO_PROVEEDORES,
    children: [
      { index: true, element: createElement(ProveedoresPage) },
      {
        path: SEGMENTO_ATENCIONES,
        element: createElement(PuntoEntradaAtencion, null, createElement(AtencionesPage)),
      },
      { path: `${SEGMENTO_ATENCIONES}/:id`, element: createElement(AtencionAbiertaPage) },
      // Subir informe lo construye RD-56; hasta entonces, «En construcción».
      {
        path: `${SEGMENTO_INFORMES}/${SEGMENTO_SUBIR_INFORME}`,
        element: createElement(EnConstruccion, { seccion: 'Subir informe' }),
      },
    ],
  },
]
