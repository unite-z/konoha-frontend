import { Navigate, Outlet, useLocation } from 'react-router'
import EstadoCarga from '../components/ui/EstadoCarga'
import EstadoError from '../components/ui/EstadoError'
import Boton from '../components/ui/Boton'
import { useSesionCampo } from './ContextoSesionCampo'
import { RUTAS_CAMPO } from '../router/rutasCampo'

export default function RutaSesionCampo() {
  const sesion=useSesionCampo()
  const location=useLocation()
  if(sesion.verificando) return <EstadoCarga texto="Verificando tu sesión…" />
  if(sesion.error) return <><EstadoError titulo="No pudimos verificar la sesión" descripcion={sesion.error} onReintentar={sesion.reintentar}/><Boton variante="terciario" onClick={sesion.cerrarSesion}>Volver a ingresar</Boton></>
  if(!sesion.usuario) return <Navigate replace to={`${RUTAS_CAMPO.ingreso}?volver=${encodeURIComponent(location.pathname+location.search)}`} />
  return <Outlet key={sesion.usuario.id}/>
}
