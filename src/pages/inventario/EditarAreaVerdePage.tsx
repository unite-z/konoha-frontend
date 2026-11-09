import { useNavigate, useParams } from 'react-router'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { RUTAS_INVENTARIO } from '@/router/rutasApp'
import { obtenerAreaVerde } from '@/services/api/areasVerdes'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { PERMISOS, puede } from '@/config/permisosCore'
import AreaVerdeForm from './AreaVerdeForm'

export default function EditarAreaVerdePage() {
  const navegar = useNavigate()
  const sesion = useSesionActiva()
  const { id } = useParams()
  const areaId = Number(id)
  const consulta = useConsulta(`area-verde:${id}`, (signal) => obtenerAreaVerde(areaId, signal))
  usePaginaActual(consulta.datos ? `Editar · ${consulta.datos.nombre}` : 'Editar área verde', [{ texto: 'Áreas verdes', ruta: RUTAS_INVENTARIO.areasVerdes }, { texto: 'Editar área' }])

  if (!puede(sesion, PERMISOS.registrarInventario)) {
    return <EstadoError titulo="No tienes permiso para editar áreas" descripcion="La edición requiere permiso de inventario." onReintentar={() => navegar(RUTAS_INVENTARIO.areasVerdes)} />
  }
  if (!Number.isInteger(areaId) || areaId < 1) return <EstadoError titulo="Área inválida" descripcion="El identificador del área no es válido." onReintentar={() => navegar(RUTAS_INVENTARIO.areasVerdes)} />
  if (consulta.estado === 'error' && !consulta.datos) return <EstadoError titulo="No pudimos cargar el área" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  if (!consulta.datos) return <EstadoCarga forma="tabla" texto="Cargando ficha del área…" />

  return <AreaVerdeForm modo="editar" area={consulta.datos} alGuardar={() => navegar(RUTAS_INVENTARIO.areasVerdes)} alCancelar={() => navegar(RUTAS_INVENTARIO.areasVerdes)} />
}
