// RN-IA-002 · HU-MOD06-013 · CP-TR-MOD06-013 · RN-IA-001
/**
 * Prioridades de atención: bandeja de propuestas de prioridad de la IA (mismo patrón que la extracción RF-IA-001).
 *
 * - La IA solo propone prioridades para espacios (áreas y jardines) y ejemplares: nada se incorpora a la
 *   programación sin la validación del jefe de sección.
 * - «Solicitar priorización» solo se muestra a los roles que pueden solicitar a la IA (ROLES_SOLICITAR_IA).
 * - El estado elegido y la página van en la URL, para conservarlos al volver desde la revisión.
 * - En móvil, cada propuesta es una ficha.
 */
// Excepción al sistema (AV-351): la ficha móvil de cada propuesta es un <button> que la abre entera; no tiene el aspecto de Boton.
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import AvisoDatosSimulados from '../../../components/reportes-indicadores/AvisoDatosSimulados'
import { useEsMovil } from '../../../components/reportes-indicadores/useEsMovil'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Pestanas from '../../../components/ui/Pestanas'
import Boton from '../../../components/ui/Boton'
import TablaDatos, { type ColumnaTabla, type EstadoTabla } from '../../../components/ui/TablaDatos'
import { puede, ROLES_SOLICITAR_IA } from '../../../config/permisos'
import { useConsulta } from '../../../hooks/useConsulta'
import { useFiltrosUrl } from '../../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import AccionesPagina from '../../../layouts/LayoutOficina/AccionesPagina'
import { MIGAS, rutaRevisionPriorizacion } from '../../../router/rutasApp'
import { listarPriorizaciones } from '../../../services/api/priorizacionIa'
import { useRolActual } from '../../../sesion/ContextoSesion'
import type { EstadoSugerencia } from '../../../types/ia'
import type { SugerenciaPriorizacion } from '../../../types/priorizacionIa'
import { insigniaSuficiencia, insigniaSugerencia } from '../../../utils/estados'
import { formatearFechaHora, formatearNumero } from '../../../utils/formato'
import { contarPrioridades, insigniaPrioridad, PRIORIDADES, textoAlcance } from '../../../utils/priorizacionIa'
import estilos from '../reportes/Reportes.module.css'
import estilosIa from './AsistenciaIa.module.css'
import type { EstadoNavegacionRevision } from './ExtraccionReporteProveedorPage'
import DialogoSolicitudPriorizacion from './priorizacion/DialogoSolicitudPriorizacion'
import estilosPriorizacion from './priorizacion/Priorizacion.module.css'
import Estado from '../../../components/ui/Estado'
import { insigniaAEstado } from '../../../components/ui/tonos'

const TITULO = 'Prioridades de atención'
const POR_PAGINA = 25

const OPCIONES_ESTADO: { valor: '' | EstadoSugerencia; texto: string }[] = [
  { valor: '', texto: 'Todas' },
  { valor: 'Propuesta', texto: 'Pendientes de revisión' },
  { valor: 'Validada', texto: 'Validadas' },
  { valor: 'Rechazada', texto: 'Rechazadas' },
]

/** «4 altas · 5 medias · 3 bajas» con insignias (nunca solo color). */
function ResumenPrioridades({ propuesta }: { propuesta: SugerenciaPriorizacion }) {
  const cuenta = contarPrioridades(propuesta.contenido.elementos)
  return (
    <span className={estilosPriorizacion.resumenPrioridades}>
      {PRIORIDADES.filter((p) => cuenta[p] > 0).map((p) => (
        <Estado key={p} {...insigniaAEstado(insigniaPrioridad(p))} texto={`${formatearNumero(cuenta[p])} ${p.toLowerCase()}${cuenta[p] === 1 ? '' : 's'}`} />
      ))}
    </span>
  )
}

const alcanceDe = (s: SugerenciaPriorizacion) => textoAlcance(s.contenido.entrada.alcance, s.contenido.entrada.horizonte_dias)

const COLUMNAS: ColumnaTabla<SugerenciaPriorizacion>[] = [
  {
    clave: 'fecha_creacion',
    titulo: 'Solicitada',
    render: (s) => (
      <span className={estilosIa.celdaAtencion}>
        <span className="cifra">n.º {s.id}</span>
        <span className={estilosIa.metaAtencion}>{formatearFechaHora(s.fecha_creacion)}</span>
      </span>
    ),
  },
  { clave: 'alcance', titulo: 'Alcance', multilinea: true, render: alcanceDe },
  { clave: 'elementos', titulo: 'Elementos', alineacion: 'derecha', render: (s) => formatearNumero(s.contenido.elementos.length) },
  { clave: 'prioridades', titulo: 'Prioridades sugeridas', render: (s) => <ResumenPrioridades propuesta={s} /> },
  { clave: 'suficiencia', titulo: 'Datos', render: (s) => <Estado {...insigniaAEstado(insigniaSuficiencia(s.contenido.suficiencia))} /> },
  { clave: 'estado', titulo: 'Estado', render: (s) => <Estado {...insigniaAEstado(insigniaSugerencia(s.estado, s.etiqueta_estado))} /> },
]

function FichaPropuesta({ propuesta: s, onAbrir }: { propuesta: SugerenciaPriorizacion; onAbrir: () => void }) {
  return (
    <li>
      <button type="button" className={estilosIa.ficha} onClick={onAbrir}>
        <span className={estilosIa.cabeceraFicha}>
          <span className={estilosIa.codigoAtencion}>{formatearFechaHora(s.fecha_creacion)}</span>
          <Estado {...insigniaAEstado(insigniaSugerencia(s.estado, s.etiqueta_estado))} />
        </span>
        <span className={estilosIa.metaAtencion}>{alcanceDe(s)}</span>
        <span className={estilosIa.pieFicha}>
          <ResumenPrioridades propuesta={s} />
        </span>
        <span className={estilosIa.datosFicha}>{s.estado === 'Propuesta' ? 'Revisar' : 'Ver'} propuesta n.º {s.id}</span>
      </button>
    </li>
  )
}

export default function PriorizacionIaPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.asistenciaIa, { texto: TITULO }])
  const navigate = useNavigate()
  const location = useLocation()
  const rol = useRolActual()
  const puedeSolicitar = rol !== null && puede(rol, ROLES_SOLICITAR_IA)
  const esMovil = useEsMovil()
  const [solicitudAbierta, setSolicitudAbierta] = useState(false)

  const { filtros, establecer } = useFiltrosUrl({ estado: '', page: '1' })
  const pagina = Math.max(1, Number(filtros.page) || 1)
  const estadoFiltro = OPCIONES_ESTADO.find((o) => o.valor === filtros.estado)?.valor ?? ''

  const consulta = useConsulta(`priorizaciones|${estadoFiltro}|${pagina}`, (signal) =>
    listarPriorizaciones({ estado: estadoFiltro || undefined, page: pagina }, signal),
  )
  const propuestas = consulta.datos?.results ?? []
  const total = consulta.datos?.count ?? 0

  let estadoTabla: EstadoTabla | null = null
  if (consulta.estado === 'error') estadoTabla = 'error'
  else if (consulta.estado === 'cargando' && (consulta.cargaVisible || !consulta.datos)) estadoTabla = consulta.cargaVisible ? 'cargando' : null
  else if (consulta.datos) estadoTabla = consulta.datos.count === 0 ? 'vacio' : 'exito'

  function abrir(propuesta: SugerenciaPriorizacion, aviso?: string) {
    const estado: EstadoNavegacionRevision = { aviso, volverA: location.search }
    navigate(rutaRevisionPriorizacion(propuesta.id), { state: estado })
  }

  const cambiarPagina = (nueva: number) => establecer({ page: nueva > 1 ? String(nueva) : null })
  const vacio = {
    titulo: 'Aún no hay propuestas de prioridad',
    descripcion: puedeSolicitar ? 'Solicita una para empezar.' : 'Aparecerán aquí cuando se solicite una priorización.',
    accion: estadoFiltro ? (
      <Boton variante="secundario" onClick={() => establecer({ estado: null, page: null })}>
        Limpiar filtros
      </Boton>
    ) : undefined,
  }
  const error = consulta.error
    ? { titulo: 'No se pudieron cargar las propuestas', descripcion: consulta.error.detalle, onReintentar: consulta.reintentar }
    : undefined

  return (
    <div className={estilos.pagina}>
      <AvisoDatosSimulados />
      <AvisoEnLinea tono="info" titulo="Sugerencias generadas con IA">
        La IA propone prioridades para espacios (áreas y jardines) y ejemplares según su historial, sus incidencias, la
        frecuencia de mantenimiento y su estado. Nada se incorpora a la programación sin tu validación.
      </AvisoEnLinea>

      {puedeSolicitar && (
        <AccionesPagina>
          <Boton variante="primario" onClick={() => setSolicitudAbierta(true)}>
            Solicitar priorización
          </Boton>
        </AccionesPagina>
      )}

      <section className={estilos.seccion} aria-labelledby="titulo-priorizaciones">
        <h2 id="titulo-priorizaciones" className={estilos.tituloSeccion}>
          Propuestas de prioridad
        </h2>
        <Pestanas
          etiqueta="Estado de la propuesta"
          pestanas={OPCIONES_ESTADO}
          valor={estadoFiltro}
          onCambiar={(valor) => establecer({ estado: valor, page: null })}
        >
          {estadoTabla &&
            (esMovil && estadoTabla === 'exito' ? (
              <>
                <ul className={estilosIa.fichas} aria-label="Propuestas de prioridad">
                  {propuestas.map((s) => (
                    <FichaPropuesta key={s.id} propuesta={s} onAbrir={() => abrir(s)} />
                  ))}
                </ul>
                {total > POR_PAGINA && (
                  <div className={estilosIa.paginacionFichas}>
                    <p className="cifra">
                      Página {formatearNumero(pagina)} de {formatearNumero(Math.ceil(total / POR_PAGINA))}
                    </p>
                    <Boton variante="secundario" deshabilitado={pagina <= 1} onClick={() => cambiarPagina(pagina - 1)}>
                      Anterior
                    </Boton>
                    <Boton variante="secundario" deshabilitado={pagina * POR_PAGINA >= total} onClick={() => cambiarPagina(pagina + 1)}>
                      Siguiente
                    </Boton>
                  </div>
                )}
              </>
            ) : (
              <TablaDatos
                titulo="Propuestas de prioridad"
                columnas={COLUMNAS}
                filas={propuestas}
                claveFila={(s) => String(s.id)}
                estado={estadoTabla}
                onFilaClick={(s) => abrir(s)}
                paginacionServidor={{ pagina, total, porPagina: POR_PAGINA, onCambiarPagina: cambiarPagina }}
                vacio={vacio}
                error={error}
              />
            ))}
        </Pestanas>
      </section>

      <DialogoSolicitudPriorizacion
        abierto={solicitudAbierta}
        onCerrar={() => setSolicitudAbierta(false)}
        onCreada={(propuesta) => {
          setSolicitudAbierta(false)
          abrir(propuesta, 'Propuesta creada: pendiente de revisión')
        }}
      />
    </div>
  )
}
