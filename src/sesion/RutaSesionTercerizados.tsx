/**
 * Guardián de las rutas de MOD-05 y MOD-03 (excepto el ingreso, que es el de MOD-05).
 *
 * - Sin sesión → ingreso, con `?volver=` para regresar a la misma ruta (sin destino si el usuario la cerró).
 * - Comprobando la sesión guardada → esqueleto.
 * - Sin conexión al comprobarla → error con «Reintentar» (no se cierra la sesión).
 * - Usuario válido sin rol del módulo → aviso de acceso denegado con «Cerrar sesión».
 */
import { Navigate, Outlet, useLocation } from 'react-router'
import Boton from '../components/ui/Boton'
import EstadoCarga from '../components/ui/EstadoCarga'
import EstadoError from '../components/ui/EstadoError'
import EstadoVacio from '../components/ui/EstadoVacio'
import { usePaginaActual } from '../hooks/usePaginaActual'
import { MIGAS_PLANIFICACION, MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS, esRutaPlanificacion, rutaIngreso } from '../router/rutasApp'
import { useSesionTercerizados } from './ContextoSesionTercerizados'

function SinAcceso() {
  const { cerrarSesion } = useSesionTercerizados()
  const planificacion = esRutaPlanificacion(useLocation().pathname)
  const modulo = planificacion ? 'Planificación' : 'Servicios tercerizados'
  usePaginaActual('Sin acceso', [planificacion ? MIGAS_PLANIFICACION.planificacion : MIGAS_TERCERIZADOS.serviciosTercerizados])
  return (
    <EstadoVacio
      icono="triangulo"
      titulo={`Tu usuario no tiene acceso a ${modulo}`}
      descripcion="Para usar este módulo necesitas el rol de jefe de sección, ingeniero de campo o practicante autorizado. Pide al administrador que te lo asigne o ingresa con otro usuario."
      accion={
        <Boton variante="secundario" onClick={cerrarSesion}>
          Cerrar sesión
        </Boton>
      }
    />
  )
}

function ErrorSesion() {
  const { estado, reintentar } = useSesionTercerizados()
  usePaginaActual('Servicios tercerizados', [MIGAS_TERCERIZADOS.serviciosTercerizados])
  return (
    <EstadoError
      titulo="No pudimos comprobar tu sesión"
      descripcion={estado.tipo === 'error' ? estado.error.detalle : ''}
      onReintentar={reintentar}
    />
  )
}

export default function RutaSesionTercerizados() {
  const { estado } = useSesionTercerizados()
  const { pathname, search, hash } = useLocation()

  switch (estado.tipo) {
    case 'sin-sesion':
      return <Navigate to={estado.cerrada ? RUTAS_TERCERIZADOS.ingreso : rutaIngreso(`${pathname}${search}${hash}`)} replace />
    case 'verificando':
      return <EstadoCarga forma="pagina" texto="Comprobando tu sesión…" retrasar />
    case 'error':
      return <ErrorSesion />
    case 'activa':
      return estado.usuario.rol ? <Outlet /> : <SinAcceso />
  }
}
