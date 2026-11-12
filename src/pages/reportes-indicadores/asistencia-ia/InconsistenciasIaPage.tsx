// RF-IA-002 · HU-MOD06-011 · CP-TR-MOD06-011 · RN-IA-001
/**
 * Revisión de inconsistencias: bandeja de hallazgos de la IA (posibles duplicados, valores atípicos, campos
 * incompatibles y nombres no normalizados), con el mismo patrón que las demás bandejas de Asistencia IA.
 *
 * - La IA solo señala posibles problemas: ningún registro oficial cambia desde aquí (criterio 3).
 * - Estado, tipo de hallazgo, conjunto y página van en la URL, para conservarlos al volver del detalle.
 * - «Analizar datos» solo se muestra a los roles que pueden solicitar a la IA (PERMISO_SOLICITAR_IA).
 * - En móvil, cada hallazgo es una ficha.
 */
// Excepción al sistema (AV-351): la ficha móvil de cada hallazgo es un <button> que lo abre entero; no tiene el aspecto de Boton.
import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import AyudaEmergente from '@/components/reportes-indicadores/AyudaEmergente'
import { useEsMovil } from '@/components/reportes-indicadores/useEsMovil'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Pestanas from '@/components/ui/Pestanas'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import Boton from '@/components/ui/Boton'
import Selector, { OPCION_TODOS } from '@/components/ui/Selector'
import TablaDatos, { type ColumnaTabla, type EstadoTabla } from '@/components/ui/TablaDatos'
import { puede, PERMISO_SOLICITAR_IA } from '@/config/permisos'
import { useConsulta } from '@/hooks/useConsulta'
import { useFiltrosUrl } from '@/hooks/useFiltrosUrl'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS, rutaRevisionInconsistencia } from '@/router/rutasApp'
import { listarInconsistencias } from '@/services/api/inconsistenciasIa'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { SugerenciaInconsistencia } from '@/types/inconsistenciasIa'
import { formatearFechaHora, formatearNumero } from '@/utils/formato'
import {
  CONJUNTOS,
  ESTADOS_HALLAZGO,
  ETIQUETA_CONJUNTO,
  ETIQUETA_TIPO_HALLAZGO,
  filtrosDesdeUrl,
  insigniaConfianza,
  insigniaEstadoHallazgo,
  insigniaTipoHallazgo,
  textoDatoObservado,
  TIPOS_HALLAZGO,
} from '@/utils/inconsistenciasIa'
import estilos from '../reportes/Reportes.module.css'
import estilosIa from './AsistenciaIa.module.css'
import type { EstadoNavegacionRevision } from './ExtraccionReporteProveedorPage'
import DialogoAnalisis from './inconsistencias/DialogoAnalisis'
import estilosHallazgo from './inconsistencias/Inconsistencias.module.css'
import Estado from '@/components/ui/Estado'
import { insigniaAEstado } from '@/components/ui/tonos'

const TITULO = 'Revisión de inconsistencias'
const POR_PAGINA = 25

const codigos = (s: SugerenciaInconsistencia) => s.contenido.registros.map((r) => r.codigo ?? r.etiqueta).join(', ')

/** Dato observado truncado, con el texto completo en una ayuda emergente. */
function DatoObservado({ sugerencia: s }: { sugerencia: SugerenciaInconsistencia }) {
  const texto = textoDatoObservado(s.contenido)
  return (
    <span className={estilosHallazgo.celdaDato}>
      <span className={estilosHallazgo.datoObservado}>{texto}</span>
      {texto.length > 40 && <AyudaEmergente id={`dato-${s.id}`} tema="el dato observado" texto={texto} />}
    </span>
  )
}

const COLUMNAS: ColumnaTabla<SugerenciaInconsistencia>[] = [
  { clave: 'tipo', titulo: 'Hallazgo', render: (s) => <Estado {...insigniaAEstado(insigniaTipoHallazgo(s.contenido.tipo_hallazgo))} /> },
  { clave: 'conjunto', titulo: 'Conjunto', render: (s) => ETIQUETA_CONJUNTO[s.contenido.conjunto] },
  { clave: 'dato', titulo: 'Dato observado', render: (s) => <DatoObservado sugerencia={s} /> },
  { clave: 'registros', titulo: 'Registros', multilinea: true, render: codigos },
  { clave: 'confianza', titulo: 'Confianza', render: (s) => <Estado {...insigniaAEstado(insigniaConfianza(s.contenido.confianza))} /> },
  { clave: 'fecha_creacion', titulo: 'Detectado', render: (s) => formatearFechaHora(s.fecha_creacion) },
  { clave: 'estado', titulo: 'Estado', render: (s) => <Estado {...insigniaAEstado(insigniaEstadoHallazgo(s.estado))} /> },
]

function FichaHallazgo({ sugerencia: s, onAbrir }: { sugerencia: SugerenciaInconsistencia; onAbrir: () => void }) {
  return (
    <li>
      <button type="button" className={estilosIa.ficha} onClick={onAbrir}>
        <span className={estilosIa.cabeceraFicha}>
          <Estado {...insigniaAEstado(insigniaTipoHallazgo(s.contenido.tipo_hallazgo))} />
          <Estado {...insigniaAEstado(insigniaEstadoHallazgo(s.estado))} />
        </span>
        <span className={estilosIa.codigoAtencion}>{textoDatoObservado(s.contenido)}</span>
        <span className={estilosIa.metaAtencion}>
          {ETIQUETA_CONJUNTO[s.contenido.conjunto]} · {codigos(s)}
        </span>
        <span className={estilosIa.pieFicha}>
          <Estado {...insigniaAEstado(insigniaConfianza(s.contenido.confianza))} />
        </span>
        <span className={estilosIa.datosFicha}>{s.estado === 'Propuesta' ? 'Revisar' : 'Ver'} hallazgo n.º {s.id}</span>
      </button>
    </li>
  )
}

export default function InconsistenciasIaPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.asistenciaIa, { texto: TITULO }])
  const navigate = useNavigate()
  const location = useLocation()
  const permisos = usePermisos()
  const puedeAnalizar = puede(permisos, PERMISO_SOLICITAR_IA)
  const esMovil = useEsMovil()
  const [analisisAbierto, setAnalisisAbierto] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const cerrarAviso = useCallback(() => setAviso(null), [])

  const { filtros, establecer } = useFiltrosUrl({ estado: 'Propuesta', tipo: '', conjunto: '', page: '1' })
  const consultaApi = filtrosDesdeUrl(filtros)
  const pagina = consultaApi.page ?? 1
  const hayFiltros = Boolean(consultaApi.tipo_hallazgo || consultaApi.conjunto)

  const consulta = useConsulta(`inconsistencias|${JSON.stringify(consultaApi)}`, (signal) => listarInconsistencias(consultaApi, signal))
  // Recuentos de los chips de estado con los mismos filtros de tipo y conjunto.
  const recuentos = useConsulta(`inconsistencias-recuentos|${consultaApi.tipo_hallazgo ?? ''}|${consultaApi.conjunto ?? ''}`, (signal) =>
    Promise.all(
      ESTADOS_HALLAZGO.map((e) =>
        listarInconsistencias({ estado: e.valor, tipo_hallazgo: consultaApi.tipo_hallazgo, conjunto: consultaApi.conjunto }, signal),
      ),
    ).then((paginas) => paginas.map((p) => p.count)),
  )
  const hallazgos = consulta.datos?.results ?? []
  const total = consulta.datos?.count ?? 0

  let estadoTabla: EstadoTabla | null = null
  if (consulta.estado === 'error') estadoTabla = 'error'
  else if (consulta.estado === 'cargando' && (consulta.cargaVisible || !consulta.datos)) estadoTabla = consulta.cargaVisible ? 'cargando' : null
  else if (consulta.datos) estadoTabla = consulta.datos.count === 0 ? 'vacio' : 'exito'

  function abrir(s: SugerenciaInconsistencia) {
    const estado: EstadoNavegacionRevision = { volverA: location.search }
    navigate(rutaRevisionInconsistencia(s.id), { state: estado })
  }

  const cambiarPagina = (nueva: number) => establecer({ page: nueva > 1 ? String(nueva) : null })
  const quitarFiltros = () => establecer({ tipo: null, conjunto: null, page: null })
  const vacio = hayFiltros
    ? {
        titulo: 'No hay hallazgos con estos filtros',
        accion: (
          <Boton variante="secundario" onClick={quitarFiltros}>
            Quitar filtros
          </Boton>
        ),
      }
    : {
        titulo:
          consultaApi.estado === 'Propuesta'
            ? 'No hay hallazgos pendientes de revisión'
            : consultaApi.estado
              ? 'No hay hallazgos en este estado'
              : 'Aún no hay hallazgos',
        descripcion: puedeAnalizar ? 'Usa «Analizar datos» para buscar posibles inconsistencias.' : undefined,
      }
  const error = consulta.error
    ? { titulo: 'No se pudieron cargar los hallazgos', descripcion: consulta.error.detalle, onReintentar: consulta.reintentar }
    : undefined

  return (
    <div className={estilos.pagina}>
      <AvisoDatosSimulados />
      <AvisoEnLinea tono="info" titulo="Hallazgos detectados con IA">
        La IA señala posibles duplicados, valores atípicos, campos incompatibles y nombres no normalizados. Ningún registro
        oficial cambia hasta que se corrija en su módulo.
      </AvisoEnLinea>

      {puedeAnalizar && (
        <AccionesPagina>
          <Boton variante="primario" onClick={() => setAnalisisAbierto(true)}>
            Analizar datos
          </Boton>
        </AccionesPagina>
      )}

      <section className={estilos.seccion} aria-labelledby="titulo-hallazgos">
        <h2 id="titulo-hallazgos" className={estilos.tituloSeccion}>
          Hallazgos
        </h2>
        <div className={estilosHallazgo.filtros}>
          <Pestanas
            etiqueta="Estado del hallazgo"
            pestanas={[
              // «Todos» va explícito en la URL: sin parámetro se muestran las pendientes.
              { valor: 'todos', texto: 'Todos' },
              ...ESTADOS_HALLAZGO.map((e, i) => ({
                valor: e.valor,
                texto: e.plural,
                contador: recuentos.datos?.[i],
              })),
            ]}
            valor={consultaApi.estado ?? 'todos'}
            onCambiar={(valor) => establecer({ estado: valor, page: null })}
          >
            <Selector
              id="filtro-tipo-hallazgo"
              etiqueta="Tipo de hallazgo"
              valor={consultaApi.tipo_hallazgo ?? ''}
              opciones={TIPOS_HALLAZGO.map((t) => ({ valor: t, texto: ETIQUETA_TIPO_HALLAZGO[t] }))}
              opcionTodos={OPCION_TODOS}
              onCambiar={(valor) => establecer({ tipo: valor || null, page: null })}
            />
            <Selector
              id="filtro-conjunto"
              etiqueta="Conjunto de datos"
              valor={consultaApi.conjunto ?? ''}
              opciones={CONJUNTOS.map((c) => ({ valor: c, texto: ETIQUETA_CONJUNTO[c] }))}
              opcionTodos={OPCION_TODOS}
              onCambiar={(valor) => establecer({ conjunto: valor || null, page: null })}
            />
          </Pestanas>
        </div>
        {estadoTabla &&
          (esMovil && estadoTabla === 'exito' ? (
            <>
              <ul className={estilosIa.fichas} aria-label="Hallazgos">
                {hallazgos.map((s) => (
                  <FichaHallazgo key={s.id} sugerencia={s} onAbrir={() => abrir(s)} />
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
              titulo="Hallazgos"
              columnas={COLUMNAS}
              filas={hallazgos}
              claveFila={(s) => String(s.id)}
              estado={estadoTabla}
              onFilaClick={abrir}
              paginacionServidor={{ pagina, total, porPagina: POR_PAGINA, onCambiarPagina: cambiarPagina }}
              vacio={vacio}
              error={error}
            />
          ))}
      </section>

      <DialogoAnalisis
        abierto={analisisAbierto}
        onCerrar={() => setAnalisisAbierto(false)}
        onTerminado={(resultado) => {
          setAnalisisAbierto(false)
          setAviso(
            resultado.hallazgos === 0
              ? 'No se detectaron inconsistencias en este conjunto'
              : `Se detectaron ${formatearNumero(resultado.hallazgos)} posibles inconsistencias`,
          )
          // La bandeja se filtra por «Pendientes» y se refresca.
          establecer({ estado: 'Propuesta', tipo: null, conjunto: null, page: null })
          consulta.reintentar()
          recuentos.reintentar()
        }}
      />
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </div>
  )
}
