// RF-IA-006 · HU-MOD06-008 · CU-MOD06-008 · CP-TR-MOD06-008 · RN-IA-001
/**
 * Evidencia fitosanitaria con IA (patrón «Página de listado» del sistema de diseño). La IA solo propone hipótesis de
 * afectación a partir de fotografías: nada se registra como diagnóstico sin la validación técnica, y nunca se indica
 * un tratamiento.
 *
 * - «Nuevo análisis» (roles que pueden solicitar a la IA), en dos pasos: la planta y las fotografías.
 * - `?ejemplar_id=` o `?atencion_id=` abren el nuevo análisis con esa planta, para enlazar desde otros módulos.
 * - El estado y la página van en la URL. En móvil, cada análisis es una tarjeta.
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
import { MIGAS, rutaRevisionEvidencia } from '@/router/rutasApp'
import { buscarAtencionesEvidencia, buscarEjemplaresEvidencia, listarAnalisisEvidencia } from '@/services/api/evidenciaFitosanitariaIa'
import { useRolActual } from '@/sesion/ContextoSesion'
import type { SugerenciaEvidencia } from '@/types/evidenciaFitosanitariaIa'
import type { EstadoSugerencia } from '@/types/ia'
import { estadoEvidencia, hipotesisPrincipal, textoResultado, tituloEvidencia } from '@/utils/evidenciaFitosanitariaIa'
import { formatearFechaHora, formatearNumero, SIN_VALOR } from '@/utils/formato'
import { enteroPositivo } from '@/utils/reportesGestion'
import estilos from '../reportes/Reportes.module.css'
import DialogoEvaluacionManual, { type ContextoManual } from './evidencia/DialogoEvaluacionManual'
import DialogoNuevoAnalisis, { type InicialNuevoAnalisis } from './evidencia/DialogoNuevoAnalisis'
import estilosEvidencia from './evidencia/Evidencia.module.css'
import type { EstadoNavegacionRevision } from './ExtraccionReporteProveedorPage'

const TITULO = 'Evidencia fitosanitaria'
const POR_PAGINA = 25

const PESTANAS: { valor: 'todos' | EstadoSugerencia; texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'Propuesta', texto: 'Pendientes' },
  { valor: 'Validada', texto: 'Validados' },
  { valor: 'Rechazada', texto: 'Descartados' },
]

const resultado = (s: SugerenciaEvidencia) => (s.contenido.validacion ? textoResultado(s.contenido.validacion) : SIN_VALOR)
const fotos = (s: SugerenciaEvidencia) => formatearNumero(s.contenido.fotografias.length)

const COLUMNAS: ColumnaTabla<SugerenciaEvidencia>[] = [
  { clave: 'fecha_creacion', titulo: 'Fecha', render: (s) => <CeldaTexto texto={formatearFechaHora(s.fecha_creacion)} tono="secundario" /> },
  {
    clave: 'ejemplar',
    titulo: 'Ejemplar',
    render: (s) => (
      <CeldaDobleLinea principal={s.contenido.ejemplar?.codigo ?? s.contenido.atencion?.codigo ?? SIN_VALOR} detalle={s.contenido.ejemplar?.especie ?? 'Especie no identificada'} codigo />
    ),
  },
  { clave: 'espacio', titulo: 'Espacio', render: (s) => <CeldaTexto texto={s.contenido.ejemplar?.espacio ?? SIN_VALOR} tono={s.contenido.ejemplar?.espacio ? 'principal' : 'deshabilitado'} /> },
  { clave: 'fotos', titulo: 'Fotos', alineacion: 'derecha', render: (s) => <CeldaTexto texto={fotos(s)} /> },
  { clave: 'hipotesis', titulo: 'Hipótesis principal', render: (s) => <CeldaTexto texto={hipotesisPrincipal(s.contenido)} /> },
  { clave: 'resultado', titulo: 'Resultado validado', render: (s) => <CeldaTexto texto={resultado(s)} tono={s.contenido.validacion ? 'principal' : 'deshabilitado'} /> },
  { clave: 'estado', titulo: 'Estado', render: (s) => <Estado {...estadoEvidencia(s.estado, s.contenido.validacion)} /> },
]

export default function EvidenciaFitosanitariaIaPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.asistenciaIa, { texto: TITULO }])
  const navigate = useNavigate()
  const location = useLocation()
  const rol = useRolActual()
  const puedeSolicitar = rol !== null && puede(rol, ROLES_SOLICITAR_IA)
  const esMovil = useEsMovil()

  const { filtros, establecer } = useFiltrosUrl({ estado: 'todos', page: '1', ejemplar_id: '', atencion_id: '' })
  const pagina = Math.max(1, Number(filtros.page) || 1)
  const estado = PESTANAS.find((p) => p.valor === filtros.estado)?.valor ?? 'todos'
  const ejemplarUrl = enteroPositivo(filtros.ejemplar_id) ?? null
  const atencionUrl = enteroPositivo(filtros.atencion_id) ?? null
  // Cada apertura del diálogo lo reinicia (cambia su `key`).
  const [dialogo, setDialogo] = useState<{ inicial: InicialNuevoAnalisis | null } | null>(null)
  const [aperturas, setAperturas] = useState(0)
  const [manual, setManual] = useState<ContextoManual | null>(null)

  const consulta = useConsulta(`evidencias|${estado}|${pagina}`, (signal) =>
    listarAnalisisEvidencia({ estado: estado === 'todos' ? undefined : estado, page: pagina }, signal),
  )
  const recuentos = useConsulta('evidencias-recuentos', (signal) =>
    Promise.all(PESTANAS.map((p) => listarAnalisisEvidencia({ estado: p.valor === 'todos' ? undefined : p.valor }, signal))).then((r) => r.map((p) => p.count)),
  )
  // Enlace profundo: busca la planta y abre el nuevo análisis con ella (una sola vez).
  const enlace = useConsulta(puedeSolicitar && (ejemplarUrl || atencionUrl) ? `evidencia-enlace|${ejemplarUrl}|${atencionUrl}` : null, async (signal) => {
    if (atencionUrl) {
      const atencion = (await buscarAtencionesEvidencia(String(atencionUrl), signal)).results.find((a) => a.id === atencionUrl)
      return atencion ? { atencion } : null
    }
    const ejemplar = (await buscarEjemplaresEvidencia(String(ejemplarUrl), signal)).results.find((e) => e.id === ejemplarUrl)
    return ejemplar ? { ejemplar } : null
  })
  const claveEnlace = `${ejemplarUrl}|${atencionUrl}`
  const [enlaceAbierto, setEnlaceAbierto] = useState<string | null>(null)
  if (enlace.estado === 'exito' && enlaceAbierto !== claveEnlace) {
    setEnlaceAbierto(claveEnlace)
    abrirDialogo(enlace.datos)
  }

  const analisis = consulta.datos?.results ?? []
  const total = consulta.datos?.count ?? 0
  let estadoTabla: EstadoTabla | null = null
  if (consulta.estado === 'error') estadoTabla = 'error'
  else if (consulta.estado === 'cargando' && (consulta.cargaVisible || !consulta.datos)) estadoTabla = consulta.cargaVisible ? 'cargando' : null
  else if (consulta.datos) estadoTabla = consulta.datos.count === 0 ? 'vacio' : 'exito'

  function abrirDialogo(inicial: InicialNuevoAnalisis | null) {
    setAperturas((n) => n + 1)
    setDialogo({ inicial })
  }

  function abrir(s: SugerenciaEvidencia, aviso?: string) {
    const navegacion: EstadoNavegacionRevision = { aviso, volverA: location.search }
    navigate(rutaRevisionEvidencia(s.id), { state: navegacion })
  }

  function cerrarDialogo() {
    setDialogo(null)
    if (ejemplarUrl !== null || atencionUrl !== null) establecer({ ejemplar_id: null, atencion_id: null })
  }

  const cambiarPagina = (nueva: number) => establecer({ page: nueva > 1 ? String(nueva) : null })

  let contenido
  if (consulta.error?.estado === 403) {
    contenido = <EstadoSinAcceso nivel={3} descripcion={consulta.error.detalle} />
  } else if (esMovil && estadoTabla === 'exito') {
    contenido = (
      <div className={estilosEvidencia.pila}>
        {analisis.map((s) => (
          <Tarjeta key={s.id} titulo={tituloEvidencia(s.contenido)} nivel={3} descripcion={s.contenido.ejemplar?.espacio ?? undefined} acciones={<Estado {...estadoEvidencia(s.estado, s.contenido.validacion)} />}>
            <p>{s.contenido.validacion ? resultado(s) : hipotesisPrincipal(s.contenido)}</p>
            <p className={estilosEvidencia.secundario}>{`${formatearFechaHora(s.fecha_creacion)} · ${fotos(s)} fotos`}</p>
            <BotonEnlace to={rutaRevisionEvidencia(s.id)} state={{ volverA: location.search }} variante="secundario">
              {s.estado === 'Propuesta' ? 'Revisar' : 'Ver'}
            </BotonEnlace>
          </Tarjeta>
        ))}
        {total > POR_PAGINA && <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} onCambiar={cambiarPagina} />}
      </div>
    )
  } else if (estadoTabla) {
    contenido = (
      <TablaDatos
        titulo="Análisis de evidencia"
        columnas={COLUMNAS}
        filas={analisis}
        claveFila={(s) => String(s.id)}
        estado={estadoTabla}
        onFilaClick={(s) => abrir(s)}
        paginacionServidor={{ pagina, total, porPagina: POR_PAGINA, onCambiarPagina: cambiarPagina }}
        vacio={{
          titulo: estado === 'todos' ? 'Aún no hay análisis' : 'No hay análisis en este estado',
          descripcion: puedeSolicitar ? 'Solicita uno con «Nuevo análisis».' : undefined,
          nivel: 3,
        }}
        error={consulta.error ? { titulo: 'No se pudieron cargar los análisis', descripcion: consulta.error.detalle, onReintentar: consulta.reintentar } : undefined}
      />
    )
  }

  return (
    <div className={estilos.pagina}>
      {puedeSolicitar && (
        <AccionesPagina>
          <Boton variante="primario" icono="plus" onClick={() => abrirDialogo(null)}>
            Nuevo análisis
          </Boton>
        </AccionesPagina>
      )}
      <AvisoDatosSimulados />
      <AvisoEnLinea tono="info" titulo="Hipótesis generadas con IA">
        La IA sugiere posibles afectaciones a partir de fotografías, con su nivel de confianza. Son hipótesis: solo se registra
        la categoría que valides, y nunca se indica un tratamiento.
      </AvisoEnLinea>
      {enlace.estado === 'exito' && !enlace.datos && (
        <AvisoEnLinea tono="advertencia">No se encontró la planta del enlace. Elígela en «Nuevo análisis».</AvisoEnLinea>
      )}

      <Pestanas
        etiqueta="Estado del análisis"
        valor={estado}
        onCambiar={(valor) => establecer({ estado: valor === 'todos' ? null : valor, page: null })}
        pestanas={PESTANAS.map((p, i) => ({ valor: p.valor, texto: p.texto, contador: recuentos.datos?.[i] }))}
      >
        {contenido}
      </Pestanas>

      {dialogo && (
        <DialogoNuevoAnalisis
          key={aperturas}
          abierto
          inicial={dialogo.inicial}
          onCerrar={cerrarDialogo}
          onCreado={(s) => {
            cerrarDialogo()
            abrir(s, 'Análisis generado: pendiente de validación técnica')
          }}
          onManual={(contexto) => {
            cerrarDialogo()
            setManual(contexto)
          }}
        />
      )}
      <DialogoEvaluacionManual
        contexto={manual}
        onCerrar={() => setManual(null)}
        onRegistrada={(s) => {
          setManual(null)
          abrir(s, 'Evaluación registrada sin IA')
        }}
      />
    </div>
  )
}
