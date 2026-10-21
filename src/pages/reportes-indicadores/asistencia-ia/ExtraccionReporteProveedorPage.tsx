// RF-IA-001 · HU-MOD06-010 · CU-MOD06-010 · CP-TR-MOD06-010 · RN-IA-001
/**
 * Extracción de informes de proveedores: bandeja de propuestas de IA (patrón «Bandeja de pendientes»).
 *
 * - La salida de la IA es una sugerencia: nada se registra sin la revisión de una persona autorizada.
 * - «Analizar informe» solo se muestra a los roles que pueden solicitar el análisis.
 * - Si la IA no está disponible (503), se informa y se permite continuar con el registro manual (MOD-05).
 * - El estado elegido y la página van en la URL, para conservarlos al volver desde la revisión.
 */
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Badge from '../../../components/ui/Badge'
import Boton from '../../../components/ui/Boton'
import CampoFormulario, { LeyendaObligatorio } from '../../../components/ui/CampoFormulario'
import { GrupoChips } from '../../../components/ui/ChipsFiltro'
import EstadoCarga from '../../../components/ui/EstadoCarga'
import TablaDatos, { type ColumnaTabla, type EstadoTabla } from '../../../components/ui/TablaDatos'
import { puede, ROLES_SOLICITAR_IA } from '../../../config/permisos'
import { obtenerSesion } from '../../../config/sesion'
import { useConsulta } from '../../../hooks/useConsulta'
import { useFiltrosUrl } from '../../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS, rutaRevisionExtraccion } from '../../../router/rutasApp'
import { aErrorApi, type ErrorApi } from '../../../services/api/cliente'
import { listarExtracciones, solicitarExtraccion } from '../../../services/api/ia'
import type { EstadoSugerencia, SugerenciaIA } from '../../../types/ia'
import { insigniaSugerencia } from '../../../utils/estados'
import { formatearFecha, formatearFechaHora, formatearNumero, SIN_VALOR } from '../../../utils/formato'
import estilos from '../reportes/Reportes.module.css'
import estilosIa from './AsistenciaIa.module.css'

const TITULO = 'Extracción de informes de proveedores'
const ID_CAMPO_REPORTE = 'reporte-proveedor'
const POR_PAGINA = 25 // Paginación del back-end (Guía Web 5.5).

const MENSAJE_FALTA_REPORTE = 'Indica el número del reporte del proveedor que quieres analizar'
const MENSAJE_ENTERO = 'Usa un número entero positivo'

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

const COLUMNAS: ColumnaTabla<SugerenciaIA>[] = [
  { clave: 'id', titulo: 'Propuesta', render: (s) => `n.º ${s.id}` },
  { clave: 'registro_id', titulo: 'Reporte', render: (s) => `n.º ${s.registro_id}` },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (s) => <Badge {...insigniaSugerencia(s.estado, s.etiqueta_estado)} />,
  },
  { clave: 'fecha_creacion', titulo: 'Creada', render: (s) => formatearFechaHora(s.fecha_creacion) },
  {
    clave: 'faltantes',
    titulo: 'Campos faltantes',
    alineacion: 'derecha',
    render: (s) => formatearNumero(s.contenido.campos_obligatorios_faltantes.length),
  },
  {
    clave: 'fecha_validacion',
    titulo: 'Revisada',
    render: (s) => (s.fecha_validacion ? formatearFecha(s.fecha_validacion) : SIN_VALOR),
  },
]

export default function ExtraccionReporteProveedorPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.asistenciaIa, { texto: TITULO }])
  const navigate = useNavigate()
  const location = useLocation()
  const sesion = obtenerSesion()
  const puedeSolicitar = puede(sesion.rol, ROLES_SOLICITAR_IA)

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

  let estadoTabla: EstadoTabla | null = null
  if (consulta.estado === 'error') estadoTabla = 'error'
  else if (consulta.estado === 'cargando' && (consulta.cargaVisible || !consulta.datos))
    estadoTabla = consulta.cargaVisible ? 'cargando' : null
  else if (consulta.datos) estadoTabla = consulta.datos.count === 0 ? 'vacio' : 'exito'

  function abrirRevision(sugerencia: SugerenciaIA, aviso?: string) {
    const estado: EstadoNavegacionRevision = { aviso, volverA: location.search }
    navigate(rutaRevisionExtraccion(sugerencia.id), { state: estado })
  }

  // --- Solicitud de análisis ---------------------------------------------------------
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [numero, setNumero] = useState('')
  const [errorCampo, setErrorCampo] = useState<string | undefined>()
  const [analizando, setAnalizando] = useState(false)
  const [errorAnalisis, setErrorAnalisis] = useState<ErrorApi | null>(null)
  const [mostrarManual, setMostrarManual] = useState(false)

  function validarFormato(texto: string): string | undefined {
    if (texto.trim() === '') return undefined // la obligatoriedad se comprueba al enviar
    return /^\d+$/.test(texto.trim()) && Number(texto) >= 1 ? undefined : MENSAJE_ENTERO
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (analizando) return
    const texto = numero.trim()
    const error = texto === '' ? MENSAJE_FALTA_REPORTE : validarFormato(texto)
    setErrorCampo(error)
    if (error) {
      document.getElementById(ID_CAMPO_REPORTE)?.focus()
      return
    }
    setAnalizando(true)
    setErrorAnalisis(null)
    setMostrarManual(false)
    try {
      const sugerencia = await solicitarExtraccion(Number(texto))
      abrirRevision(sugerencia, 'Propuesta creada: pendiente de revisión')
    } catch (causa) {
      const errorApi = aErrorApi(causa)
      const mensajeCampo = errorApi.errores_campo.reporte_proveedor_id?.[0]
      if (errorApi.estado === 400 && mensajeCampo) {
        setErrorCampo(mensajeCampo)
        document.getElementById(ID_CAMPO_REPORTE)?.focus()
      } else {
        setErrorAnalisis(errorApi)
      }
      setAnalizando(false)
    }
  }

  return (
    <div className={estilos.pagina}>
      <AvisoEnLinea tono="info" titulo="Sugerencias generadas con IA">
        La IA propone datos a partir del informe final del proveedor. Nada se registra sin la revisión de una
        persona autorizada.
      </AvisoEnLinea>

      {puedeSolicitar && (
        <section className={estilos.seccion} aria-label="Analizar informe">
          {!formularioAbierto ? (
            <div>
              <Boton variante="primario" onClick={() => setFormularioAbierto(true)} aria-expanded={false}>
                Analizar informe
              </Boton>
            </div>
          ) : (
            <form className={estilosIa.formulario} onSubmit={enviar} noValidate>
              <LeyendaObligatorio />
              <div className={estilosIa.filaFormulario}>
                <CampoFormulario
                  id={ID_CAMPO_REPORTE}
                  etiqueta="Reporte del proveedor (n.º)"
                  ayuda="Número del reporte registrado en la atención tercerizada"
                  obligatorio
                  inputMode="numeric"
                  autoComplete="off"
                  value={numero}
                  error={errorCampo}
                  onChange={(e) => setNumero(e.target.value)}
                  onBlur={(e) => setErrorCampo(validarFormato(e.target.value))}
                  autoFocus
                />
                {/* TODO: sustituir por un selector cuando el MOD-05 publique el listado de reportes del
                    proveedor (CU-MOD05-006). El MOD-06 no tiene endpoint de reportes del proveedor. */}
                <div className={estilosIa.accionesFormulario}>
                  <Boton type="submit" variante="primario" cargando={analizando}>
                    Analizar informe
                  </Boton>
                  <Boton
                    variante="secundario"
                    deshabilitado={analizando}
                    onClick={() => {
                      setFormularioAbierto(false)
                      setErrorCampo(undefined)
                      setErrorAnalisis(null)
                      setMostrarManual(false)
                    }}
                  >
                    Cancelar
                  </Boton>
                </div>
              </div>
              {analizando && <EstadoCarga forma="tarjetas" texto="Analizando el informe del proveedor…" retrasar />}
            </form>
          )}

          {errorAnalisis && (
            <AvisoEnLinea
              tono="error"
              titulo="No se pudo analizar el informe"
              accion={
                errorAnalisis.estado === 503
                  ? { texto: 'Registrar manualmente', onClick: () => setMostrarManual(true) }
                  : undefined
              }
            >
              {errorAnalisis.detalle}
            </AvisoEnLinea>
          )}
          {mostrarManual && (
            <AvisoEnLinea tono="info">Registra los datos del informe en Servicios tercerizados</AvisoEnLinea>
          )}
        </section>
      )}

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
        {estadoTabla && (
          <TablaDatos
            titulo="Propuestas de extracción"
            columnas={COLUMNAS}
            filas={consulta.datos?.results ?? []}
            claveFila={(s) => String(s.id)}
            estado={estadoTabla}
            onFilaClick={(s) => abrirRevision(s)}
            paginacionServidor={{
              pagina,
              total: consulta.datos?.count ?? 0,
              porPagina: POR_PAGINA,
              onCambiarPagina: (nueva) => establecer({ page: nueva > 1 ? String(nueva) : null }),
            }}
            vacio={{
              titulo: 'Sin propuestas de extracción',
              descripcion: 'Aparecerán aquí cuando se analice un informe de proveedor',
              accion: estadoFiltro ? (
                <Boton variante="secundario" onClick={() => establecer({ estado: null, page: null })}>
                  Limpiar filtros
                </Boton>
              ) : undefined,
            }}
            error={
              consulta.error
                ? {
                    titulo: 'No se pudieron cargar las propuestas',
                    descripcion: consulta.error.detalle,
                    onReintentar: consulta.reintentar,
                  }
                : undefined
            }
          />
        )}
      </section>
    </div>
  )
}
