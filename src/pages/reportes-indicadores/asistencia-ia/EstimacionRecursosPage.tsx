// RF-IA-004 · HU-MOD06-006 · CU-MOD06-006 · CP-TR-MOD06-006 · RN-IA-001
/**
 * Estimación de recursos: lista de estimaciones de operarios, duración e insumos (patrón «Página de listado» del
 * sistema de diseño). La IA solo propone una referencia: nada se registra como planificación hasta confirmarlo.
 *
 * - «Nueva estimación» (solo los roles que pueden solicitar a la IA) y «Registrar recursos sin IA» (E1 y A1).
 * - `?actividad_id=` abre la nueva estimación con esa actividad, para que Operación de campo enlace desde su detalle.
 * - El estado y la página van en la URL. En móvil, cada estimación es una tarjeta.
 */
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import { useEsMovil } from '@/components/reportes-indicadores/useEsMovil'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import { CeldaDobleLinea, CeldaTexto } from '@/components/ui/CeldasTabla'
import Estado from '@/components/ui/Estado'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import Paginacion from '@/components/ui/Paginacion'
import Pestanas from '@/components/ui/Pestanas'
import TablaDatos, { type ColumnaTabla, type EstadoTabla } from '@/components/ui/TablaDatos'
import Tarjeta from '@/components/ui/Tarjeta'
import { puede, ROLES_SOLICITAR_IA } from '@/config/permisos'
import { useConsulta } from '@/hooks/useConsulta'
import { useFiltrosUrl } from '@/hooks/useFiltrosUrl'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS, rutaRevisionEstimacion } from '@/router/rutasApp'
import { listarEstimaciones } from '@/services/api/estimacionIa'
import { useRolActual } from '@/sesion/ContextoSesion'
import type { SolicitudEstimacion, SugerenciaEstimacion } from '@/types/estimacionIa'
import type { EstadoSugerencia } from '@/types/ia'
import { estadoEstimacion, resumenEstimacion } from '@/utils/estimacionIa'
import { formatearFechaHora, SIN_VALOR } from '@/utils/formato'
import { enteroPositivo } from '@/utils/reportesGestion'
import estilos from '../reportes/Reportes.module.css'
import DialogoNuevaEstimacion from './estimacion/DialogoNuevaEstimacion'
import DialogoRecursosManual from './estimacion/DialogoRecursosManual'
import estilosEstimacion from './estimacion/Estimacion.module.css'
import type { EstadoNavegacionRevision } from './ExtraccionReporteProveedorPage'

const TITULO = 'Estimación de recursos'
const POR_PAGINA = 25

const PESTANAS: { valor: 'todas' | EstadoSugerencia; texto: string }[] = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'Propuesta', texto: 'Pendientes' },
  { valor: 'Validada', texto: 'Confirmadas' },
  { valor: 'Rechazada', texto: 'Descartadas' },
]

const actividadDe = (s: SugerenciaEstimacion) =>
  s.contenido.actividad
    ? { principal: s.contenido.actividad.codigo, detalle: s.contenido.actividad.tipo_actividad, espacio: s.contenido.actividad.espacio }
    : { principal: 'Actividad descrita', detalle: s.contenido.descripcion?.nota ?? 'Sin actividad registrada', espacio: null }

const COLUMNAS: ColumnaTabla<SugerenciaEstimacion>[] = [
  {
    clave: 'actividad',
    titulo: 'Actividad',
    render: (s) => {
      const a = actividadDe(s)
      return <CeldaDobleLinea principal={a.principal} detalle={a.detalle} codigo={Boolean(s.contenido.actividad)} />
    },
  },
  { clave: 'espacio', titulo: 'Espacio', render: (s) => <CeldaTexto texto={actividadDe(s).espacio ?? SIN_VALOR} tono={actividadDe(s).espacio ? 'principal' : 'deshabilitado'} /> },
  { clave: 'fecha_creacion', titulo: 'Fecha', render: (s) => <CeldaTexto texto={formatearFechaHora(s.fecha_creacion)} tono="secundario" /> },
  { clave: 'resultado', titulo: 'Resultado', render: (s) => <CeldaTexto texto={resumenEstimacion(s.contenido)} /> },
  { clave: 'estado', titulo: 'Estado', render: (s) => <Estado {...estadoEstimacion(s.estado)} /> },
]

export default function EstimacionRecursosPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.asistenciaIa, { texto: TITULO }])
  const navigate = useNavigate()
  const location = useLocation()
  const rol = useRolActual()
  const puedeSolicitar = rol !== null && puede(rol, ROLES_SOLICITAR_IA)
  const esMovil = useEsMovil()

  const { filtros, establecer } = useFiltrosUrl({ estado: 'todas', page: '1', actividad_id: '' })
  const pagina = Math.max(1, Number(filtros.page) || 1)
  const estado = PESTANAS.find((p) => p.valor === filtros.estado)?.valor ?? 'todas'
  const actividadUrl = enteroPositivo(filtros.actividad_id) ?? null
  const [dialogoAbierto, setDialogoAbierto] = useState(actividadUrl !== null)
  const [manual, setManual] = useState<{ solicitud: SolicitudEstimacion; texto: string } | null>(null)

  const consulta = useConsulta(`estimaciones|${estado}|${pagina}`, (signal) =>
    listarEstimaciones({ estado: estado === 'todas' ? undefined : estado, page: pagina }, signal),
  )
  const recuentos = useConsulta('estimaciones-recuentos', (signal) =>
    Promise.all(PESTANAS.map((p) => listarEstimaciones({ estado: p.valor === 'todas' ? undefined : p.valor }, signal))).then((r) =>
      r.map((p) => p.count),
    ),
  )
  const estimaciones = consulta.datos?.results ?? []
  const total = consulta.datos?.count ?? 0

  let estadoTabla: EstadoTabla | null = null
  if (consulta.estado === 'error') estadoTabla = 'error'
  else if (consulta.estado === 'cargando' && (consulta.cargaVisible || !consulta.datos)) estadoTabla = consulta.cargaVisible ? 'cargando' : null
  else if (consulta.datos) estadoTabla = consulta.datos.count === 0 ? 'vacio' : 'exito'

  function abrir(s: SugerenciaEstimacion, aviso?: string) {
    const navegacion: EstadoNavegacionRevision = { aviso, volverA: location.search }
    navigate(rutaRevisionEstimacion(s.id), { state: navegacion })
  }

  const cambiarPagina = (nueva: number) => establecer({ page: nueva > 1 ? String(nueva) : null })
  const vacio = {
    titulo: estado === 'todas' ? 'Aún no hay estimaciones' : 'No hay estimaciones en este estado',
    descripcion: puedeSolicitar ? 'Solicita una con «Nueva estimación».' : undefined,
    nivel: 3 as const,
  }

  let contenido
  if (consulta.error?.estado === 403) {
    contenido = <EstadoSinAcceso nivel={3} descripcion={consulta.error.detalle} />
  } else if (esMovil && estadoTabla === 'exito') {
    contenido = (
      <div className={estilosEstimacion.pila}>
        {estimaciones.map((s) => {
          const a = actividadDe(s)
          return (
            <Tarjeta key={s.id} titulo={a.principal} nivel={3} descripcion={a.detalle} acciones={<Estado {...estadoEstimacion(s.estado)} />}>
              <p>{resumenEstimacion(s.contenido)}</p>
              <p className={estilosEstimacion.secundario}>
                {[a.espacio, formatearFechaHora(s.fecha_creacion)].filter(Boolean).join(' · ')}
              </p>
              <BotonEnlace to={rutaRevisionEstimacion(s.id)} state={{ volverA: location.search }} variante="secundario">
                {s.estado === 'Propuesta' ? 'Revisar' : 'Ver'}
              </BotonEnlace>
            </Tarjeta>
          )
        })}
        {total > POR_PAGINA && <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} onCambiar={cambiarPagina} />}
      </div>
    )
  } else if (estadoTabla) {
    contenido = (
      <TablaDatos
        titulo="Estimaciones"
        columnas={COLUMNAS}
        filas={estimaciones}
        claveFila={(s) => String(s.id)}
        estado={estadoTabla}
        onFilaClick={(s) => abrir(s)}
        paginacionServidor={{ pagina, total, porPagina: POR_PAGINA, onCambiarPagina: cambiarPagina }}
        vacio={vacio}
        error={consulta.error ? { titulo: 'No se pudieron cargar las estimaciones', descripcion: consulta.error.detalle, onReintentar: consulta.reintentar } : undefined}
      />
    )
  }

  return (
    <div className={estilos.pagina}>
      {puedeSolicitar && (
        <AccionesPagina>
          <Boton variante="primario" icono="plus" onClick={() => setDialogoAbierto(true)}>
            Nueva estimación
          </Boton>
        </AccionesPagina>
      )}
      <AvisoDatosSimulados />
      <AvisoEnLinea tono="info" titulo="Referencias generadas con IA">
        La IA estima operarios, duración e insumos a partir de actividades comparables. Solo se registra lo que confirmes, y la
        estimación se conserva para compararla con lo real.
      </AvisoEnLinea>

      <Pestanas
        etiqueta="Estado de la estimación"
        valor={estado}
        onCambiar={(valor) => establecer({ estado: valor === 'todas' ? null : valor, page: null })}
        pestanas={PESTANAS.map((p, i) => ({ valor: p.valor, texto: p.texto, contador: recuentos.datos?.[i] }))}
      >
        {contenido}
      </Pestanas>

      <DialogoNuevaEstimacion
        abierto={dialogoAbierto}
        actividadInicialId={actividadUrl}
        onCerrar={() => {
          setDialogoAbierto(false)
          if (actividadUrl !== null) establecer({ actividad_id: null })
        }}
        onCreada={(s) => {
          setDialogoAbierto(false)
          abrir(s, 'Estimación generada: pendiente de revisión')
        }}
        onManual={(contexto) => {
          setDialogoAbierto(false)
          setManual(contexto)
        }}
      />
      <DialogoRecursosManual
        contexto={manual}
        onCerrar={() => setManual(null)}
        onRegistrado={(s) => {
          setManual(null)
          abrir(s, 'Recursos registrados sin recomendación de la IA')
        }}
      />
    </div>
  )
}
