import { useNavigate } from 'react-router'
import EstadoError from '@/components/ui/EstadoError'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO } from '@/router/rutasApp'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { PERMISOS, puede } from '@/config/permisosCore'
import AreaVerdeForm from './AreaVerdeForm'

export default function NuevaAreaVerdePage() {
  usePaginaActual('Registrar área verde', [MIGAS_INVENTARIO.areasVerdes, { texto: 'Registrar área' }])
  const navegar = useNavigate()
  const sesion = useSesionActiva()

  if (!puede(sesion, PERMISOS.registrarInventario)) {
    return <EstadoError titulo="No tienes permiso para registrar áreas" descripcion="El alta requiere permiso de inventario." onReintentar={() => navegar(RUTAS_INVENTARIO.areasVerdes)} />
  }

  return <AreaVerdeForm modo="crear" puedeVincularMapa={puede(sesion, PERMISOS.gestionarCatalogos)}
    alGuardar={() => navegar(RUTAS_INVENTARIO.areasVerdes)} alCancelar={() => navegar(RUTAS_INVENTARIO.areasVerdes)} />
}
