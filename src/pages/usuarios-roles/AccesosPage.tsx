// RF-T-002 · Registro de accesos (CU-MOD01-007)
/**
 * Inicios de sesión correctos y fallidos, bloqueos, accesos denegados y rechazos por falta de permiso.
 * Solo se consulta: la base no admite modificarlo ni borrarlo (RI-35). Los filtros viven en la URL. El de usuario es
 * de texto para encontrar también los intentos de cuentas que no existen, que no tienen usuario asociado.
 */
import { useEffect, useRef, useState } from 'react'
import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Selector, { OPCION_TODOS } from '@/components/ui/Selector'
import Tarjeta from '@/components/ui/Tarjeta'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { useConsulta } from '@/hooks/useConsulta'
import { useDemora } from '@/hooks/useDemora'
import { useFiltrosUrl } from '@/hooks/useFiltrosUrl'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_CORE } from '@/router/rutasApp'
import { listarAccesos } from '@/services/api/core'
import type { Acceso, CanalAcceso, ResultadoAcceso } from '@/types/core'
import { CANAL_ACCESO, RESULTADO_ACCESO } from '@/utils/etiquetasCore'
import { formatearFechaHora } from '@/utils/formato'
import estilos from './UsuariosRoles.module.css'
import Estado from '@/components/ui/Estado'
import { TONO_ESTADO } from '@/components/ui/tonos'

const TITULO = 'Registro de accesos'

const COLUMNAS: ColumnaTabla<Acceso>[] = [
  { clave: 'fecha', titulo: 'Fecha', render: (a) => formatearFechaHora(a.fecha_hora) },
  { clave: 'usuario', titulo: 'Usuario', multilinea: true, render: (a) => a.usuario_nombre ?? a.identificador ?? '—' },
  {
    clave: 'resultado',
    titulo: 'Resultado',
    render: (a) => <Estado tono={TONO_ESTADO[RESULTADO_ACCESO[a.resultado].tono]} texto={RESULTADO_ACCESO[a.resultado].texto} />,
  },
  { clave: 'canal', titulo: 'Canal', render: (a) => CANAL_ACCESO[a.canal] },
  { clave: 'detalle', titulo: 'Detalle', multilinea: true, render: (a) => [a.motivo, a.ruta].filter(Boolean).join(' · ') || '—' },
]

const OPCIONES = (Object.keys(RESULTADO_ACCESO) as ResultadoAcceso[]).map((r) => ({ valor: r, texto: RESULTADO_ACCESO[r].texto }))
const OPCIONES_CANAL = (Object.keys(CANAL_ACCESO) as CanalAcceso[]).map((c) => ({ valor: c, texto: CANAL_ACCESO[c] }))

export default function AccesosPage() {
  usePaginaActual(TITULO, [MIGAS_CORE.usuariosRoles, { texto: TITULO }])
  const { filtros, establecer } = useFiltrosUrl({ resultado: '', canal: '', usuario: '', desde: '', hasta: '', page: '1' })
  const pagina = Math.max(1, Number(filtros.page) || 1)
  const hayFiltros = Boolean(filtros.resultado || filtros.canal || filtros.usuario || filtros.desde || filtros.hasta)

  // El texto se escribe en local y pasa a la URL 300 ms después de la última tecla: una petición por búsqueda.
  const [textoUsuario, setTextoUsuario] = useState(filtros.usuario)
  const usuarioDemorado = useDemora(textoUsuario.trim())
  const ultimoDemorado = useRef(usuarioDemorado)
  useEffect(() => {
    if (ultimoDemorado.current === usuarioDemorado) return
    ultimoDemorado.current = usuarioDemorado
    establecer({ usuario: usuarioDemorado || null, page: null })
  }, [usuarioDemorado, establecer])

  // Si la URL cambia por otra vía (atrás en el navegador), el campo la sigue.
  const [usuarioEnUrl, setUsuarioEnUrl] = useState(filtros.usuario)
  if (usuarioEnUrl !== filtros.usuario) {
    setUsuarioEnUrl(filtros.usuario)
    if (filtros.usuario !== usuarioDemorado) setTextoUsuario(filtros.usuario)
  }

  function limpiar() {
    setTextoUsuario('')
    establecer({ resultado: null, canal: null, usuario: null, desde: null, hasta: null, page: null })
  }

  const consulta = useConsulta(
    JSON.stringify(filtros),
    (signal) =>
      listarAccesos(
        {
          resultado: filtros.resultado as ResultadoAcceso | '',
          canal: filtros.canal as CanalAcceso | '',
          usuario: filtros.usuario,
          desde: filtros.desde,
          hasta: filtros.hasta,
          page: pagina,
        },
        signal,
      ),
    (datos) => datos.results.length === 0,
  )
  const estadoTabla =
    consulta.estado === 'cargando' ? (consulta.cargaVisible || !consulta.datos ? 'cargando' : 'exito') : consulta.estado

  return (
    <div className={estilos.pagina}>
      <p className={estilos.descripcion}>Lo que se registra aquí no se puede modificar ni borrar.</p>
      <Tarjeta>
        <form className={estilos.barraFiltros} aria-label="Filtrar accesos" onSubmit={(e) => e.preventDefault()}>
          <Selector
            id="accesos-resultado"
            etiqueta="Resultado"
            valor={filtros.resultado}
            opciones={OPCIONES}
            opcionTodos={OPCION_TODOS}
            onCambiar={(valor) => establecer({ resultado: valor || null, page: null })}
          />
          <CampoFormulario
            id="accesos-usuario"
            etiqueta="Usuario"
            type="search"
            placeholder="Nombre o correo"
            value={textoUsuario}
            onChange={(e) => setTextoUsuario(e.target.value)}
          />
          <Selector
            id="accesos-canal"
            etiqueta="Canal"
            valor={filtros.canal}
            opciones={OPCIONES_CANAL}
            opcionTodos={OPCION_TODOS}
            onCambiar={(valor) => establecer({ canal: valor || null, page: null })}
          />
          <CampoFormulario
            id="accesos-desde"
            etiqueta="Desde"
            type="date"
            value={filtros.desde}
            max={filtros.hasta || undefined}
            onChange={(e) => establecer({ desde: e.target.value || null, page: null })}
          />
          <CampoFormulario
            id="accesos-hasta"
            etiqueta="Hasta"
            type="date"
            value={filtros.hasta}
            min={filtros.desde || undefined}
            onChange={(e) => establecer({ hasta: e.target.value || null, page: null })}
          />
          {hayFiltros && (
            <Boton variante="fantasma" onClick={limpiar}>
              Limpiar filtros
            </Boton>
          )}
        </form>
      </Tarjeta>
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
        vacio={{ titulo: hayFiltros ? 'Sin accesos con estos filtros' : 'Aún no hay accesos registrados' }}
        error={{ titulo: 'No pudimos cargar el registro', descripcion: consulta.error?.detalle ?? '', onReintentar: consulta.reintentar }}
        compacta
      />
    </div>
  )
}
