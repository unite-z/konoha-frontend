/**
 * Rutas de la aplicación web de oficina. Todas dentro de `LayoutOficina`.
 * Las de MOD-05 y MOD-03 pasan por `RutaSesionTercerizados` (sesión con usuario Spring Security).
 * Las rutas con nombre y las migas están en `rutasApp.ts`.
 */
import { createBrowserRouter, Navigate } from 'react-router'
import LayoutOficina from '../layouts/LayoutOficina/LayoutOficina'
import PaginaNoEncontrada from '../pages/PaginaNoEncontrada'
import AsistenciaIaIndexPage from '../pages/reportes-indicadores/asistencia-ia/AsistenciaIaIndexPage'
import ExtraccionReporteProveedorPage from '../pages/reportes-indicadores/asistencia-ia/ExtraccionReporteProveedorPage'
import RevisionExtraccionPage from '../pages/reportes-indicadores/asistencia-ia/RevisionExtraccionPage'
import AtencionesEspacioSectorPage from '../pages/reportes-indicadores/reportes/AtencionesEspacioSectorPage'
import CumplimientoCortePage from '../pages/reportes-indicadores/reportes/CumplimientoCortePage'
import DistribucionPersonalPage from '../pages/reportes-indicadores/reportes/DistribucionPersonalPage'
import ReportesIndexPage from '../pages/reportes-indicadores/reportes/ReportesIndexPage'
import AtencionDetallePage from '../pages/servicios-tercerizados/AtencionDetallePage'
import AtencionesPage from '../pages/servicios-tercerizados/AtencionesPage'
import IngresoTercerizadosPage from '../pages/servicios-tercerizados/IngresoTercerizadosPage'
import NuevaAtencionPage from '../pages/servicios-tercerizados/nueva/NuevaAtencionPage'
import CalendarioRestriccionesPage from '../pages/planificacion/CalendarioRestriccionesPage'
import ServiciosPeriodicosPage from '../pages/planificacion/ServiciosPeriodicosPage'
import RutaSesionTercerizados from '../sesion/RutaSesionTercerizados'
import { PREFIJO_PLANIFICACION, PREFIJO_TERCERIZADOS, RUTAS, RUTAS_PLANIFICACION, RUTAS_TERCERIZADOS } from './rutasApp'

import RutaSesionCampo from '../sesion/RutaSesionCampo'
import IngresoCampoPage from '../pages/operacion-campo/IngresoCampoPage'
import CuadrillasPage from '../pages/operacion-campo/CuadrillasPage'
import EncargosPage from '../pages/operacion-campo/EncargosPage'
import ParticipantesPage from '../pages/operacion-campo/ParticipantesPage'
import { BASE_CAMPO, RUTAS_CAMPO } from './rutasCampo'

export const router = createBrowserRouter([
  {
    element: <LayoutOficina />,
    children: [
      { path: RUTAS_CAMPO.ingreso, element: <IngresoCampoPage /> },
      { path: BASE_CAMPO, element: <RutaSesionCampo />, children: [
        {index:true,element:<Navigate to={RUTAS_CAMPO.cuadrillas} replace/>},
        {path:RUTAS_CAMPO.cuadrillas,element:<CuadrillasPage/>},
        {path:RUTAS_CAMPO.encargos,element:<EncargosPage/>},
        {path:RUTAS_CAMPO.participantes,element:<ParticipantesPage/>},
      ]},
      { path: '/', element: <Navigate to={RUTAS.reportes} replace /> },
      { path: RUTAS.reportes, element: <ReportesIndexPage /> },
      { path: RUTAS.cumplimientoCorte, element: <CumplimientoCortePage /> }, // RF-REP-002
      { path: RUTAS.distribucionPersonal, element: <DistribucionPersonalPage /> }, // RF-REP-004
      { path: RUTAS.atencionesEspacioSector, element: <AtencionesEspacioSectorPage /> }, // RF-REP-006
      { path: RUTAS.asistenciaIa, element: <AsistenciaIaIndexPage /> },
      { path: RUTAS.extraccionReportes, element: <ExtraccionReporteProveedorPage /> }, // RF-IA-001
      { path: `${RUTAS.extraccionReportes}/:id`, element: <RevisionExtraccionPage /> }, // RF-IA-001
      // MOD-05 «Servicios tercerizados»: requiere sesión con usuario Spring Security (excepto el ingreso).
      { path: RUTAS_TERCERIZADOS.ingreso, element: <IngresoTercerizadosPage /> },
      {
        path: PREFIJO_TERCERIZADOS,
        element: <RutaSesionTercerizados />,
        children: [
          { index: true, element: <Navigate to={RUTAS_TERCERIZADOS.atenciones} replace /> },
          { path: RUTAS_TERCERIZADOS.atenciones, element: <AtencionesPage /> }, // RF-SER-003 a 006 y 011
          { path: RUTAS_TERCERIZADOS.nuevaAtencion, element: <NuevaAtencionPage /> }, // RF-SER-003 y 011
          { path: `${RUTAS_TERCERIZADOS.atenciones}/:id`, element: <AtencionDetallePage /> },
        ],
      },
      // MOD-03 «Planificación»: misma sesión que MOD-05.
      {
        path: PREFIJO_PLANIFICACION,
        element: <RutaSesionTercerizados />,
        children: [
          { index: true, element: <Navigate to={RUTAS_PLANIFICACION.servicios} replace /> },
          { path: RUTAS_PLANIFICACION.servicios, element: <ServiciosPeriodicosPage /> }, // HU-MOD03-001 y 002
          { path: RUTAS_PLANIFICACION.restricciones, element: <CalendarioRestriccionesPage /> }, // HU-MOD03-003
        ],
      },
      { path: '*', element: <PaginaNoEncontrada /> },
    ],
  },
])
