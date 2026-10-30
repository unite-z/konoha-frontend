/**
 * Guardianes de MOD-01 (RF-T-001 y RF-T-004).
 *
 * - `RutaProtegida`: sin sesión no se ve ninguna funcionalidad, solo el ingreso (CU-MOD01-001 paso 1).
 *   Con contraseña temporal lleva a definir una nueva antes de continuar (HU-MOD01-003).
 * - `RutaConPermiso`: con sesión pero sin el permiso, aviso «No tiene permiso para esta acción». Es solo
 *   usabilidad: el servidor responde 403 de todos modos y registra el intento.
 * - `InicioRol`: lleva a la primera sección que el rol puede usar.
 */
import { Navigate, Outlet, useLocation } from 'react-router'
import Boton from '../components/ui/Boton'
import EstadoCarga from '../components/ui/EstadoCarga'
import EstadoError from '../components/ui/EstadoError'
import EstadoVacio from '../components/ui/EstadoVacio'
import { entradasMenu, puede } from '../config/permisosCore'
import { usePaginaActual } from '../hooks/usePaginaActual'
import { RUTAS, RUTAS_CORE, RUTAS_PLANIFICACION, RUTAS_TERCERIZADOS, rutaIngresoCore } from '../router/rutasApp'
import { useSesion, useSesionActiva } from './ContextoSesion'
import { RUTAS_CAMPO } from '../router/rutasCampo'

export default function RutaProtegida({ permitirContrasenaTemporal = false }: { permitirContrasenaTemporal?: boolean }) {
  const { estado, recargar } = useSesion()
  const { pathname, search, hash } = useLocation()

  switch (estado.tipo) {
    case 'verificando':
      return <EstadoCarga forma="pagina" texto="Comprobando tu sesión…" retrasar />
    case 'error':
      return (
        <EstadoError titulo="No pudimos comprobar tu sesión" descripcion={estado.error.detalle} onReintentar={() => void recargar()} />
      )
    case 'anonima':
      return (
        <Navigate
          to={estado.motivo === 'cerrada' ? RUTAS_CORE.ingreso : rutaIngresoCore(`${pathname}${search}${hash}`)}
          state={{ perdida: estado.motivo === 'perdida' }}
          replace
        />
      )
    case 'activa':
      if (estado.sesion.debe_cambiar_contrasena && !permitirContrasenaTemporal) {
        return <Navigate to={RUTAS_CORE.cambiarContrasena} replace />
      }
      return <Outlet />
  }
}

export function SinPermiso() {
  usePaginaActual('Sin permiso', [])
  return (
    <EstadoVacio
      icono="triangulo"
      titulo="No tiene permiso para esta acción"
      descripcion="Tu rol no incluye esta sección. Si la necesitas, pide al jefe de sección que revise tu rol."
    />
  )
}

export function RutaConPermiso({ permiso }: { permiso: string }) {
  const sesion = useSesionActiva()
  return puede(sesion, permiso) ? <Outlet /> : <SinPermiso />
}

export function InicioRol() {
  const sesion = useSesionActiva()
  const { cerrarSesion } = useSesion()
  const entradas = entradasMenu(sesion)
  if (sesion?.rol.codigo === 'capataz' && entradas.has('campo')) return <Navigate to={RUTAS_CAMPO.cuadrillas} replace />
  if (entradas.has('reportes')) return <Navigate to={RUTAS.reportes} replace />
  if (entradas.has('planificacion')) return <Navigate to={RUTAS_PLANIFICACION.servicios} replace />
  if (entradas.has('tercerizados')) return <Navigate to={RUTAS_TERCERIZADOS.atenciones} replace />
  if (entradas.has('repositorio')) return <Navigate to={RUTAS_CORE.repositorio} replace />
  return (
    <EstadoVacio
      icono="triangulo"
      titulo="Tu rol aún no tiene secciones disponibles"
      accion={
        <Boton variante="secundario" onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </Boton>
      }
    />
  )
}
