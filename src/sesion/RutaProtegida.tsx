/**
 * Guardianes de MOD-01 (RF-T-001 y RF-T-004).
 *
 * - `RutaProtegida`: sin sesión no se ve ninguna funcionalidad, solo el ingreso (CU-MOD01-001 paso 1).
 *   Con contraseña temporal lleva a definir una nueva antes de continuar (HU-MOD01-003).
 * - `RutaConPermiso`: con sesión pero sin el permiso, aviso «No tiene permiso para esta acción» o, si se indica la
 *   `seccion`, «Acceso denegado» centrado con «Volver al inicio» (Figma 374-7925). Es solo usabilidad: el servidor
 *   responde 403 de todos modos y registra el intento.
 * - `InicioRol`: lleva a la primera sección que el rol puede usar.
 */
import { Navigate, Outlet, useLocation } from 'react-router'
import Boton, { BotonEnlace } from '../components/ui/Boton'
import EstadoCarga from '../components/ui/EstadoCarga'
import EstadoError from '../components/ui/EstadoError'
import EstadoVacio from '../components/ui/EstadoVacio'
import { entradasMenu, puede, type EntradaMenu } from '../config/permisosCore'
import { usePaginaActual } from '../hooks/usePaginaActual'
import { RUTAS, RUTAS_CORE, RUTAS_CORTE, RUTAS_PLANIFICACION, RUTAS_TERCERIZADOS, rutaIngresoCore } from '../router/rutasApp'
import { useSesion, useSesionActiva } from './ContextoSesion'
import estilos from './RutaProtegida.module.css'
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
    case 'sinConexion':
      if (estado.sesion.debe_cambiar_contrasena && !permitirContrasenaTemporal) {
        return <Navigate to={RUTAS_CORE.cambiarContrasena} replace />
      }
      return <Outlet />
  }
}

export interface SinPermisoProps {
  /** Sección a la que se intenta entrar: con ella, «Acceso denegado» como en Figma (374-7925). */
  seccion?: string
  /** Dónde está lo que sí puede usar el rol (por ejemplo, la app móvil del capataz). */
  descripcion?: string
}

export function SinPermiso({ seccion, descripcion }: SinPermisoProps) {
  usePaginaActual(seccion ? 'Acceso denegado' : 'Sin permiso', seccion ? [{ texto: seccion }, { texto: 'Acceso denegado' }] : [], undefined, {
    tituloOculto: Boolean(seccion),
  })
  if (seccion) {
    return (
      <div className={estilos.hueco}>
        <EstadoVacio
          centrado
          icono="circle-x"
          titulo={`No tienes acceso a ${seccion}`}
          descripcion={descripcion ?? 'Tu rol no incluye esta sección. Si la necesitas, pide al jefe de sección que revise tu rol.'}
          accion={
            <BotonEnlace to="/" variante="secundario">
              Volver al inicio
            </BotonEnlace>
          }
        />
      </div>
    )
  }
  return (
    <EstadoVacio
      icono="triangulo"
      titulo="No tiene permiso para esta acción"
      descripcion="Tu rol no incluye esta sección. Si la necesitas, pide al jefe de sección que revise tu rol."
    />
  )
}

export function RutaConPermiso({ permiso, ...sinPermiso }: { permiso: string } & SinPermisoProps) {
  const sesion = useSesionActiva()
  return puede(sesion, permiso) ? <Outlet /> : <SinPermiso {...sinPermiso} />
}

/** Como `RutaConPermiso`, pero con la regla de una entrada del menú (por ejemplo, la ruta de corte del capataz). */
export function RutaConEntrada({ entrada, ...sinPermiso }: { entrada: EntradaMenu } & SinPermisoProps) {
  const sesion = useSesionActiva()
  return entradasMenu(sesion).has(entrada) ? <Outlet /> : <SinPermiso {...sinPermiso} />
}

export function InicioRol() {
  const sesion = useSesionActiva()
  const { cerrarSesion } = useSesion()
  const entradas = entradasMenu(sesion)
  // Quien trabaja en campo (registra su parte y no ve los de otras cuadrillas) empieza por su ruta o su cuadrilla.
  const deCampo = puede(sesion, 'CAM.PARTE.REGISTRAR') && !puede(sesion, 'CAM.PARTE.CONSULTAR')
  if (deCampo && entradas.has('corte')) return <Navigate to={RUTAS_CORTE.rutaDeHoy} replace />
  if (deCampo && entradas.has('campo')) return <Navigate to={RUTAS_CAMPO.cuadrillas} replace />
  if (entradas.has('reportes')) return <Navigate to={RUTAS.reportes} replace />
  if (entradas.has('planificacion')) return <Navigate to={RUTAS_PLANIFICACION.resumen} replace />
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
