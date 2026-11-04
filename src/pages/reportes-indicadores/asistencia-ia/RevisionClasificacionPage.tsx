// RF-IA-005 · HU-MOD06-007 · CU-MOD06-007 · RN-IA-001 · RN-019
/**
 * Revisión de la clasificación sugerida de una incidencia (sistema de diseño de Figma).
 *
 * - Cabecera con la incidencia (descripción, canal, espacio, ejemplar y fotografías).
 * - Una ficha de decisión por campo (categoría, subcategoría, prioridad, tipo de atención y si es sencilla), con su
 *   motivo. Categoría, prioridad y tipo de atención son obligatorios: no se pueden dejar vacíos.
 * - Con evidencia insuficiente (A1) o sin IA (E1), «Clasificar manualmente».
 * - Registrar solo guarda la clasificación: la incidencia no se deriva automáticamente.
 *
 * Solo la jefatura de sección valida o descarta (ROLES_VALIDAR_IA); los demás la ven sin acciones.
 */
import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import BloqueContextoIA from '@/components/reportes-indicadores/BloqueContextoIA'
import AvisoEnLinea, { type TonoAviso } from '@/components/ui/AvisoEnLinea'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import { ResumenErrores, type ErrorResumen } from '@/components/ui/CampoFormulario'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import EstadoVacio from '@/components/ui/EstadoVacio'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import Tarjeta from '@/components/ui/Tarjeta'
import { puede, ROLES_VALIDAR_IA } from '@/config/permisos'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS, RUTAS, rutaRevisionClasificacion } from '@/router/rutasApp'
import { aErrorApi } from '@/services/api/cliente'
import { descartarClasificacion, obtenerClasificacion, validarClasificacion } from '@/services/api/clasificacionIncidenciaIa'
import { useRolActual } from '@/sesion/ContextoSesion'
import type { CampoClasificacion, SugerenciaClasificacion } from '@/types/clasificacionIncidenciaIa'
import type { AccionDecision } from '@/types/ia'
import {
  CAMPOS,
  camposADecidir,
  camposSinDecidir,
  cuerpoValidacion,
  ETIQUETA_CAMPO,
  estadoClasificacion,
  idFicha,
  resumenClasificacion,
  textoValor,
  valoresRegistrados,
  type DecisionEnCursoCampo,
} from '@/utils/clasificacionIncidenciaIa'
import { formatearFechaHora, formatearNumero } from '@/utils/formato'
import estilos from '../reportes/Reportes.module.css'
import estilosIa from './AsistenciaIa.module.css'
import AntecedentesIncidencia from './clasificacion/AntecedentesIncidencia'
import CabeceraIncidencia from './clasificacion/CabeceraIncidencia'
import DialogoClasificacionManual from './clasificacion/DialogoClasificacionManual'
import FichasClasificacion from './clasificacion/FichasClasificacion'
import type { EstadoNavegacionRevision } from './ExtraccionReporteProveedorPage'

type Decisiones = Partial<Record<CampoClasificacion, DecisionEnCursoCampo>>

interface Revision {
  clave: string
  decisiones: Decisiones
  mostrarErrores: boolean
}

const claveRevision = (s: SugerenciaClasificacion) => `${s.id}|${s.estado}|${s.fecha_modificacion ?? ''}`

export default function RevisionClasificacionPage() {
  const { id } = useParams()
  const idNumero = Number(id)
  const idValido = Number.isInteger(idNumero) && idNumero > 0
  const location = useLocation()
  const navigate = useNavigate()
  const navegacion = (location.state ?? null) as EstadoNavegacionRevision | null
  const rutaLista = `${RUTAS.clasificacionIncidencias}${navegacion?.volverA ?? ''}`
  const rol = useRolActual()
  const puedeValidar = rol !== null && puede(rol, ROLES_VALIDAR_IA)

  const consulta = useConsulta<SugerenciaClasificacion>(idValido ? `clasificacion|${idNumero}` : null, (signal) => obtenerClasificacion(idNumero, signal))
  const sugerencia = consulta.datos
  const tituloPagina = sugerencia ? `Clasificación de ${sugerencia.contenido.incidencia.codigo}` : `Clasificación n.º ${id}`
  usePaginaActual(tituloPagina, [MIGAS.reportesIndicadores, MIGAS.asistenciaIa, { ...MIGAS.clasificacionIncidencias, ruta: rutaLista }, { texto: tituloPagina }])

  const [avisoTemporal, setAvisoTemporal] = useState<string | null>(navegacion?.aviso ?? null)
  const cerrarAvisoTemporal = useCallback(() => setAvisoTemporal(null), [])
  const [avisoAccion, setAvisoAccion] = useState<{ tono: TonoAviso; texto: string } | null>(null)
  const [dialogo, setDialogo] = useState<'registrar' | 'descartar' | null>(null)
  const [manual, setManual] = useState<{ id: number; codigo: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  const [revision, setRevision] = useState<Revision | null>(null)
  if (sugerencia && revision?.clave !== claveRevision(sugerencia)) {
    // Al corregir, el control parte del valor sugerido.
    const decisiones: Decisiones = {}
    for (const campo of CAMPOS) decisiones[campo] = { valor: sugerencia.contenido.sugerencia?.[campo] ?? null }
    setRevision({ clave: claveRevision(sugerencia), decisiones, mostrarErrores: false })
  }

  const volver = (
    <BotonEnlace to={rutaLista} variante="fantasma" icono="chevron-left">
      Volver a la clasificación de incidencias
    </BotonEnlace>
  )

  if (!idValido || consulta.error?.estado === 404) {
    return <EstadoVacio titulo="Clasificación no encontrada" descripcion={consulta.error?.detalle} accion={volver} />
  }
  if (consulta.error?.estado === 403) return <EstadoSinAcceso descripcion={consulta.error.detalle} />
  if (consulta.estado === 'error' && consulta.error) {
    return <EstadoError titulo="No se pudo cargar la clasificación" descripcion={consulta.error.detalle} onReintentar={consulta.reintentar} />
  }
  if (!sugerencia || !revision) return consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null

  const { contenido } = sugerencia
  const { incidencia } = contenido
  const pendiente = sugerencia.estado === 'Propuesta'
  const editable = pendiente && puedeValidar && contenido.sugerencia !== null
  const modo = editable ? 'editar' : pendiente ? 'consulta' : 'final'
  const decidir = camposADecidir(contenido.sugerencia)
  const errores = camposSinDecidir(contenido.sugerencia, revision.decisiones)
  const completa = Object.keys(errores).length === 0
  const decididos = decidir.filter((c) => revision.decisiones[c]?.accion).length
  const vistaPrevia = valoresRegistrados(contenido.sugerencia, revision.decisiones)

  const cambiar = (campo: CampoClasificacion, cambio: Partial<DecisionEnCursoCampo>) =>
    setRevision((r) => (r ? { ...r, decisiones: { ...r.decisiones, [campo]: { valor: null, ...r.decisiones[campo], ...cambio } } } : r))

  function mostrarErrores() {
    setRevision((r) => (r ? { ...r, mostrarErrores: true } : r))
    const primero = decidir.find((c) => errores[c])
    if (primero) window.setTimeout(() => document.getElementById(idFicha(primero))?.scrollIntoView({ block: 'center' }), 0)
  }

  async function ejecutar(accion: () => Promise<SugerenciaClasificacion>, texto: string) {
    if (enviando) return
    setEnviando(true)
    setAvisoAccion(null)
    try {
      await accion()
      setDialogo(null)
      setAvisoTemporal(texto)
      consulta.reintentar()
    } catch (causa) {
      const error = aErrorApi(causa)
      setDialogo(null)
      setAvisoAccion({ tono: error.estado === 409 ? 'advertencia' : 'error', texto: error.detalle })
      if (error.estado === 409) consulta.reintentar()
    } finally {
      setEnviando(false)
    }
  }

  function registrar() {
    const cuerpo = sugerencia ? cuerpoValidacion(contenido.sugerencia, revision?.decisiones ?? {}) : null
    if (!sugerencia || !cuerpo) return
    void ejecutar(() => validarClasificacion(sugerencia.id, cuerpo), 'Clasificación registrada')
  }

  const erroresResumen: ErrorResumen[] = revision.mostrarErrores
    ? decidir.filter((c) => errores[c]).map((c) => ({ idCampo: idFicha(c), mensaje: `${ETIQUETA_CAMPO[c]}: ${errores[c]}` }))
    : []
  const registrados = contenido.decision?.valores_registrados ?? null
  const abrirManual = () => setManual({ id: incidencia.id, codigo: incidencia.codigo })

  return (
    <div className={`${estilos.pagina} ${editable ? estilosIa.conBarraFija : ''}`}>
      <div>{volver}</div>
      <AvisoDatosSimulados />

      <CabeceraIncidencia
        incidencia={incidencia}
        insignias={
          <>
            <Estado {...estadoClasificacion(sugerencia.estado)} />
            {pendiente && <Estado tono="aviso" icono="triangle-alert" texto="Sugerencia: la incidencia aún no se ha clasificado" />}
          </>
        }
      />

      {contenido.suficiencia === 'insuficiente' && pendiente && (
        <AvisoEnLinea
          tono="advertencia"
          titulo="Evidencia insuficiente"
          accion={puedeValidar ? { texto: 'Clasificar manualmente', onClick: abrirManual } : undefined}
        >
          La descripción y las fotografías no bastan para una sugerencia confiable. Completa los campos que falten o clasifica la
          incidencia sin la IA.
        </AvisoEnLinea>
      )}
      {sugerencia.estado === 'Validada' && (
        <AvisoEnLinea tono="exito" titulo={`Clasificación registrada el ${formatearFechaHora(sugerencia.fecha_validacion)}`}>
          {contenido.sugerencia ? 'Se registraron los valores validados.' : 'Registrada de forma manual, sin sugerencia de la IA.'} La
          incidencia no se derivó: la derivación se hace desde la gestión de incidencias.
        </AvisoEnLinea>
      )}
      {sugerencia.estado === 'Rechazada' && (
        <AvisoEnLinea tono="info" titulo={`Sugerencia descartada el ${formatearFechaHora(sugerencia.fecha_validacion)}`}>
          La incidencia sigue pendiente de evaluar: puedes analizarla de nuevo o clasificarla manualmente.
        </AvisoEnLinea>
      )}
      {pendiente && !puedeValidar && <AvisoEnLinea tono="info">Solo la jefatura de sección puede validar o descartar esta sugerencia</AvisoEnLinea>}
      {avisoAccion && <AvisoEnLinea tono={avisoAccion.tono}>{avisoAccion.texto}</AvisoEnLinea>}

      <ResumenErrores titulo="Revisa la clasificación antes de registrarla" errores={erroresResumen} />

      {contenido.sugerencia ? (
        <FichasClasificacion
          contenido={contenido}
          modo={modo}
          decisiones={revision.decisiones}
          onDecidir={(campo, accion: AccionDecision) => cambiar(campo, { accion })}
          onCorregir={(campo, valor) => cambiar(campo, { valor })}
          errores={revision.mostrarErrores ? errores : {}}
        />
      ) : (
        registrados && (
          <Tarjeta titulo="Clasificación registrada" nivel={2} descripcion="Registrada de forma manual, sin sugerencia de la IA.">
            <ListaDescripcion elementos={CAMPOS.map((c) => ({ etiqueta: ETIQUETA_CAMPO[c], valor: textoValor(c, registrados[c]) }))} />
          </Tarjeta>
        )
      )}

      {contenido.sugerencia && <AntecedentesIncidencia antecedentes={contenido.antecedentes} />}
      {contenido.sugerencia && <BloqueContextoIA contexto={contenido} tituloFaltantes="Faltan datos para una clasificación confiable" />}

      {editable && (
        <div className={estilosIa.barraFija}>
          <p className={`${estilosIa.textoBarra} cifra`}>
            {formatearNumero(decididos)} de {formatearNumero(decidir.length)} decididos
          </p>
          <div className={estilosIa.acciones}>
            <Boton variante="fantasma" onClick={abrirManual}>
              Clasificar manualmente
            </Boton>
            <Boton variante="secundario" onClick={() => setDialogo('descartar')}>
              Descartar sugerencia
            </Boton>
            <Boton variante="primario" deshabilitado={!completa} onClickDeshabilitado={mostrarErrores} onClick={() => setDialogo('registrar')}>
              Registrar clasificación
            </Boton>
          </div>
        </div>
      )}

      <DialogoConfirmacion
        abierto={dialogo === 'registrar'}
        titulo="Registrar clasificación"
        consecuencia={`${resumenClasificacion(vistaPrevia)}. Se registra la clasificación de ${incidencia.codigo}. No se deriva la incidencia.`}
        textoConfirmar="Registrar clasificación"
        cargando={enviando}
        onConfirmar={registrar}
        onCancelar={() => setDialogo(null)}
      />
      <DialogoConfirmacion
        abierto={dialogo === 'descartar'}
        titulo="Descartar sugerencia"
        consecuencia={`No se registrará ninguna clasificación a partir de esta sugerencia. ${incidencia.codigo} seguirá pendiente de evaluar.`}
        textoConfirmar="Descartar sugerencia"
        variante="destructivo"
        cargando={enviando}
        onConfirmar={() => void ejecutar(() => descartarClasificacion(sugerencia.id, null), 'Sugerencia descartada')}
        onCancelar={() => setDialogo(null)}
      />
      <DialogoClasificacionManual
        incidencia={manual}
        onCerrar={() => setManual(null)}
        onRegistrada={(s) => {
          setManual(null)
          navigate(rutaRevisionClasificacion(s.id), { state: { aviso: 'Clasificación registrada sin sugerencia de la IA', volverA: navegacion?.volverA } })
        }}
      />
      <AvisoTemporal mensaje={avisoTemporal} onCerrar={cerrarAvisoTemporal} />
    </div>
  )
}
