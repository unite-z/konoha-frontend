// RF-T-002 · Registro de accesos (CU-MOD01-007)
/**
 * Inicios de sesión correctos y fallidos, bloqueos, accesos denegados y rechazos por falta de permiso.
 * Solo se consulta: la base no admite modificarlo ni borrarlo (RI-35).
 */
import Badge from '../../components/ui/Badge'
import Selector, { OPCION_TODOS } from '../../components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '../../components/ui/TablaDatos'
import { useConsulta } from '../../hooks/useConsulta'
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_CORE } from '../../router/rutasApp'
import { listarAccesos } from '../../services/api/core'
import type { Acceso, ResultadoAcceso } from '../../types/core'
import { RESULTADO_ACCESO } from '../../utils/etiquetasCore'
import { formatearFechaHora } from '../../utils/formato'
import estilos from './UsuariosRoles.module.css'

const TITULO = 'Registro de accesos'

const COLUMNAS: ColumnaTabla<Acceso>[] = [
  { clave: 'fecha', titulo: 'Fecha', render: (a) => formatearFechaHora(a.fecha_hora) },
  { clave: 'usuario', titulo: 'Usuario', multilinea: true, render: (a) => a.usuario_nombre ?? a.identificador ?? '—' },
  {
    clave: 'resultado',
    titulo: 'Resultado',
    render: (a) => <Badge tono={RESULTADO_ACCESO[a.resultado].tono} texto={RESULTADO_ACCESO[a.resultado].texto} />,
  },
  { clave: 'canal', titulo: 'Canal', render: (a) => a.canal },
  { clave: 'detalle', titulo: 'Detalle', multilinea: true, render: (a) => [a.motivo, a.ruta].filter(Boolean).join(' · ') || '—' },
]

const OPCIONES = (Object.keys(RESULTADO_ACCESO) as ResultadoAcceso[]).map((r) => ({ valor: r, texto: RESULTADO_ACCESO[r].texto }))

export default function AccesosPage() {
  usePaginaActual(TITULO, [MIGAS_CORE.usuariosRoles, { texto: TITULO }])
  const { filtros, establecer } = useFiltrosUrl({ resultado: '', page: '1' })
  const pagina = Math.max(1, Number(filtros.page) || 1)
  const consulta = useConsulta(
    JSON.stringify(filtros),
    (signal) => listarAccesos({ resultado: filtros.resultado as ResultadoAcceso | '', page: pagina }, signal),
    (datos) => datos.results.length === 0,
  )
  const estadoTabla =
    consulta.estado === 'cargando' ? (consulta.cargaVisible || !consulta.datos ? 'cargando' : 'exito') : consulta.estado

  return (
    <div className={estilos.pagina}>
      <p className={estilos.descripcion}>Lo que se registra aquí no se puede modificar ni borrar.</p>
      <form className={estilos.barraFiltros} aria-label="Filtrar accesos" onSubmit={(e) => e.preventDefault()}>
        <Selector
          id="accesos-resultado"
          etiqueta="Resultado"
          valor={filtros.resultado}
          opciones={OPCIONES}
          opcionTodos={OPCION_TODOS}
          onCambiar={(valor) => establecer({ resultado: valor || null, page: null })}
        />
      </form>
      <TablaDatos
        titulo={TITULO}
        columnas={COLUMNAS}
        filas={consulta.datos?.results ?? []}
        claveFila={(a) => String(a.id)}
        estado={estadoTabla === 'inactivo' ? 'cargando' : estadoTabla}
        paginacionServidor={{
          pagina,
          total: consulta.datos?.count ?? 0,
          porPagina: 25,
          onCambiarPagina: (nueva) => establecer({ page: nueva > 1 ? String(nueva) : null }),
        }}
        vacio={{ titulo: filtros.resultado ? 'Sin accesos con este resultado' : 'Aún no hay accesos registrados' }}
        error={{ titulo: 'No pudimos cargar el registro', descripcion: consulta.error?.detalle ?? '', onReintentar: consulta.reintentar }}
        compacta
      />
    </div>
  )
}
