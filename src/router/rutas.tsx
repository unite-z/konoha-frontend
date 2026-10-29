/**
 * Rutas de la aplicación web de oficina.
 * - Sin sesión de MOD-01 solo se ve el ingreso (RF-T-001). El resto pasa por `RutaProtegida`.
 * - Las secciones con permiso propio pasan además por `RutaConPermiso` (RF-T-004): con enlace directo y
 *   sin permiso se ve el aviso, y la API responde 403 de todos modos.
 * - MOD-05 y MOD-03 también entran con la sesión de MOD-01 (AV-234): ya no tienen ingreso propio.
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
import NuevaAtencionPage from '../pages/servicios-tercerizados/nueva/NuevaAtencionPage'
import CalendarioRestriccionesPage from '../pages/planificacion/CalendarioRestriccionesPage'
import ServiciosPeriodicosPage from '../pages/planificacion/ServiciosPeriodicosPage'
import AtencionEspecialPage from '../pages/servicios-tercerizados/maestros/AtencionEspecialPage'
import ContratoNuevoPage from '../pages/servicios-tercerizados/maestros/ContratoNuevoPage'
import MarcarEjemplarPage from '../pages/servicios-tercerizados/maestros/MarcarEjemplarPage'
import ProveedorNuevoPage from '../pages/servicios-tercerizados/maestros/ProveedorNuevoPage'
import ProveedoresContratosPage from '../pages/servicios-tercerizados/maestros/ProveedoresContratosPage'
import RutaProtegida, { InicioRol, RutaConPermiso } from '../sesion/RutaProtegida'
import CambioContrasenaPage from '../pages/acceso/CambioContrasenaPage'
import IngresoPage from '../pages/acceso/IngresoPage'
import RepositorioPage from '../pages/repositorio/RepositorioPage'
import AccesosPage from '../pages/usuarios-roles/AccesosPage'
import UsuarioDetallePage from '../pages/usuarios-roles/UsuarioDetallePage'
import UsuariosPage from '../pages/usuarios-roles/UsuariosPage'
import { PERMISOS } from '../config/permisosCore'
import { PREFIJO_PLANIFICACION, PREFIJO_TERCERIZADOS, RUTAS, RUTAS_CORE, RUTAS_PLANIFICACION, RUTAS_TERCERIZADOS } from './rutasApp'

export const router = createBrowserRouter([
  { path: RUTAS_CORE.ingreso, element: <IngresoPage /> }, // RF-T-001
  {
    element: <RutaProtegida permitirContrasenaTemporal />,
    children: [{ path: RUTAS_CORE.cambiarContrasena, element: <CambioContrasenaPage /> }], // HU-MOD01-003
  },
  {
    element: <RutaProtegida />,
    children: [
      {
        element: <LayoutOficina />,
        children: [
          { path: '/', element: <InicioRol /> },
          {
            element: <RutaConPermiso permiso={PERMISOS.consultarIndicadores} />,
            children: [
              { path: RUTAS.reportes, element: <ReportesIndexPage /> },
              { path: RUTAS.cumplimientoCorte, element: <CumplimientoCortePage /> }, // RF-REP-002
              { path: RUTAS.distribucionPersonal, element: <DistribucionPersonalPage /> }, // RF-REP-004
              { path: RUTAS.atencionesEspacioSector, element: <AtencionesEspacioSectorPage /> }, // RF-REP-006
              { path: RUTAS.asistenciaIa, element: <AsistenciaIaIndexPage /> },
              { path: RUTAS.extraccionReportes, element: <ExtraccionReporteProveedorPage /> }, // RF-IA-001
              { path: `${RUTAS.extraccionReportes}/:id`, element: <RevisionExtraccionPage /> }, // RF-IA-001
            ],
          },
          // MOD-01 «Usuarios y roles»: solo el jefe de sección (RF-T-002 a RF-T-004).
          {
            element: <RutaConPermiso permiso={PERMISOS.gestionarUsuarios} />,
            children: [
              { path: RUTAS_CORE.usuarios, element: <UsuariosPage /> },
              { path: `${RUTAS_CORE.usuarios}/:id`, element: <UsuarioDetallePage /> },
              { path: RUTAS_CORE.accesos, element: <AccesosPage /> },
            ],
          },
          {
            element: <RutaConPermiso permiso={PERMISOS.consultarRepositorio} />,
            children: [{ path: RUTAS_CORE.repositorio, element: <RepositorioPage /> }], // RF-T-010
          },
          // MOD-05 «Servicios tercerizados». El antiguo ingreso propio lleva al inicio.
          { path: `${PREFIJO_TERCERIZADOS}/ingreso`, element: <Navigate to="/" replace /> },
          {
            path: PREFIJO_TERCERIZADOS,
            element: <RutaConPermiso permiso={PERMISOS.registrarAtencion} />,
            children: [
              { index: true, element: <Navigate to={RUTAS_TERCERIZADOS.atenciones} replace /> },
              { path: RUTAS_TERCERIZADOS.atenciones, element: <AtencionesPage /> }, // RF-SER-003 a 006 y 011
              { path: RUTAS_TERCERIZADOS.nuevaAtencion, element: <NuevaAtencionPage /> }, // RF-SER-003 y 011
              { path: `${RUTAS_TERCERIZADOS.atenciones}/:id`, element: <AtencionDetallePage /> },
              { path: RUTAS_TERCERIZADOS.proveedoresContratos, element: <ProveedoresContratosPage /> }, // RF-SER-001 y 002
              { path: RUTAS_TERCERIZADOS.nuevoProveedor, element: <ProveedorNuevoPage /> }, // RF-SER-001
              { path: RUTAS_TERCERIZADOS.nuevoContrato, element: <ContratoNuevoPage /> }, // RF-SER-002
              { path: RUTAS_TERCERIZADOS.controlFitosanitario, element: <AtencionEspecialPage /> }, // RF-INV-011
              { path: RUTAS_TERCERIZADOS.marcarEjemplar, element: <MarcarEjemplarPage /> }, // RF-INV-011
            ],
          },
          // MOD-03 «Planificación».
          {
            path: PREFIJO_PLANIFICACION,
            element: <RutaConPermiso permiso={PERMISOS.consultarPlanificacion} />,
            children: [
              { index: true, element: <Navigate to={RUTAS_PLANIFICACION.servicios} replace /> },
              { path: RUTAS_PLANIFICACION.servicios, element: <ServiciosPeriodicosPage /> }, // HU-MOD03-001 y 002
              { path: RUTAS_PLANIFICACION.restricciones, element: <CalendarioRestriccionesPage /> }, // HU-MOD03-003
            ],
          },
          { path: '*', element: <PaginaNoEncontrada /> },
        ],
      },
    ],
  },
])
