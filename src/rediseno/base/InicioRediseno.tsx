import { Navigate } from 'react-router'
import Boton from '@/design-system/Boton'
import EstadoVacio from '@/design-system/EstadoVacio'
import { PERMISOS, puede } from '@/config/permisosCore'
import { useSesion, useSesionActiva } from '@/sesion/ContextoSesion'
import { rutaCampo } from '../campo/enlaces'
import { rutaMapa } from '../mapa/enlaces'
import { seccionesDeCabecera } from '../registro'

const REGISTRAR_PARTE = 'CAM.PARTE.REGISTRAR'
const VERIFICAR_PARTE = 'CAM.PARTE.VERIFICAR'

/**
 * Inicio de `/n` según el rol (N-06), siempre por código de permiso:
 * 1. quien registra el parte y no verifica (capataz) y puede entrar a campo, a su ruta de hoy;
 * 2. quien tiene inventario, al Mapa;
 * 3. si no, la primera sección de la cabecera que sus permisos dejan ver;
 * 4. sin ninguna, un aviso con «Cerrar sesión».
 */
export default function InicioRediseno() {
  const sesion = useSesionActiva()
  const { cerrarSesion } = useSesion()
  const permisos = sesion?.permisos ?? []
  const deCampo = puede(sesion, REGISTRAR_PARTE) && !puede(sesion, VERIFICAR_PARTE)
  if (deCampo && (puede(sesion, PERMISOS.consultarCuadrillas) || puede(sesion, PERMISOS.registrarCorte))) {
    return <Navigate to={rutaCampo()} replace />
  }
  if (puede(sesion, PERMISOS.consultarInventario)) return <Navigate to={rutaMapa()} replace />
  const primera = seccionesDeCabecera(permisos)[0]
  if (primera) return <Navigate to={primera.ruta} replace />
  return (
    <EstadoVacio
      centrado
      titulo="Tu rol aún no tiene secciones disponibles"
      descripcion="Pide al jefe de sección que revise los permisos de tu cuenta."
      accion={
        <Boton variante="secundario" onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </Boton>
      }
    />
  )
}
