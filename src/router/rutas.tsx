/**
 * Rutas de la aplicación web de oficina. Las secciones protegidas requieren sesión de MOD-01 y
 * las secciones con permiso propio pasan además por `RutaConPermiso`.
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
import MaterialVegetalPage from '../pages/reportes-indicadores/reportes/MaterialVegetalPage'
import MapaAtencionesPage from '../pages/reportes-indicadores/mapa-atenciones/MapaAtencionesPage'
import DetalleIndicadorPage from '../pages/reportes-indicadores/panel/DetalleIndicadorPage'
import PanelIndicadoresPage from '../pages/reportes-indicadores/panel/PanelIndicadoresPage'
import AtencionDetallePage from '../pages/servicios-tercerizados/AtencionDetallePage'
import AtencionesPage from '../pages/servicios-tercerizados/AtencionesPage'
import NuevaAtencionPage from '../pages/servicios-tercerizados/nueva/NuevaAtencionPage'
import CalendarioRestriccionesPage from '../pages/planificacion/CalendarioRestriccionesPage'
import ServiciosPeriodicosPage from '../pages/planificacion/ServiciosPeriodicosPage'
import AreasVerdesPage from '../pages/inventario/AreasVerdesPage'
import MapaAreasVerdesPage from '../pages/inventario/MapaAreasVerdesPage'
import CoberturasPage from '../pages/inventario/CoberturasPage'
import CatalogosPage from '../pages/inventario/CatalogosPage'
import NuevaAreaVerdePage from '../pages/inventario/NuevaAreaVerdePage'
import EjemplaresPage from '../pages/inventario/EjemplaresPage'
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
import {
  PREFIJO_PLANIFICACION,
  PREFIJO_TERCERIZADOS,
  RUTAS,
  RUTAS_CORE,
  RUTAS_INVENTARIO,
  RUTAS_PLANIFICACION,
  RUTAS_TERCERIZADOS,
} from './rutasApp'
import CuadrillasPage from '../pages/operacion-campo/CuadrillasPage'
import EncargosPage from '../pages/operacion-campo/EncargosPage'
import ParticipantesPage from '../pages/operacion-campo/ParticipantesPage'
import { BASE_CAMPO, RUTAS_CAMPO } from './rutasCampo'

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
            element: <RutaConPermiso permiso={PERMISOS.consultarCuadrillas} />,
            children: [
              { path: RUTAS_CAMPO.ingreso, element: <Navigate to={RUTAS_CAMPO.cuadrillas} replace /> },
              {
                path: BASE_CAMPO,
                children: [
                  { index: true, element: <Navigate to={RUTAS_CAMPO.cuadrillas} replace /> },
                  { path: RUTAS_CAMPO.cuadrillas, element: <CuadrillasPage /> },
                  { path: RUTAS_CAMPO.encargos, element: <EncargosPage /> },
                  { path: RUTAS_CAMPO.participantes, element: <ParticipantesPage /> },
                ],
              },
            ],
          },
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
              { path: RUTAS.panel, element: <PanelIndicadoresPage /> }, // RF-REP-001
              { path: `${RUTAS.panel}/:indicador`, element: <DetalleIndicadorPage /> }, // RF-REP-001
              { path: RUTAS.materialVegetal, element: <MaterialVegetalPage /> }, // RF-REP-005
              { path: RUTAS.mapaAtenciones, element: <MapaAtencionesPage /> }, // RF-REP-007
            ],
          },
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
            children: [{ path: RUTAS_CORE.repositorio, element: <RepositorioPage /> }],
          },
          { path: `${PREFIJO_TERCERIZADOS}/ingreso`, element: <Navigate to="/" replace /> },
          {
            path: PREFIJO_TERCERIZADOS,
            element: <RutaConPermiso permiso={PERMISOS.registrarAtencion} />,
            children: [
              { index: true, element: <Navigate to={RUTAS_TERCERIZADOS.atenciones} replace /> },
              { path: RUTAS_TERCERIZADOS.atenciones, element: <AtencionesPage /> },
              { path: RUTAS_TERCERIZADOS.nuevaAtencion, element: <NuevaAtencionPage /> },
              { path: `${RUTAS_TERCERIZADOS.atenciones}/:id`, element: <AtencionDetallePage /> },
              { path: RUTAS_TERCERIZADOS.proveedoresContratos, element: <ProveedoresContratosPage /> },
              { path: RUTAS_TERCERIZADOS.nuevoProveedor, element: <ProveedorNuevoPage /> },
              { path: RUTAS_TERCERIZADOS.nuevoContrato, element: <ContratoNuevoPage /> },
              { path: RUTAS_TERCERIZADOS.controlFitosanitario, element: <AtencionEspecialPage /> },
              { path: RUTAS_TERCERIZADOS.marcarEjemplar, element: <MarcarEjemplarPage /> },
            ],
          },
          {
            path: PREFIJO_PLANIFICACION,
            element: <RutaConPermiso permiso={PERMISOS.consultarPlanificacion} />,
            children: [
              { index: true, element: <Navigate to={RUTAS_PLANIFICACION.servicios} replace /> },
              { path: RUTAS_PLANIFICACION.servicios, element: <ServiciosPeriodicosPage /> },
              { path: RUTAS_PLANIFICACION.restricciones, element: <CalendarioRestriccionesPage /> },
            ],
          },
          {
            element: <RutaConPermiso permiso={PERMISOS.consultarInventario} />,
            children: [
              {
                path: RUTAS_INVENTARIO.areasVerdes,
                children: [
                  { index: true, element: <AreasVerdesPage /> },
                  { path: 'nueva', element: <NuevaAreaVerdePage /> },
                  { path: 'mapa', element: <MapaAreasVerdesPage /> },
                  { path: 'coberturas', element: <CoberturasPage /> },
                  { path: 'catalogos', element: <CatalogosPage /> },
                  { path: 'ejemplares', element: <EjemplaresPage /> },
                ],
              },
            ],
          },
          { path: '*', element: <PaginaNoEncontrada /> },
        ],
      },
    ],
  },
])
