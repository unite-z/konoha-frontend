import { createElement, lazy, Suspense } from 'react'
import type { RouteObject } from 'react-router'
import EstadoCarga from '@/design-system/EstadoCarga'
import { SEGMENTO_REPORTES } from './enlaces'

// La vista (y sus gráficos) se descarga solo al entrar en Reportes; el layout se monta sin esperarla.
const ReportesPage = lazy(() => import('./ReportesPage'))

export const rutasReportes: RouteObject[] = [
  {
    path: SEGMENTO_REPORTES,
    children: [
      {
        index: true,
        element: createElement(
          Suspense,
          { fallback: createElement(EstadoCarga, { forma: 'pagina' }) },
          createElement(ReportesPage),
        ),
      },
    ],
  },
]
