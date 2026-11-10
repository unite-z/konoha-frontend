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
import MaterialVegetalPage from '../pages/reportes-indicadores/reportes/MaterialVegetalPage'
import ReporteServicioTercerizadoPage from '../pages/reportes-indicadores/reportes/ReporteServicioTercerizadoPage'
import ExportacionesPage from '../pages/reportes-indicadores/exportaciones/ExportacionesPage'
import ProgramadoEjecutadoPage from '../pages/reportes-indicadores/reportes/ProgramadoEjecutadoPage'
import PriorizacionIaPage from '../pages/reportes-indicadores/asistencia-ia/PriorizacionIaPage'
import RevisionPriorizacionPage from '../pages/reportes-indicadores/asistencia-ia/RevisionPriorizacionPage'
import InconsistenciasIaPage from '../pages/reportes-indicadores/asistencia-ia/InconsistenciasIaPage'
import RevisionInconsistenciaPage from '../pages/reportes-indicadores/asistencia-ia/RevisionInconsistenciaPage'
import CronogramaIaPage from '../pages/reportes-indicadores/asistencia-ia/CronogramaIaPage'
import RevisionCronogramaPage from '../pages/reportes-indicadores/asistencia-ia/RevisionCronogramaPage'
import EstimacionRecursosPage from '../pages/reportes-indicadores/asistencia-ia/EstimacionRecursosPage'
import RevisionEstimacionPage from '../pages/reportes-indicadores/asistencia-ia/RevisionEstimacionPage'
import ClasificacionIncidenciasIaPage from '../pages/reportes-indicadores/asistencia-ia/ClasificacionIncidenciasIaPage'
import RevisionClasificacionPage from '../pages/reportes-indicadores/asistencia-ia/RevisionClasificacionPage'
import EvidenciaFitosanitariaIaPage from '../pages/reportes-indicadores/asistencia-ia/EvidenciaFitosanitariaIaPage'
import RevisionEvidenciaPage from '../pages/reportes-indicadores/asistencia-ia/RevisionEvidenciaPage'
import MapaAtencionesPage from '../pages/reportes-indicadores/mapa-atenciones/MapaAtencionesPage'
import DetalleIndicadorPage from '../pages/reportes-indicadores/panel/DetalleIndicadorPage'
import PanelIndicadoresPage from '../pages/reportes-indicadores/panel/PanelIndicadoresPage'
import AtencionDetallePage from '../pages/servicios-tercerizados/AtencionDetallePage'
import AtencionesPage from '../pages/servicios-tercerizados/AtencionesPage'
import NuevaAtencionPage from '../pages/servicios-tercerizados/nueva/NuevaAtencionPage'
import BandejaIncidenciasPage from '../pages/incidencias/BandejaIncidenciasPage'
import IncidenciaDetallePage from '../pages/incidencias/IncidenciaDetallePage'
import MiIncidenciaPage from '../pages/incidencias/MiIncidenciaPage'
import MisIncidenciasPage from '../pages/incidencias/MisIncidenciasPage'
import CalendarioCuadrillaPage from '../pages/corte/CalendarioCuadrillaPage'
import RutaDeHoyPage from '../pages/corte/RutaDeHoyPage'
import CalendarioPage from '../pages/planificacion/calendario/CalendarioPage'
import CicloDetallePage from '../pages/planificacion/ciclos/CicloDetallePage'
import CiclosPage from '../pages/planificacion/ciclos/CiclosPage'
import ConfiguracionPage from '../pages/planificacion/configuracion/ConfiguracionPage'
import ResumenPlanificacionPage from '../pages/planificacion/resumen/ResumenPlanificacionPage'
import CoberturasPage from '../pages/inventario/CoberturasPage'
import AreasVerdesPage from '../pages/inventario/AreasVerdesPage'
import NuevaAreaVerdePage from '../pages/inventario/NuevaAreaVerdePage'
import EditarAreaVerdePage from '../pages/inventario/EditarAreaVerdePage'
import CatalogosPage from '../pages/inventario/CatalogosPage'
import EjemplaresPage from '../pages/inventario/EjemplaresPage'
import CampanasPodaPage from '../pages/inventario/CampanasPodaPage'
import CampanaPodaDetallePage from '../pages/inventario/CampanaPodaDetallePage'
import PlanificarCampanaPage from '../pages/inventario/PlanificarCampanaPage'
import RegistrarPodaPage from '../pages/inventario/RegistrarPodaPage'
import IntervencionPodaPage from '../pages/inventario/IntervencionPodaPage'
import EspeciesCampanaPage from '../pages/inventario/EspeciesCampanaPage'
import RendimientoCampanaPage from '../pages/inventario/RendimientoCampanaPage'
import AtencionEspecialPage from '../pages/servicios-tercerizados/maestros/AtencionEspecialPage'
import PlanFitosanitarioPage from '../pages/servicios-tercerizados/maestros/PlanFitosanitarioPage'
import ProductosAgronomicosPage from '../pages/servicios-tercerizados/maestros/ProductosAgronomicosPage'
import ProductoAgronomicoNuevoPage from '../pages/servicios-tercerizados/maestros/ProductoAgronomicoNuevoPage'
import ProductoAgronomicoEditarPage from '../pages/servicios-tercerizados/maestros/ProductoAgronomicoEditarPage'
import ProductoAgronomicoDetallePage from '../pages/servicios-tercerizados/maestros/ProductoAgronomicoDetallePage'
import ObservacionesPlagasPage from '../pages/servicios-tercerizados/maestros/ObservacionesPlagasPage'
import ObservacionPlagaNuevaPage from '../pages/servicios-tercerizados/maestros/ObservacionPlagaNuevaPage'
import ObservacionPlagaDetallePage from '../pages/servicios-tercerizados/maestros/ObservacionPlagaDetallePage'
import AtencionEspecialDetallePage from '../pages/servicios-tercerizados/maestros/AtencionEspecialDetallePage'
import ProgramarAplicacionPage from '../pages/servicios-tercerizados/maestros/ProgramarAplicacionPage'
import ContratoDetallePage from '../pages/servicios-tercerizados/maestros/ContratoDetallePage'
import ContratoEditarPage from '../pages/servicios-tercerizados/maestros/ContratoEditarPage'
import ContratoNuevoPage from '../pages/servicios-tercerizados/maestros/ContratoNuevoPage'
import MarcarEjemplarPage from '../pages/servicios-tercerizados/maestros/MarcarEjemplarPage'
import ProveedorDetallePage from '../pages/servicios-tercerizados/maestros/ProveedorDetallePage'
import ProveedorEditarPage from '../pages/servicios-tercerizados/maestros/ProveedorEditarPage'
import ProveedorNuevoPage from '../pages/servicios-tercerizados/maestros/ProveedorNuevoPage'
import ProveedoresContratosPage from '../pages/servicios-tercerizados/maestros/ProveedoresContratosPage'
import RutaProtegida, { InicioRol, RutaConEntrada, RutaConPermiso } from '../sesion/RutaProtegida'
import CambioContrasenaPage from '../pages/acceso/CambioContrasenaPage'
import IngresoPage from '../pages/acceso/IngresoPage'
import RepositorioPage from '../pages/repositorio/RepositorioPage'
import AccesosPage from '../pages/usuarios-roles/AccesosPage'
import ImportacionPage from '../pages/usuarios-roles/ImportacionPage'
import UsuarioDetallePage from '../pages/usuarios-roles/UsuarioDetallePage'
import UsuariosPage from '../pages/usuarios-roles/UsuariosPage'
import { PERMISOS } from '../config/permisosCore'
import { PREFIJO_CORTE, PREFIJO_INCIDENCIAS, PREFIJO_PLANIFICACION, RUTAS_CORTE, RUTAS_MIS_INCIDENCIAS, PREFIJO_TERCERIZADOS, RUTAS, RUTAS_CORE, RUTAS_INVENTARIO, RUTAS_PLANIFICACION, RUTAS_PLANIFICACION_ANTIGUAS, RUTAS_TERCERIZADOS } from './rutasApp'
import CuadrillasPage from '../pages/operacion-campo/CuadrillasPage'
import EncargosPage from '../pages/operacion-campo/EncargosPage'
import ActividadesPage from '../pages/operacion-campo/ActividadesPage'
import ParticipantesPage from '../pages/operacion-campo/ParticipantesPage'
import CatalogoActividadesPage from '../pages/operacion-campo/CatalogoActividadesPage'
import { BASE_CAMPO, RUTAS_CAMPO } from './rutasCampo'

/** «Acceso denegado» de Planificación (Figma 374-7925): el capataz tiene su ruta y su calendario en la app móvil. */
const DESCRIPCION_SIN_PLANIFICACION = 'Tu ruta del día y el calendario están en la app móvil.'

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
                  { path: RUTAS_CAMPO.actividades, element: <ActividadesPage /> },
                  { path: RUTAS_CAMPO.participantes, element: <ParticipantesPage /> },
                  { path: RUTAS_CAMPO.catalogoActividades, element: <CatalogoActividadesPage /> },
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
              { path: RUTAS.priorizacionIa, element: <PriorizacionIaPage /> }, // RN-IA-002
              { path: `${RUTAS.priorizacionIa}/:id`, element: <RevisionPriorizacionPage /> }, // RN-IA-002
              { path: RUTAS.inconsistenciasIa, element: <InconsistenciasIaPage /> }, // RF-IA-002
              { path: `${RUTAS.inconsistenciasIa}/:id`, element: <RevisionInconsistenciaPage /> }, // RF-IA-002
              { path: RUTAS.cronogramaIa, element: <CronogramaIaPage /> }, // RF-IA-003
              { path: `${RUTAS.cronogramaIa}/:id`, element: <RevisionCronogramaPage /> }, // RF-IA-003
              { path: RUTAS.estimacionRecursos, element: <EstimacionRecursosPage /> }, // RF-IA-004
              { path: `${RUTAS.estimacionRecursos}/:id`, element: <RevisionEstimacionPage /> }, // RF-IA-004
              { path: RUTAS.clasificacionIncidencias, element: <ClasificacionIncidenciasIaPage /> }, // RF-IA-005
              { path: `${RUTAS.clasificacionIncidencias}/:id`, element: <RevisionClasificacionPage /> }, // RF-IA-005
              { path: RUTAS.evidenciaFitosanitaria, element: <EvidenciaFitosanitariaIaPage /> }, // RF-IA-006
              { path: `${RUTAS.evidenciaFitosanitaria}/:id`, element: <RevisionEvidenciaPage /> }, // RF-IA-006
              { path: RUTAS.panel, element: <PanelIndicadoresPage /> }, // RF-REP-001
              { path: `${RUTAS.panel}/:indicador`, element: <DetalleIndicadorPage /> }, // RF-REP-001
              { path: RUTAS.materialVegetal, element: <MaterialVegetalPage /> }, // RF-REP-005
              { path: RUTAS.mapaAtenciones, element: <MapaAtencionesPage /> }, // RF-REP-007
              { path: RUTAS.reporteServicioTercerizado, element: <ReporteServicioTercerizadoPage /> }, // RF-REP-008
              { path: RUTAS.exportaciones, element: <ExportacionesPage /> }, // RF-REP-009
              { path: RUTAS.programadoEjecutado, element: <ProgramadoEjecutadoPage /> }, // RF-REP-010
            ],
          },
          // MOD-01 «Usuarios y roles»: solo el jefe de sección (RF-T-002 a RF-T-004).
          {
            element: <RutaConPermiso permiso={PERMISOS.consultarInventario} />,
            children: [{
              path: RUTAS_INVENTARIO.areasVerdes,
              children: [
                { index: true, element: <AreasVerdesPage /> },
                { path: 'nueva', element: <NuevaAreaVerdePage /> },
                { path: ':id/editar', element: <EditarAreaVerdePage /> },
                { path: 'coberturas', element: <CoberturasPage /> },
                { path: 'catalogos', element: <CatalogosPage /> },
                { path: 'ejemplares', element: <EjemplaresPage /> },
                { path: 'campanas-poda', element: <CampanasPodaPage /> },
                { path: 'campanas-poda/nueva', element: <PlanificarCampanaPage /> },
                { path: 'campanas-poda/:id', element: <CampanaPodaDetallePage /> },
                { path: 'campanas-poda/:id/editar', element: <PlanificarCampanaPage /> },
                { path: 'campanas-poda/:id/registrar', element: <RegistrarPodaPage /> },
                { path: 'campanas-poda/:id/rendimiento', element: <RendimientoCampanaPage /> },
                { path: 'campanas-poda/:id/especies', element: <EspeciesCampanaPage /> },
                { path: 'intervenciones-poda/:id', element: <IntervencionPodaPage /> },
                { path: 'mapa', lazy: async () => ({ Component: (await import('../pages/inventario/MapaAreasVerdesPage')).default }) },
              ],
            }],
          },
          {
            element: <RutaConPermiso permiso={PERMISOS.gestionarUsuarios} />,
            children: [
              { path: RUTAS_CORE.usuarios, element: <UsuariosPage /> },
              { path: `${RUTAS_CORE.usuarios}/:id`, element: <UsuarioDetallePage /> },
              { path: RUTAS_CORE.accesos, element: <AccesosPage /> },
              { path: RUTAS_CORE.importacion, element: <ImportacionPage /> },
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
              { path: `${RUTAS_TERCERIZADOS.proveedoresContratos}/proveedores/:id`, element: <ProveedorDetallePage /> }, // RF-SER-001 y 002
              { path: `${RUTAS_TERCERIZADOS.proveedoresContratos}/proveedores/:id/editar`, element: <ProveedorEditarPage /> }, // RF-SER-001
              { path: RUTAS_TERCERIZADOS.nuevoContrato, element: <ContratoNuevoPage /> }, // RF-SER-002
              { path: `${RUTAS_TERCERIZADOS.proveedoresContratos}/contratos/:id`, element: <ContratoDetallePage /> }, // RF-SER-002
              { path: `${RUTAS_TERCERIZADOS.proveedoresContratos}/contratos/:id/editar`, element: <ContratoEditarPage /> }, // RF-SER-002
              { path: RUTAS_TERCERIZADOS.controlFitosanitario, element: <AtencionEspecialPage /> }, // RF-INV-011
              { path: RUTAS_TERCERIZADOS.marcarEjemplar, element: <MarcarEjemplarPage /> }, // RF-INV-011
              { path: RUTAS_TERCERIZADOS.planFitosanitario, element: <PlanFitosanitarioPage /> }, // RF-FIT-001
              { path: RUTAS_TERCERIZADOS.productosAgronomicos, element: <ProductosAgronomicosPage /> }, // RF-FIT-003
              { path: RUTAS_TERCERIZADOS.nuevoProductoAgronomico, element: <ProductoAgronomicoNuevoPage /> }, // RF-FIT-003
              { path: `${RUTAS_TERCERIZADOS.productosAgronomicos}/:id/editar`, element: <ProductoAgronomicoEditarPage /> }, // RF-FIT-003
              { path: `${RUTAS_TERCERIZADOS.productosAgronomicos}/:id`, element: <ProductoAgronomicoDetallePage /> }, // RF-FIT-003
              { path: RUTAS_TERCERIZADOS.observacionesPlagas, element: <ObservacionesPlagasPage /> }, // RF-FIT-005
              { path: RUTAS_TERCERIZADOS.nuevaObservacionPlaga, element: <ObservacionPlagaNuevaPage /> }, // RF-FIT-005
              { path: `${RUTAS_TERCERIZADOS.observacionesPlagas}/:id`, element: <ObservacionPlagaDetallePage /> }, // RF-FIT-005
              { path: `${RUTAS_TERCERIZADOS.controlFitosanitario}/:id/aplicaciones/nueva`, element: <ProgramarAplicacionPage /> }, // RF-FIT-006
              { path: `${RUTAS_TERCERIZADOS.controlFitosanitario}/:id`, element: <AtencionEspecialDetallePage /> }, // RF-INV-011 y RF-FIT-006
            ],
          },
          // MOD-03 «Planificación».
          {
            path: PREFIJO_PLANIFICACION,
            element: <RutaConPermiso permiso={PERMISOS.consultarPlanificacion} seccion="Planificación" descripcion={DESCRIPCION_SIN_PLANIFICACION} />,
            children: [
              { index: true, element: <Navigate to={RUTAS_PLANIFICACION.resumen} replace /> },
              { path: RUTAS_PLANIFICACION.resumen, element: <ResumenPlanificacionPage /> }, // RF-PLA-008 y 009
              { path: RUTAS_PLANIFICACION.calendario, element: <CalendarioPage /> }, // HU-MOD03-003 y 005, RF-PLA-003 y 007
              { path: RUTAS_PLANIFICACION.ciclos, element: <CiclosPage /> }, // RF-PLA-004 y CU-007
              { path: `${RUTAS_PLANIFICACION.ciclos}/:id`, element: <CicloDetallePage /> }, // CU-004 y CU-007
              { path: RUTAS_PLANIFICACION.configuracion, element: <ConfiguracionPage /> }, // HU-MOD03-001 y 002 (AV-268)
              { path: RUTAS_PLANIFICACION_ANTIGUAS.servicios, element: <Navigate to={RUTAS_PLANIFICACION.configuracion} replace /> },
              { path: RUTAS_PLANIFICACION_ANTIGUAS.restricciones, element: <Navigate to={RUTAS_PLANIFICACION.calendario} replace /> },
            ],
          },
          // MOD-03 · el capataz en el móvil (AV-271): su ruta del día y el calendario de su cuadrilla.
          {
            path: PREFIJO_CORTE,
            element: <RutaConEntrada entrada="corte" seccion="Corte de césped" />,
            children: [
              { index: true, element: <Navigate to={RUTAS_CORTE.rutaDeHoy} replace /> },
              { path: RUTAS_CORTE.rutaDeHoy, element: <RutaDeHoyPage /> }, // RF-COR-002, HU-011 y CU-011
              { path: RUTAS_CORTE.calendario, element: <CalendarioCuadrillaPage /> }, // RF-PLA-007 (solo lectura)
            ],
          },
          // MOD-03 · mis incidencias (AV-282): cualquier usuario con sesión, con la regla de su entrada del menú.
          {
            path: RUTAS_MIS_INCIDENCIAS.lista,
            element: <RutaConEntrada entrada="misIncidencias" seccion="Mis incidencias" />,
            children: [
              { index: true, element: <MisIncidenciasPage /> }, // HU-024
              { path: ':id', element: <MiIncidenciaPage /> }, // HU-024 (seguimiento, Figma 391-8560)
            ],
          },
          // MOD-03 «Incidencias»: hasta AV-281, con el permiso de Planificación (el jefe).
          {
            path: PREFIJO_INCIDENCIAS,
            element: <RutaConPermiso permiso={PERMISOS.consultarPlanificacion} />,
            children: [
              { index: true, element: <BandejaIncidenciasPage /> }, // HU-024 y HU-027 (AV-283)
              { path: ':id', element: <IncidenciaDetallePage /> }, // HU-021 a HU-023 (AV-284)
            ],
          },
          { path: '*', element: <PaginaNoEncontrada /> },
        ],
      },
    ],
  },
])
