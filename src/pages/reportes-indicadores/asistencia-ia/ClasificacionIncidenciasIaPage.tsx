// RF-IA-005 · HU-MOD06-007 · CU-MOD06-007 · RN-IA-001 · RN-019
/**
 * Clasificación de incidencias con IA (patrón «Página de listado» del sistema de diseño). La IA solo sugiere categoría,
 * prioridad y tipo de atención: nada se registra hasta validarlo, y la incidencia nunca se deriva desde aquí.
 *
 * - «Pendientes de evaluar»: incidencias registradas sin clasificar, con «Analizar con IA» por fila (roles que pueden
 *   solicitar a la IA). Si la IA no está disponible (E1), se ofrece «Clasificar manualmente».
 * - «Análisis realizados»: sugerencias pendientes de revisión, clasificadas o descartadas.
 * - `?incidencia_id=` muestra esa incidencia con sus acciones, para que la gestión de incidencias (MOD-03) enlace aquí.
 * - La pestaña y la página van en la URL. En móvil, cada fila es una tarjeta.
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
import { puede, PERMISO_SOLICITAR_IA } from '@/config/permisos'
import { useConsulta } from '@/hooks/useConsulta'
import { useFiltrosUrl } from '@/hooks/useFiltrosUrl'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS, rutaRevisionClasificacion } from '@/router/rutasApp'
import { aErrorApi } from '@/services/api/cliente'
import { listarClasificaciones, listarIncidenciasPendientes, solicitarClasificacion } from '@/services/api/clasificacionIncidenciaIa'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { IncidenciaResumen, SugerenciaClasificacion } from '@/types/clasificacionIncidenciaIa'
import { estadoClasificacion, insigniaSeveridad, resumenCorto } from '@/utils/clasificacionIncidenciaIa'
import { formatearFechaHora, SIN_VALOR } from '@/utils/formato'
import { enteroPositivo } from '@/utils/reportesGestion'
import estilos from '../reportes/Reportes.module.css'
import estilosClasificacion from './clasificacion/Clasificacion.module.css'
import DialogoClasificacionManual from './clasificacion/DialogoClasificacionManual'
import type { EstadoNavegacionRevision } from './ExtraccionReporteProveedorPage'

const TITULO = 'Clasificación de incidencias'
const POR_PAGINA = 25

type Pestana = 'pendientes' | 'analisis'
const PESTANAS: { valor: Pestana; texto: string }[] = [
  { valor: 'pendientes', texto: 'Pendientes de evaluar' },
  { valor: 'analisis', texto: 'Análisis realizados' },
]

const valoresDe = (s: SugerenciaClasificacion) => s.contenido.decision?.valores_registrados ?? s.contenido.sugerencia
const celdaIncidencia = (i: IncidenciaResumen) => <CeldaDobleLinea principal={i.codigo} detalle={i.tipo_evento} codigo />

const COLUMNAS_ANALISIS: ColumnaTabla<SugerenciaClasificacion>[] = [
  { clave: 'incidencia', titulo: 'Incidencia', render: (s) => celdaIncidencia(s.contenido.incidencia) },
  { clave: 'fecha_creacion', titulo: 'Analizada', render: (s) => <CeldaTexto texto={formatearFechaHora(s.fecha_creacion)} tono="secundario" /> },
  {
    clave: 'prioridad',
    titulo: 'Prioridad',
    render: (s) => {
      const severidad = valoresDe(s)?.severidad
      return severidad ? <Estado {...insigniaSeveridad(severidad)} /> : <CeldaTexto texto={SIN_VALOR} tono="deshabilitado" />
    },
  },
  { clave: 'resultado', titulo: 'Resultado', render: (s) => <CeldaTexto texto={resumenCorto(valoresDe(s))} /> },
  { clave: 'estado', titulo: 'Estado', render: (s) => <Estado {...estadoClasificacion(s.estado)} /> },
]

export default function ClasificacionIncidenciasIaPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.asistenciaIa, { texto: TITULO }])
  const navigate = useNavigate()
  const location = useLocation()
  const permisos = usePermisos()
  const puedeSolicitar = puede(permisos, PERMISO_SOLICITAR_IA)
  const esMovil = useEsMovil()

  const { filtros, establecer } = useFiltrosUrl({ vista: 'pendientes', page: '1', incidencia_id: '' })
  const pagina = Math.max(1, Number(filtros.page) || 1)
  const vista: Pestana = filtros.vista === 'analisis' ? 'analisis' : 'pendientes'
  const incidenciaUrl = enteroPositivo(filtros.incidencia_id) ?? null
  const [analizando, setAnalizando] = useState<number | null>(null)
  const [errorIa, setErrorIa] = useState<{ incidencia: IncidenciaResumen; texto: string; sinIa: boolean } | null>(null)
  const [manual, setManual] = useState<{ id: number; codigo: string } | null>(null)

  const pendientes = useConsulta(vista === 'pendientes' ? `clasif-pendientes|${pagina}` : null, (signal) => listarIncidenciasPendientes({ page: pagina }, signal))
  const analisis = useConsulta(vista === 'analisis' ? `clasif-analisis|${pagina}` : null, (signal) => listarClasificaciones({ page: pagina }, signal))
  const recuentos = useConsulta('clasif-recuentos', (signal) =>
    Promise.all([listarIncidenciasPendientes({}, signal), listarClasificaciones({}, signal)]).then((r) => r.map((p) => p.count)),
  )
  // La incidencia del enlace profundo (solo si sigue pendiente).
  const enlazada = useConsulta(incidenciaUrl !== null ? `clasif-enlazada|${incidenciaUrl}` : null, (signal) =>
    listarIncidenciasPendientes({ q: String(incidenciaUrl) }, signal).then((r) => r.results.find((i) => i.id === incidenciaUrl) ?? null),
  )

  const consulta = vista === 'pendientes' ? pendientes : analisis
  const total = consulta.datos?.count ?? 0
  let estadoTabla: EstadoTabla | null = null
  if (consulta.estado === 'error') estadoTabla = 'error'
  else if (consulta.estado === 'cargando' && (consulta.cargaVisible || !consulta.datos)) estadoTabla = consulta.cargaVisible ? 'cargando' : null
  else if (consulta.datos) estadoTabla = consulta.datos.count === 0 ? 'vacio' : 'exito'

  function abrir(s: SugerenciaClasificacion, aviso?: string) {
    const navegacion: EstadoNavegacionRevision = { aviso, volverA: location.search }
    navigate(rutaRevisionClasificacion(s.id), { state: navegacion })
  }

  async function analizar(incidencia: IncidenciaResumen) {
    if (analizando !== null) return
    setAnalizando(incidencia.id)
    setErrorIa(null)
    try {
      abrir(await solicitarClasificacion(incidencia.id), 'Análisis generado: pendiente de revisión')
    } catch (causa) {
      const error = aErrorApi(causa)
      setErrorIa({ incidencia, texto: error.detalle, sinIa: error.estado === 503 })
    } finally {
      setAnalizando(null)
    }
  }

  const botonAnalizar = (i: IncidenciaResumen, variante: 'fantasma' | 'secundario' = 'fantasma') => (
    <Boton variante={variante} icono="destello" cargando={analizando === i.id} deshabilitado={analizando !== null && analizando !== i.id} onClick={() => void analizar(i)}>
      Analizar con IA
    </Boton>
  )

  const columnasPendientes: ColumnaTabla<IncidenciaResumen>[] = [
    { clave: 'incidencia', titulo: 'Incidencia', render: celdaIncidencia },
    { clave: 'descripcion', titulo: 'Descripción', multilinea: true, render: (i) => <CeldaTexto texto={i.descripcion} /> },
    { clave: 'espacio', titulo: 'Espacio', render: (i) => <CeldaTexto texto={i.espacio ?? SIN_VALOR} tono={i.espacio ? 'principal' : 'deshabilitado'} /> },
    { clave: 'fecha_recepcion', titulo: 'Recibida', render: (i) => <CeldaTexto texto={formatearFechaHora(i.fecha_recepcion)} tono="secundario" /> },
    ...(puedeSolicitar ? [{ clave: 'accion', titulo: 'Acción', render: (i: IncidenciaResumen) => botonAnalizar(i) }] : []),
  ]

  const cambiarPagina = (nueva: number) => establecer({ page: nueva > 1 ? String(nueva) : null })
  const errorTabla = consulta.error
    ? { titulo: vista === 'pendientes' ? 'No se pudieron cargar las incidencias' : 'No se pudieron cargar los análisis', descripcion: consulta.error.detalle, onReintentar: consulta.reintentar }
    : undefined
  const paginacion = { pagina, total, porPagina: POR_PAGINA, onCambiarPagina: cambiarPagina }

  let contenido
  if (consulta.error?.estado === 403) {
    contenido = <EstadoSinAcceso nivel={3} descripcion={consulta.error.detalle} />
  } else if (esMovil && estadoTabla === 'exito') {
    contenido = (
      <div className={estilosClasificacion.pila}>
        {vista === 'pendientes'
          ? pendientes.datos?.results.map((i) => (
              <Tarjeta key={i.id} titulo={i.codigo} nivel={3} descripcion={i.tipo_evento}>
                <p>{i.descripcion}</p>
                <p className={estilosClasificacion.secundario}>{[i.espacio, formatearFechaHora(i.fecha_recepcion)].filter(Boolean).join(' · ')}</p>
                {puedeSolicitar && botonAnalizar(i, 'secundario')}
              </Tarjeta>
            ))
          : analisis.datos?.results.map((s) => (
              <Tarjeta key={s.id} titulo={s.contenido.incidencia.codigo} nivel={3} descripcion={s.contenido.incidencia.tipo_evento} acciones={<Estado {...estadoClasificacion(s.estado)} />}>
                <p>{resumenCorto(valoresDe(s))}</p>
                <p className={estilosClasificacion.secundario}>{formatearFechaHora(s.fecha_creacion)}</p>
                <BotonEnlace to={rutaRevisionClasificacion(s.id)} state={{ volverA: location.search }} variante="secundario">
                  {s.estado === 'Propuesta' ? 'Revisar' : 'Ver'}
                </BotonEnlace>
              </Tarjeta>
            ))}
        {total > POR_PAGINA && <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} onCambiar={cambiarPagina} />}
      </div>
    )
  } else if (estadoTabla && vista === 'pendientes') {
    contenido = (
      <TablaDatos
        titulo="Incidencias pendientes de evaluar"
        columnas={columnasPendientes}
        filas={pendientes.datos?.results ?? []}
        claveFila={(i) => String(i.id)}
        estado={estadoTabla}
        paginacionServidor={paginacion}
        vacio={{ titulo: 'No hay incidencias pendientes de evaluar', descripcion: 'Todas las incidencias registradas están clasificadas.', nivel: 3 }}
        error={errorTabla}
      />
    )
  } else if (estadoTabla) {
    contenido = (
      <TablaDatos
        titulo="Análisis realizados"
        columnas={COLUMNAS_ANALISIS}
        filas={analisis.datos?.results ?? []}
        claveFila={(s) => String(s.id)}
        estado={estadoTabla}
        onFilaClick={(s) => abrir(s)}
        paginacionServidor={paginacion}
        vacio={{ titulo: 'Aún no hay análisis', descripcion: puedeSolicitar ? 'Analiza una incidencia desde «Pendientes de evaluar».' : undefined, nivel: 3 }}
        error={errorTabla}
      />
    )
  }

  const incidenciaEnlazada = enlazada.datos ?? null
  return (
    <div className={estilos.pagina}>
      <AvisoDatosSimulados />
      <AvisoEnLinea tono="info" titulo="Sugerencias generadas con IA">
        La IA sugiere la categoría, la prioridad y el tipo de atención de cada incidencia. Solo se registra lo que valides, y la
        incidencia no se deriva automáticamente.
      </AvisoEnLinea>

      {incidenciaUrl !== null && enlazada.estado !== 'cargando' && (
        <Tarjeta
          titulo={incidenciaEnlazada ? `${incidenciaEnlazada.codigo} · ${incidenciaEnlazada.tipo_evento}` : `Incidencia n.º ${incidenciaUrl}`}
          nivel={2}
          descripcion={incidenciaEnlazada ? incidenciaEnlazada.descripcion : 'Ya está clasificada o no está disponible. Búscala en «Análisis realizados».'}
          acciones={
            incidenciaEnlazada && puedeSolicitar ? (
              <span className={estilosClasificacion.acciones}>
                {botonAnalizar(incidenciaEnlazada, 'secundario')}
                <Boton variante="fantasma" onClick={() => setManual({ id: incidenciaEnlazada.id, codigo: incidenciaEnlazada.codigo })}>
                  Clasificar manualmente
                </Boton>
              </span>
            ) : undefined
          }
        />
      )}

      {errorIa && (
        <AvisoEnLinea
          tono={errorIa.sinIa ? 'advertencia' : 'error'}
          titulo={errorIa.sinIa ? 'La IA no está disponible' : `No se pudo analizar ${errorIa.incidencia.codigo}`}
          accion={{ texto: 'Clasificar manualmente', onClick: () => setManual({ id: errorIa.incidencia.id, codigo: errorIa.incidencia.codigo }) }}
        >
          {errorIa.sinIa ? `Puedes clasificar ${errorIa.incidencia.codigo} sin sugerencia de la IA.` : errorIa.texto}
        </AvisoEnLinea>
      )}

      <Pestanas
        etiqueta="Estado del análisis"
        valor={vista}
        onCambiar={(valor) => establecer({ vista: valor === 'pendientes' ? null : valor, page: null })}
        pestanas={PESTANAS.map((p, i) => ({ valor: p.valor, texto: p.texto, contador: recuentos.datos?.[i] }))}
      >
        {contenido}
      </Pestanas>

      <DialogoClasificacionManual
        incidencia={manual}
        onCerrar={() => setManual(null)}
        onRegistrada={(s) => {
          setManual(null)
          setErrorIa(null)
          abrir(s, 'Clasificación registrada sin sugerencia de la IA')
        }}
      />
    </div>
  )
}
