// RF-IA-001 · HU-MOD06-010 · CU-MOD06-010 · CP-TR-MOD06-010 · RN-IA-001
/**
 * Extracción de informes de proveedores: bandeja de propuestas de IA (patrón «Bandeja de pendientes»).
 *
 * - La salida de la IA es una sugerencia: nada se registra sin la revisión de una persona autorizada.
 * - «Analizar informe» solo se muestra a los roles que pueden solicitar el análisis: se busca la atención y se
 *   elige su informe (SolicitudAnalisis), sin tener que conocer el número del reporte.
 * - Cada propuesta se identifica con la atención de MOD-05 (código, proveedor y tipo de servicio). Si MOD-05 no
 *   responde, se muestran los números de siempre.
 * - El estado elegido y la página van en la URL, para conservarlos al volver desde la revisión.
 * - En móvil, cada propuesta es una ficha en lugar de una fila.
 */
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useEsMovil } from '../../../components/reportes-indicadores/useEsMovil'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Badge from '../../../components/ui/Badge'
import Boton from '../../../components/ui/Boton'
import { GrupoChips } from '../../../components/ui/ChipsFiltro'
import TablaDatos, { type ColumnaTabla, type EstadoTabla } from '../../../components/ui/TablaDatos'
import { puede, ROLES_SOLICITAR_IA } from '../../../config/permisos'
import { useRolActual } from '../../../sesion/ContextoSesion'
import { useConsulta } from '../../../hooks/useConsulta'
import { useFiltrosUrl } from '../../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS, rutaRevisionExtraccion } from '../../../router/rutasApp'
import { listarExtracciones } from '../../../services/api/ia'
import type { EstadoSugerencia, SugerenciaIA } from '../../../types/ia'
import type { Atencion } from '../../../types/tercerizados'
import { insigniaSugerencia } from '../../../utils/estados'
import { formatearFecha, formatearFechaHora, formatearNumero, SIN_VALOR } from '../../../utils/formato'
import estilos from '../reportes/Reportes.module.css'
import estilosIa from './AsistenciaIa.module.css'
import { cargarAtenciones } from './extraccion/consultasApoyo'
import SolicitudAnalisis from './extraccion/SolicitudAnalisis'
import { coberturaSugerencia } from './extraccion/valoresCampo'

const TITULO = 'Extracción de informes de proveedores'
const POR_PAGINA = 25 // Paginación del back-end (Guía Web 5.5).

const OPCIONES_ESTADO: { valor: '' | EstadoSugerencia; texto: string }[] = [
  { valor: '', texto: 'Todas' },
  { valor: 'Propuesta', texto: 'Pendiente de revisión' },
  { valor: 'Validada', texto: 'Validadas' },
  { valor: 'Rechazada', texto: 'Rechazadas' },
]

/** Estado de navegación que recibe la ficha de revisión. */
export interface EstadoNavegacionRevision {
  /** Aviso temporal que debe mostrar la ficha al abrirse. */
  aviso?: string
  /** Búsqueda (filtros) de la bandeja, para volver con los filtros conservados. */
  volverA?: string
}

/** Código de la atención y, debajo, proveedor y tipo de servicio. */
function CeldaAtencion({ atencion, atencionId }: { atencion: Atencion | undefined; atencionId: number }) {
  if (!atencion) return <span className="cifra">n.º {atencionId}</span>
  return (
    <span className={estilosIa.celdaAtencion}>
      <span className={estilosIa.codigoAtencion}>{atencion.codigo}</span>
      <span className={estilosIa.metaAtencion}>
        {atencion.proveedor_nombre ?? SIN_VALOR} · {atencion.tipo_servicio_nombre ?? SIN_VALOR}
      </span>
    </span>
  )
}

/** «6 de 8» datos encontrados por la IA, con aviso si faltan obligatorios. */
function CeldaDatos({ sugerencia }: { sugerencia: SugerenciaIA }) {
  const { conValor, total } = coberturaSugerencia(sugerencia)
  const faltan = sugerencia.contenido.campos_obligatorios_faltantes.length
  return (
    <span className={estilosIa.celdaAtencion}>
      <span className="cifra">
        {formatearNumero(conValor)} de {formatearNumero(total)}
      </span>
      {faltan > 0 && (
        <Badge tono="advertencia" texto={faltan === 1 ? '1 obligatorio sin valor' : `${faltan} obligatorios sin valor`} />
      )}
    </span>
  )
}

function columnas(atenciones: Map<number, Atencion>): ColumnaTabla<SugerenciaIA>[] {
  return [
    {
      clave: 'id',
      titulo: 'Propuesta',
      render: (s) => (
        <span className={estilosIa.celdaAtencion}>
          <span className="cifra">n.º {s.id}</span>
          <span className={estilosIa.metaAtencion}>{formatearFechaHora(s.fecha_creacion)}</span>
        </span>
      ),
    },
    {
      clave: 'atencion',
      titulo: 'Atención',
      subtitulo: 'proveedor · tipo de servicio',
      render: (s) => (
        <CeldaAtencion atencion={atenciones.get(s.contenido.entrada.atencion_id)} atencionId={s.contenido.entrada.atencion_id} />
      ),
    },
    { clave: 'registro_id', titulo: 'Reporte', render: (s) => <span className="cifra">n.º {s.registro_id}</span> },
    { clave: 'estado', titulo: 'Estado', render: (s) => <Badge {...insigniaSugerencia(s.estado, s.etiqueta_estado)} /> },
    { clave: 'datos', titulo: 'Datos encontrados', render: (s) => <CeldaDatos sugerencia={s} /> },
    {
      clave: 'fecha_validacion',
      titulo: 'Revisada',
      render: (s) => (s.fecha_validacion ? formatearFecha(s.fecha_validacion) : SIN_VALOR),
    },
  ]
}

/** Ficha de una propuesta (móvil). */
function FichaPropuesta({
  sugerencia: s,
  atencion,
  onAbrir,
}: {
  sugerencia: SugerenciaIA
  atencion: Atencion | undefined
  onAbrir: () => void
}) {
  return (
    <li>
      <button type="button" className={estilosIa.ficha} onClick={onAbrir}>
        <span className={estilosIa.cabeceraFicha}>
          <span className={estilosIa.codigoAtencion}>{atencion?.codigo ?? `Atención n.º ${s.contenido.entrada.atencion_id}`}</span>
          <Badge {...insigniaSugerencia(s.estado, s.etiqueta_estado)} />
        </span>
        {atencion && (
          <span className={estilosIa.metaAtencion}>
            {atencion.proveedor_nombre ?? SIN_VALOR} · {atencion.tipo_servicio_nombre ?? SIN_VALOR}
          </span>
        )}
        <span className={estilosIa.datosFicha}>
          <span>
            Propuesta n.º {s.id} · Reporte n.º {s.registro_id}
          </span>
          <span>Creada el {formatearFechaHora(s.fecha_creacion)}</span>
        </span>
        <span className={estilosIa.pieFicha}>
          <span>Datos encontrados:</span> <CeldaDatos sugerencia={s} />
        </span>
      </button>
    </li>
  )
}

export default function ExtraccionReporteProveedorPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.asistenciaIa, { texto: TITULO }])
  const navigate = useNavigate()
  const location = useLocation()
  const rol = useRolActual()
  const puedeSolicitar = rol !== null && puede(rol, ROLES_SOLICITAR_IA)
  const esMovil = useEsMovil()
  const [solicitudAbierta, setSolicitudAbierta] = useState(false)

  // --- Bandeja -----------------------------------------------------------------
  const { filtros, establecer } = useFiltrosUrl({ estado: '', page: '1' })
  const pagina = Math.max(1, Number(filtros.page) || 1)
  const estadoFiltro = OPCIONES_ESTADO.some((o) => o.valor === filtros.estado)
    ? (filtros.estado as '' | EstadoSugerencia)
    : ''

  const consulta = useConsulta(
    `${estadoFiltro}|${pagina}`,
    (signal) => listarExtracciones({ estado: estadoFiltro || undefined, page: pagina }, signal),
    (datos) => datos.count === 0,
  )
  const propuestas = consulta.datos?.results ?? []

  // Atenciones de MOD-05 de la página, para identificar cada propuesta.
  const idsAtencion = [...new Set(propuestas.map((s) => s.contenido.entrada.atencion_id))].sort((a, b) => a - b)
  const consultaAtenciones = useConsulta(idsAtencion.length > 0 ? `atenciones|${idsAtencion.join(',')}` : null, (signal) =>
    cargarAtenciones(idsAtencion, signal),
  )
  const atenciones = consultaAtenciones.datos ?? new Map<number, Atencion>()

  let estadoTabla: EstadoTabla | null = null
  if (consulta.estado === 'error') estadoTabla = 'error'
  else if (consulta.estado === 'cargando' && (consulta.cargaVisible || !consulta.datos))
    estadoTabla = consulta.cargaVisible ? 'cargando' : null
  else if (consulta.datos) estadoTabla = consulta.datos.count === 0 ? 'vacio' : 'exito'

  function abrirRevision(sugerencia: SugerenciaIA, aviso?: string) {
    const estado: EstadoNavegacionRevision = { aviso, volverA: location.search }
    navigate(rutaRevisionExtraccion(sugerencia.id), { state: estado })
  }

  const total = consulta.datos?.count ?? 0
  const cambiarPagina = (nueva: number) => establecer({ page: nueva > 1 ? String(nueva) : null })
  const vacio = {
    titulo: 'Sin propuestas de extracción',
    descripcion: 'Aparecerán aquí cuando se analice un informe de proveedor',
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
      <AvisoEnLinea tono="info" titulo="Sugerencias generadas con IA">
        La IA propone datos a partir del informe final del proveedor. Nada se registra sin la revisión de una
        persona autorizada.
      </AvisoEnLinea>

      {puedeSolicitar &&
        (solicitudAbierta ? (
          <SolicitudAnalisis
            onCreada={(s) => abrirRevision(s, 'Propuesta creada: pendiente de revisión')}
            onAbrirPropuesta={(s) => abrirRevision(s)}
            onCancelar={() => setSolicitudAbierta(false)}
          />
        ) : (
          <div className={estilosIa.accionPrincipal}>
            <Boton variante="primario" onClick={() => setSolicitudAbierta(true)} aria-expanded={false}>
              Analizar informe
            </Boton>
          </div>
        ))}

      <section className={estilos.seccion} aria-labelledby="titulo-propuestas">
        <h2 id="titulo-propuestas" className={estilos.tituloSeccion}>
          Propuestas de extracción
        </h2>
        <GrupoChips
          etiqueta="Estado de la propuesta"
          opciones={OPCIONES_ESTADO}
          valor={estadoFiltro}
          onCambiar={(valor) => establecer({ estado: valor, page: null })}
        />
        {estadoTabla &&
          (esMovil && estadoTabla === 'exito' ? (
            <>
              <ul className={estilosIa.fichas} aria-label="Propuestas de extracción">
                {propuestas.map((s) => (
                  <FichaPropuesta
                    key={s.id}
                    sugerencia={s}
                    atencion={atenciones.get(s.contenido.entrada.atencion_id)}
                    onAbrir={() => abrirRevision(s)}
                  />
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
                  <Boton
                    variante="secundario"
                    deshabilitado={pagina * POR_PAGINA >= total}
                    onClick={() => cambiarPagina(pagina + 1)}
                  >
                    Siguiente
                  </Boton>
                </div>
              )}
            </>
          ) : (
            <TablaDatos
              titulo="Propuestas de extracción"
              columnas={columnas(atenciones)}
              filas={propuestas}
              claveFila={(s) => String(s.id)}
              estado={estadoTabla}
              onFilaClick={(s) => abrirRevision(s)}
              paginacionServidor={{ pagina, total, porPagina: POR_PAGINA, onCambiarPagina: cambiarPagina }}
              vacio={vacio}
              error={error}
            />
          ))}
      </section>
    </div>
  )
}
