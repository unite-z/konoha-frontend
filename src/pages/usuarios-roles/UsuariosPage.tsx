// RF-T-002 · Lista de cuentas (HU-MOD01-008, CU-MOD01-007)
/**
 * Cuentas con rol, estado, vigencia y último acceso, con filtros en la URL y destacados: sin uso,
 * vigencia que vence pronto y varios rechazos. Solo el jefe de sección (la ruta y la API lo exigen).
 */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import Badge from '../../components/ui/Badge'
import Boton, { BotonEnlace } from '../../components/ui/Boton'
import Selector, { OPCION_TODOS } from '../../components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '../../components/ui/TablaDatos'
import { useConsulta } from '../../hooks/useConsulta'
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_CORE, RUTAS_CORE, rutaDetalleUsuario } from '../../router/rutasApp'
import { listarUsuarios } from '../../services/api/core'
import type { CodigoRol, UsuarioConContrasena, UsuarioResumen } from '../../types/core'
import { DESTACADO, ESTADO_CUENTA, NOMBRE_ROL, ROLES_ASIGNABLES } from '../../utils/etiquetasCore'
import { formatearFecha, formatearFechaHora, formatearNumero } from '../../utils/formato'
import DialogoContrasenaTemporal from './DialogoContrasenaTemporal'
import DialogoCuenta from './DialogoCuenta'
import estilos from './UsuariosRoles.module.css'

const TITULO = 'Usuarios'
const POR_PAGINA = 25

const COLUMNAS: ColumnaTabla<UsuarioResumen>[] = [
  {
    clave: 'nombre',
    titulo: 'Persona',
    multilinea: true,
    render: (u) => (
      <span className={estilos.persona}>
        <span>{u.nombre}</span>
        <span className={estilos.ayuda}>{u.correo ?? 'Sin correo (cuenta migrada)'}</span>
      </span>
    ),
  },
  { clave: 'rol', titulo: 'Rol', render: (u) => u.rol_nombre },
  { clave: 'estado', titulo: 'Estado', render: (u) => <Badge tono={ESTADO_CUENTA[u.estado].tono} texto={ESTADO_CUENTA[u.estado].texto} /> },
  { clave: 'vigencia', titulo: 'Vigencia', render: (u) => (u.fecha_fin_vigencia ? `Hasta ${formatearFecha(u.fecha_fin_vigencia)}` : 'Sin fin') },
  { clave: 'acceso', titulo: 'Último acceso', render: (u) => (u.ultimo_acceso ? formatearFechaHora(u.ultimo_acceso) : 'Nunca') },
  {
    clave: 'destacados',
    titulo: 'Atención',
    render: (u) => (
      <span className={estilos.badges}>
        {u.destacados.map((d) => (
          <Badge key={d} tono="advertencia" texto={DESTACADO[d].texto} ayuda={DESTACADO[d].ayuda} />
        ))}
      </span>
    ),
  },
]

const OPCIONES_ROL = ROLES_ASIGNABLES.map((rol) => ({ valor: rol, texto: NOMBRE_ROL[rol] }))
const OPCIONES_ESTADO = (Object.keys(ESTADO_CUENTA) as (keyof typeof ESTADO_CUENTA)[]).map((e) => ({
  valor: e,
  texto: ESTADO_CUENTA[e].texto,
}))

export default function UsuariosPage() {
  usePaginaActual(TITULO, [MIGAS_CORE.usuariosRoles, { texto: TITULO }])
  const navegar = useNavigate()
  const { filtros, establecer } = useFiltrosUrl({ rol: '', estado: '', vigencia: '', page: '1' })
  const pagina = Math.max(1, Number(filtros.page) || 1)
  const [alta, setAlta] = useState(false)
  const [creada, setCreada] = useState<UsuarioConContrasena | null>(null)

  const consulta = useConsulta(
    JSON.stringify(filtros),
    (signal) =>
      listarUsuarios(
        { rol: filtros.rol as CodigoRol | '', estado: filtros.estado, vigencia_proxima: filtros.vigencia === 'si', page: pagina },
        signal,
      ),
    (datos) => datos.results.length === 0,
  )
  const total = consulta.datos?.count ?? 0
  const conFiltros = Boolean(filtros.rol || filtros.estado || filtros.vigencia)
  const estadoTabla =
    consulta.estado === 'cargando' ? (consulta.cargaVisible || !consulta.datos ? 'cargando' : 'exito') : consulta.estado

  function limpiar() {
    establecer({ rol: null, estado: null, vigencia: null, page: null })
  }

  return (
    <div className={estilos.pagina}>
      <div className={estilos.barraAcciones}>
        <p className={estilos.descripcion}>Quién tiene acceso al sistema, con qué rol y cuándo entró por última vez.</p>
        <div className={estilos.acciones}>
          <BotonEnlace to={RUTAS_CORE.accesos} variante="secundario">
            Registro de accesos
          </BotonEnlace>
          <Boton onClick={() => setAlta(true)}>Nueva cuenta</Boton>
        </div>
      </div>

      <form className={estilos.barraFiltros} aria-label="Filtrar cuentas" onSubmit={(e) => e.preventDefault()}>
        <Selector
          id="usuarios-rol"
          etiqueta="Rol"
          valor={filtros.rol}
          opciones={OPCIONES_ROL}
          opcionTodos={OPCION_TODOS}
          onCambiar={(valor) => establecer({ rol: valor || null, page: null })}
        />
        <Selector
          id="usuarios-estado"
          etiqueta="Estado"
          valor={filtros.estado}
          opciones={OPCIONES_ESTADO}
          opcionTodos={OPCION_TODOS}
          onCambiar={(valor) => establecer({ estado: valor || null, page: null })}
        />
        <Selector
          id="usuarios-vigencia"
          etiqueta="Vigencia"
          valor={filtros.vigencia}
          opciones={[{ valor: 'si', texto: 'Vence en los próximos 7 días' }]}
          opcionTodos={OPCION_TODOS}
          onCambiar={(valor) => establecer({ vigencia: valor || null, page: null })}
        />
      </form>

      <p className={`${estilos.resumenResultados} cifra`} aria-live="polite">
        {consulta.estado === 'exito' || consulta.estado === 'vacio'
          ? `${formatearNumero(total)} ${total === 1 ? 'cuenta' : 'cuentas'}${conFiltros ? ' con estos filtros' : ''}`
          : ''}
      </p>

      <TablaDatos
        titulo="Cuentas"
        columnas={COLUMNAS}
        filas={consulta.datos?.results ?? []}
        claveFila={(u) => String(u.id)}
        estado={estadoTabla === 'inactivo' ? 'cargando' : estadoTabla}
        onFilaClick={(u) => navegar(rutaDetalleUsuario(u.id))}
        paginacionServidor={{
          pagina,
          total,
          porPagina: POR_PAGINA,
          onCambiarPagina: (nueva) => establecer({ page: nueva > 1 ? String(nueva) : null }),
        }}
        vacio={
          conFiltros
            ? {
                titulo: 'Sin cuentas con estos filtros',
                accion: (
                  <Boton variante="secundario" onClick={limpiar}>
                    Limpiar filtros
                  </Boton>
                ),
              }
            : { titulo: 'Aún no hay cuentas', descripcion: 'Crea la primera con «Nueva cuenta».' }
        }
        error={{
          titulo: 'No pudimos cargar las cuentas',
          descripcion: consulta.error?.detalle ?? '',
          onReintentar: consulta.reintentar,
        }}
      />

      {alta && (
        <DialogoCuenta
          onCerrar={() => setAlta(false)}
          onCreada={(resultado) => {
            setAlta(false)
            setCreada(resultado)
            consulta.reintentar()
          }}
          onCuentaExistente={(id) => {
            setAlta(false)
            navegar(rutaDetalleUsuario(id), { state: { aviso: 'Esta cuenta ya existe y está inactiva. Puedes reactivarla.' } })
          }}
        />
      )}
      {creada && <DialogoContrasenaTemporal resultado={creada} onCerrar={() => setCreada(null)} />}
    </div>
  )
}
