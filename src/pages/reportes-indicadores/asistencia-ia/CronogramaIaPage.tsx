// RF-IA-003 · HU-MOD06-005 · CU-MOD06-005 · CP-TR-MOD06-005 · RN-IA-001
/**
 * Planificación asistida: bandeja de propuestas de cronograma de la IA (mismo patrón que las demás bandejas de
 * Asistencia IA). Una propuesta no es una programación: nada se registra en Planificación hasta confirmarla.
 *
 * - «Generar propuesta» solo se muestra a los roles que pueden solicitar a la IA (ROLES_SOLICITAR_IA).
 * - El estado y la página van en la URL, para conservarlos al volver de la revisión.
 * - En móvil, cada propuesta es una ficha.
 */
// Excepción al sistema (AV-351): la ficha móvil de cada propuesta es un <button> que la abre entera; no tiene el aspecto de Boton.
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import { useEsMovil } from '@/components/reportes-indicadores/useEsMovil'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Pestanas from '@/components/ui/Pestanas'
import Boton from '@/components/ui/Boton'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import TablaDatos, { type ColumnaTabla, type EstadoTabla } from '@/components/ui/TablaDatos'
import { puede, ROLES_SOLICITAR_IA } from '@/config/permisos'
import { useConsulta } from '@/hooks/useConsulta'
import { useFiltrosUrl } from '@/hooks/useFiltrosUrl'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS, rutaRevisionCronograma } from '@/router/rutasApp'
import { listarCronogramas } from '@/services/api/cronogramaIa'
import { useRolActual } from '@/sesion/ContextoSesion'
import type { SugerenciaCronograma } from '@/types/cronogramaIa'
import type { EstadoSugerencia } from '@/types/ia'
import { textoPeriodoCorto } from '@/utils/cronogramaIa'
import { insigniaSuficiencia, insigniaSugerencia } from '@/utils/estados'
import { formatearFechaHora, formatearNumero, SIN_VALOR } from '@/utils/formato'
import estilos from '../reportes/Reportes.module.css'
import estilosIa from './AsistenciaIa.module.css'
import DialogoGenerarCronograma from './cronograma/DialogoGenerarCronograma'
import type { EstadoNavegacionRevision } from './ExtraccionReporteProveedorPage'
import Estado from '@/components/ui/Estado'
import { insigniaAEstado } from '@/components/ui/tonos'

const TITULO = 'Planificación asistida'
const POR_PAGINA = 25

const OPCIONES_ESTADO: { valor: '' | EstadoSugerencia; texto: string }[] = [
  { valor: '', texto: 'Todas' },
  { valor: 'Propuesta', texto: 'Pendientes de revisión' },
  { valor: 'Validada', texto: 'Confirmadas' },
  { valor: 'Rechazada', texto: 'Descartadas' },
]

const periodoDe = (s: SugerenciaCronograma) => textoPeriodoCorto(s.contenido.entrada.desde, s.contenido.entrada.hasta)

/** «7 aceptadas · 2 modificadas · 3 descartadas» (solo si ya está confirmada). */
function textoDecision(s: SugerenciaCronograma): string {
  const r = s.contenido.decision?.resumen
  if (s.estado !== 'Validada' || !r) return SIN_VALOR
  return `${formatearNumero(r.aceptados)} aceptadas · ${formatearNumero(r.corregidos)} modificadas · ${formatearNumero(r.descartados)} descartadas`
}

const COLUMNAS: ColumnaTabla<SugerenciaCronograma>[] = [
  {
    clave: 'periodo',
    titulo: 'Periodo',
    render: (s) => (
      <span className={estilosIa.celdaAtencion}>
        <span className="cifra">{periodoDe(s)}</span>
        <span className={estilosIa.metaAtencion}>Generada el {formatearFechaHora(s.fecha_creacion)}</span>
      </span>
    ),
  },
  { clave: 'propuestas', titulo: 'Propuestas', alineacion: 'derecha', render: (s) => formatearNumero(s.contenido.propuestas.length) },
  { clave: 'decision', titulo: 'Decisión', multilinea: true, render: textoDecision },
  { clave: 'suficiencia', titulo: 'Datos', render: (s) => <Estado {...insigniaAEstado(insigniaSuficiencia(s.contenido.suficiencia))} /> },
  { clave: 'estado', titulo: 'Estado', render: (s) => <Estado {...insigniaAEstado(insigniaSugerencia(s.estado, s.etiqueta_estado))} /> },
]

function FichaPropuestaBandeja({ propuesta: s, onAbrir }: { propuesta: SugerenciaCronograma; onAbrir: () => void }) {
  return (
    <li>
      <button type="button" className={estilosIa.ficha} onClick={onAbrir}>
        <span className={estilosIa.cabeceraFicha}>
          <span className={`${estilosIa.codigoAtencion} cifra`}>{periodoDe(s)}</span>
          <Estado {...insigniaAEstado(insigniaSugerencia(s.estado, s.etiqueta_estado))} />
        </span>
        <span className={estilosIa.metaAtencion}>
          {formatearNumero(s.contenido.propuestas.length)} propuestas · generada el {formatearFechaHora(s.fecha_creacion)}
        </span>
        <span className={estilosIa.pieFicha}>
          <Estado {...insigniaAEstado(insigniaSuficiencia(s.contenido.suficiencia))} />
        </span>
        <span className={estilosIa.datosFicha}>{s.estado === 'Propuesta' ? 'Revisar' : 'Ver'} propuesta n.º {s.id}</span>
      </button>
    </li>
  )
}

export default function CronogramaIaPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.asistenciaIa, { texto: TITULO }])
  const navigate = useNavigate()
  const location = useLocation()
  const rol = useRolActual()
  const puedeGenerar = rol !== null && puede(rol, ROLES_SOLICITAR_IA)
  const esMovil = useEsMovil()
  const [dialogoAbierto, setDialogoAbierto] = useState(false)

  const { filtros, establecer } = useFiltrosUrl({ estado: '', page: '1' })
  const pagina = Math.max(1, Number(filtros.page) || 1)
  const estadoFiltro = OPCIONES_ESTADO.find((o) => o.valor === filtros.estado)?.valor ?? ''

  const consulta = useConsulta(`cronogramas|${estadoFiltro}|${pagina}`, (signal) =>
    listarCronogramas({ estado: estadoFiltro || undefined, page: pagina }, signal),
  )
  const propuestas = consulta.datos?.results ?? []
  const total = consulta.datos?.count ?? 0

  let estadoTabla: EstadoTabla | null = null
  if (consulta.estado === 'error') estadoTabla = 'error'
  else if (consulta.estado === 'cargando' && (consulta.cargaVisible || !consulta.datos)) estadoTabla = consulta.cargaVisible ? 'cargando' : null
  else if (consulta.datos) estadoTabla = consulta.datos.count === 0 ? 'vacio' : 'exito'

  function abrir(s: SugerenciaCronograma, aviso?: string) {
    const estado: EstadoNavegacionRevision = { aviso, volverA: location.search }
    navigate(rutaRevisionCronograma(s.id), { state: estado })
  }

  const cambiarPagina = (nueva: number) => establecer({ page: nueva > 1 ? String(nueva) : null })
  const vacio = {
    titulo: 'Aún no hay propuestas de cronograma',
    descripcion: puedeGenerar ? 'Genera una para empezar.' : 'Aparecerán aquí cuando se genere una propuesta.',
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
        La IA propone fechas, actividades, ubicaciones y recursos según las frecuencias, las restricciones de calendario y la
        disponibilidad. Una propuesta no es una programación: solo se registra lo que confirmes.
      </AvisoEnLinea>

      {puedeGenerar && (
        <AccionesPagina>
          <Boton variante="primario" onClick={() => setDialogoAbierto(true)}>
            Generar propuesta
          </Boton>
        </AccionesPagina>
      )}

      <section className={estilos.seccion} aria-labelledby="titulo-cronogramas">
        <h2 id="titulo-cronogramas" className={estilos.tituloSeccion}>
          Propuestas de cronograma
        </h2>
        <Pestanas
          etiqueta="Estado de la propuesta"
          pestanas={OPCIONES_ESTADO}
          valor={estadoFiltro}
          onCambiar={(valor) => establecer({ estado: valor, page: null })}
        >
          {consulta.error?.estado === 403 ? (
            <EstadoSinAcceso nivel={3} descripcion={consulta.error.detalle} />
          ) : estadoTabla &&
            (esMovil && estadoTabla === 'exito' ? (
              <>
                <ul className={estilosIa.fichas} aria-label="Propuestas de cronograma">
                  {propuestas.map((s) => (
                    <FichaPropuestaBandeja key={s.id} propuesta={s} onAbrir={() => abrir(s)} />
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
                titulo="Propuestas de cronograma"
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

      <DialogoGenerarCronograma
        abierto={dialogoAbierto}
        onCerrar={() => setDialogoAbierto(false)}
        onCreada={(s) => {
          setDialogoAbierto(false)
          abrir(s, 'Propuesta generada: pendiente de revisión')
        }}
      />
    </div>
  )
}
