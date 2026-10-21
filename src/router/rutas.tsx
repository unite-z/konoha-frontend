import { createBrowserRouter, Navigate } from 'react-router'
import LayoutOficina from '../layouts/LayoutOficina/LayoutOficina'
import CumplimientoCortePage from '../pages/reportes-indicadores/reportes/CumplimientoCortePage'
import DistribucionPersonalPage from '../pages/reportes-indicadores/reportes/DistribucionPersonalPage'
import AtencionesEspacioSectorPage from '../pages/reportes-indicadores/reportes/AtencionesEspacioSectorPage'
import ExtraccionReporteProveedorPage from '../pages/reportes-indicadores/asistencia-ia/ExtraccionReporteProveedorPage'

export const RUTAS = {
  cumplimientoCorte: '/reportes-indicadores/reportes/cumplimiento-corte', // RF-REP-002
  distribucionPersonal: '/reportes-indicadores/reportes/distribucion-personal', // RF-REP-004
  atencionesEspacioSector: '/reportes-indicadores/reportes/atenciones-espacio-sector', // RF-REP-006
  extraccionReportes: '/reportes-indicadores/asistencia-ia/extraccion-reportes', // RF-IA-001
} as const

export const router = createBrowserRouter([
  {
    element: <LayoutOficina />,
    children: [
      { path: '/', element: <Navigate to={RUTAS.cumplimientoCorte} replace /> },
      { path: RUTAS.cumplimientoCorte, element: <CumplimientoCortePage /> },
      { path: RUTAS.distribucionPersonal, element: <DistribucionPersonalPage /> },
      { path: RUTAS.atencionesEspacioSector, element: <AtencionesEspacioSectorPage /> },
      { path: RUTAS.extraccionReportes, element: <ExtraccionReporteProveedorPage /> },
    ],
  },
])
