// RN-IA-002 · HU-MOD06-013 · CP-TR-MOD06-013 · RN-IA-001
/**
 * Revisión de una propuesta de prioridades de atención (mismo patrón que la revisión de RF-IA-001).
 *
 * RN-IA-001: la IA solo propone; el jefe de sección acepta, corrige o descarta cada prioridad antes de que quede
 * disponible para la programación (criterio 2). Cada elemento es una ficha que separa la «Sugerencia de la IA»
 * (con los datos que la sustentan, criterio 1) de «Tu decisión». El bloque de contexto informa de la suficiencia y
 * de lo que faltó (criterio 3).
 *
 * Solo el jefe de sección valida o rechaza (ROLES_VALIDAR_IA); los demás ven la propuesta sin acciones.
 */
import { useCallback, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import BloqueContextoIA from '@/components/reportes-indicadores/BloqueContextoIA'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import AvisoEnLinea, { type TonoAviso } from '@/components/ui/AvisoEnLinea'
import Pestanas from '@/components/ui/Pestanas'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import BarraAvance from '@/components/ui/BarraAvance'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import { AreaTexto, ResumenErrores, type ErrorResumen } from '@/components/ui/CampoFormulario'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import { puede, ROLES_VALIDAR_IA } from '@/config/permisos'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS, RUTAS } from '@/router/rutasApp'
import { aErrorApi } from '@/services/api/cliente'
import { obtenerPriorizacion, rechazarPriorizacion, validarPriorizacion } from '@/services/api/priorizacionIa'
import { useRolActual } from '@/sesion/ContextoSesion'
import type { PrioridadAtencion, SugerenciaPriorizacion } from '@/types/priorizacionIa'
import { insigniaSugerencia } from '@/utils/estados'
import { formatearFechaHora, formatearNumero } from '@/utils/formato'
import {
  contarPrioridades,
  cuerpoValidacion,
  decisionesCompletas,
  filtrarPorPrioridad,
  idPrioridadFinal,
  MENSAJES_PRIORIZACION,
  ordenarPorPuntuacion,
  PRIORIDADES,
  textoAlcance,
  type DecisionEnCurso,
} from '@/utils/priorizacionIa'
import estilos from '../reportes/Reportes.module.css'
import estilosIa from './AsistenciaIa.module.css'
import type { EstadoNavegacionRevision } from './ExtraccionReporteProveedorPage'
import { idDecision } from './extraccion/valoresCampo'
import FichaElemento from './priorizacion/FichaElemento'
import estilosPriorizacion from './priorizacion/Priorizacion.module.css'
import Estado from '@/components/ui/Estado'
import { insigniaAEstado } from '@/components/ui/tonos'

interface Revision {
  /** Versión de la propuesta a la que corresponde el estado. */
  clave: string
  decisiones: Record<string, DecisionEnCurso>
  errores: Record<string, string>
  mostrarResumen: boolean
}

/** Pestaña de prioridad sin filtro. */
const TODAS = 'todas'

const claveRevision = (s: SugerenciaPriorizacion) => `${s.id}|${s.estado}|${s.fecha_modificacion ?? ''}`

const revisionInicial = (s: SugerenciaPriorizacion): Revision => ({ clave: claveRevision(s), decisiones: {}, errores: {}, mostrarResumen: false })

export default function RevisionPriorizacionPage() {
  const { id } = useParams()
  const idNumero = Number(id)
  const idValido = Number.isInteger(idNumero) && idNumero > 0
  const location = useLocation()
  const navegacion = (location.state ?? null) as EstadoNavegacionRevision | null
  const rutaBandeja = `${RUTAS.priorizacionIa}${navegacion?.volverA ?? ''}`
  const rol = useRolActual()
  const puedeValidar = rol !== null && puede(rol, ROLES_VALIDAR_IA)

  usePaginaActual(`Propuesta de prioridades n.º ${id}`, [
    MIGAS.reportesIndicadores,
    MIGAS.asistenciaIa,
    { ...MIGAS.priorizacionIa, ruta: rutaBandeja },
    { texto: `Propuesta n.º ${id}` },
  ])

  const consulta = useConsulta<SugerenciaPriorizacion>(idValido ? `priorizacion|${idNumero}` : null, (signal) =>
    obtenerPriorizacion(idNumero, signal),
  )
  const propuesta = consulta.datos

  const [avisoTemporal, setAvisoTemporal] = useState<string | null>(navegacion?.aviso ?? null)
  const cerrarAvisoTemporal = useCallback(() => setAvisoTemporal(null), [])
  const [avisoAccion, setAvisoAccion] = useState<{ tono: TonoAviso; texto: string } | null>(null)
  const [dialogo, setDialogo] = useState<'validar' | 'rechazar' | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [filtro, setFiltro] = useState<PrioridadAtencion | ''>('')

  // El estado de la revisión se reinicia cuando cambia la propuesta (ajuste durante el render).
  const [revision, setRevision] = useState<Revision | null>(null)
  if (propuesta && revision?.clave !== claveRevision(propuesta)) {
    setRevision(revisionInicial(propuesta))
  }

  const volver = (
    <BotonEnlace to={rutaBandeja} variante="fantasma">
      Volver a la bandeja
    </BotonEnlace>
  )

  if (!idValido || consulta.error?.estado === 404) {
    return <EstadoVacio titulo="Propuesta no encontrada" descripcion={consulta.error?.detalle} accion={volver} />
  }
  if (consulta.estado === 'error' && consulta.error) {
    return (
      <div className={estilos.pagina}>
        <div>{volver}</div>
        <EstadoError titulo="No se pudo cargar la propuesta" descripcion={consulta.error.detalle} onReintentar={consulta.reintentar} />
      </div>
    )
  }
  if (!propuesta || !revision) {
    return consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  }

  const { contenido } = propuesta
  const elementos = ordenarPorPuntuacion(contenido.elementos)
  const enPropuesta = propuesta.estado === 'Propuesta'
  const editable = enPropuesta && puedeValidar
  const modo = editable ? 'editar' : enPropuesta ? 'consulta' : 'final'
  const pendientes = decisionesCompletas(elementos, revision.decisiones)
  const completa = Object.keys(pendientes).length === 0
  const decididos = elementos.filter((e) => revision.decisiones[e.clave]?.accion).length
  const sinDecidir = elementos.filter((e) => !revision.decisiones[e.clave]?.accion).length
  const cuenta = contarPrioridades(elementos)
  const visibles = filtrarPorPrioridad(elementos, filtro)

  function actualizar(clave: string, cambio: Partial<DecisionEnCurso>) {
    setRevision((r) => {
      if (!r) return r
      const errores = { ...r.errores }
      delete errores[clave]
      const actual = r.decisiones[clave] ?? { prioridad: '' }
      return { ...r, errores, decisiones: { ...r.decisiones, [clave]: { ...actual, ...cambio } } }
    })
  }

  /** Acepta de una vez las prioridades sin decisión (las ya decididas no cambian). */
  function aceptarPendientes() {
    setRevision((r) => {
      if (!r) return r
      const decisiones = { ...r.decisiones }
      const errores = { ...r.errores }
      for (const e of elementos) {
        if (!decisiones[e.clave]?.accion) {
          decisiones[e.clave] = { accion: 'aceptar', prioridad: '' }
          delete errores[e.clave]
        }
      }
      return { ...r, decisiones, errores }
    })
  }

  const destinoFoco = (clave: string) =>
    pendientes[clave] === MENSAJES_PRIORIZACION.sinPrioridad ? idPrioridadFinal(clave) : idDecision(clave, 'aceptar')

  function mostrarErrores(errores: Record<string, string> = pendientes) {
    setFiltro('')
    setRevision((r) => (r ? { ...r, errores, mostrarResumen: true } : r))
    const primero = elementos.find((e) => errores[e.clave])
    if (primero) window.setTimeout(() => document.getElementById(destinoFoco(primero.clave))?.focus(), 0)
  }

  async function ejecutar(accion: () => Promise<SugerenciaPriorizacion>) {
    if (enviando) return
    setEnviando(true)
    setAvisoAccion(null)
    try {
      const resultado = await accion()
      setDialogo(null)
      setMotivo('')
      setAvisoTemporal(resultado.estado === 'Rechazada' ? 'Propuesta rechazada' : 'Prioridades validadas')
      consulta.reintentar()
    } catch (causa) {
      const error = aErrorApi(causa)
      setDialogo(null)
      if (error.estado === 409) {
        setAvisoAccion({ tono: 'advertencia', texto: error.detalle })
        consulta.reintentar()
      } else if (error.estado === 400 && Object.keys(error.errores_campo).length > 0) {
        mostrarErrores(Object.fromEntries(Object.keys(error.errores_campo).map((clave) => [clave, MENSAJES_PRIORIZACION.sinDecision])))
      } else {
        setAvisoAccion({ tono: 'error', texto: error.detalle })
      }
    } finally {
      setEnviando(false)
    }
  }

  function confirmarValidacion() {
    if (!propuesta || !revision) return
    const cuerpo = cuerpoValidacion(elementos, revision.decisiones)
    if (cuerpo) void ejecutar(() => validarPriorizacion(propuesta.id, cuerpo))
  }

  const resumenEnCurso = elementos.reduce(
    (t, e) => {
      const accion = revision.decisiones[e.clave]?.accion
      if (accion === 'aceptar') t.aceptadas += 1
      else if (accion === 'corregir') t.corregidas += 1
      else if (accion === 'descartar') t.descartadas += 1
      return t
    },
    { aceptadas: 0, corregidas: 0, descartadas: 0 },
  )
  const erroresResumen: ErrorResumen[] = revision.mostrarResumen
    ? elementos
        .filter((e) => revision.errores[e.clave])
        .map((e) => ({ idCampo: destinoFoco(e.clave), mensaje: `${e.nombre}: ${revision.errores[e.clave]}` }))
    : []
  const resumenFinal = contenido.decision?.resumen

  return (
    <div className={`${estilos.pagina} ${editable ? estilosIa.conBarraFija : ''}`}>
      <div>{volver}</div>
      <AvisoDatosSimulados />

      <section className={estilosPriorizacion.cabecera} aria-label="Identificación de la propuesta">
        <div className={estilosPriorizacion.lineaTitulo}>
          <Estado {...insigniaAEstado(insigniaSugerencia(propuesta.estado, propuesta.etiqueta_estado))} />
          {enPropuesta && <span className={estilosPriorizacion.aviso}>Propuesta: aún no se ha registrado</span>}
        </div>
        <div className={estilosIa.datosFicha}>
          <span>Solicitada el {formatearFechaHora(propuesta.fecha_creacion)}</span>
          <span>{textoAlcance(contenido.entrada.alcance, contenido.entrada.horizonte_dias)}</span>
          <span>
            {formatearNumero(contenido.entrada.elementos_evaluados)} elementos evaluados · {contenido.ia.proveedor} · {contenido.ia.modelo}
          </span>
        </div>
      </section>

      <BloqueContextoIA contexto={contenido} tituloFaltantes="Faltan datos para una priorización confiable" />

      {propuesta.estado === 'Validada' && (
        <AvisoEnLinea tono="exito" titulo="Prioridades validadas">
          Validadas el {formatearFechaHora(propuesta.fecha_validacion)}. {resumenFinal?.aceptados ?? 0} aceptadas,{' '}
          {resumenFinal?.corregidos ?? 0} corregidas y {resumenFinal?.descartados ?? 0} descartadas. Las prioridades aceptadas o
          corregidas quedan disponibles para la programación.
        </AvisoEnLinea>
      )}
      {propuesta.estado === 'Rechazada' && (
        <AvisoEnLinea tono="info" titulo={`Propuesta rechazada el ${formatearFechaHora(propuesta.fecha_validacion)}`}>
          {contenido.decision?.motivo_rechazo ? `Motivo: ${contenido.decision.motivo_rechazo}` : undefined}
        </AvisoEnLinea>
      )}
      {enPropuesta && !puedeValidar && (
        <AvisoEnLinea tono="info">Solo la jefatura de sección puede validar estas prioridades</AvisoEnLinea>
      )}
      {avisoAccion && <AvisoEnLinea tono={avisoAccion.tono}>{avisoAccion.texto}</AvisoEnLinea>}

      <section className={estilos.seccion} aria-labelledby="titulo-ranking">
        <div className={estilosIa.cabeceraRevision}>
          <h2 id="titulo-ranking" className={estilos.tituloSeccion}>
            Prioridades sugeridas
          </h2>
          {editable && (
            <Boton variante="secundario" deshabilitado={sinDecidir === 0} onClick={aceptarPendientes}>
              Aceptar las pendientes ({formatearNumero(sinDecidir)})
            </Boton>
          )}
        </div>

        {editable && (
          <div className={estilosIa.avance}>
            <p className="cifra">
              <strong>{formatearNumero(decididos)}</strong> de {formatearNumero(elementos.length)} decididos
            </p>
            <BarraAvance
              valor={decididos}
              maximo={elementos.length}
              etiqueta="Avance de la revisión"
              textoValor={`${decididos} de ${elementos.length} decididos`}
            />
          </div>
        )}

        <Pestanas
          etiqueta="Prioridad sugerida"
          pestanas={[
            { valor: TODAS, texto: 'Todas', contador: elementos.length },
            ...PRIORIDADES.map((p) => ({ valor: p, texto: p, contador: cuenta[p] })),
          ]}
          valor={filtro || TODAS}
          onCambiar={(v) => setFiltro(PRIORIDADES.find((p) => p === v) ?? '')}
        >

          <ResumenErrores titulo={MENSAJES_PRIORIZACION.sinDecision} errores={erroresResumen} />

          {visibles.length === 0 ? (
            <EstadoVacio nivel={3} titulo="Ningún elemento con esta prioridad" descripcion="Elige «Todas» para ver todos los elementos." />
          ) : (
            <ul className={estilosIa.fichasCampo} aria-label="Elementos priorizados">
              {visibles.map((e) => (
                <FichaElemento
                  key={e.clave}
                  elemento={e}
                  modo={modo}
                  decision={revision.decisiones[e.clave]}
                  error={revision.errores[e.clave]}
                  final={contenido.decision?.por_elemento[e.clave]}
                  onAccion={(accion) => actualizar(e.clave, { accion })}
                  onPrioridad={(prioridad) => actualizar(e.clave, { prioridad })}
                />
              ))}
            </ul>
          )}
        </Pestanas>
      </section>

      {editable && (
        <div className={estilosIa.barraFija}>
          <p className={`${estilosIa.textoBarra} cifra`}>
            {formatearNumero(decididos)} de {formatearNumero(elementos.length)} decididos
          </p>
          <div className={estilosIa.acciones}>
            <Boton variante="destructivo" onClick={() => setDialogo('rechazar')}>
              Rechazar propuesta
            </Boton>
            <Boton variante="primario" deshabilitado={!completa} onClickDeshabilitado={() => mostrarErrores()} onClick={() => setDialogo('validar')}>
              Validar decisiones
            </Boton>
          </div>
        </div>
      )}

      <DialogoConfirmacion
        abierto={dialogo === 'validar'}
        titulo="Validar decisiones"
        consecuencia={`Se aceptarán ${resumenEnCurso.aceptadas}, se corregirán ${resumenEnCurso.corregidas} y se descartarán ${resumenEnCurso.descartadas} prioridades. Las prioridades aceptadas o corregidas quedarán disponibles para la programación. No se crea ninguna programación automáticamente.`}
        textoConfirmar="Validar decisiones"
        cargando={enviando}
        onConfirmar={confirmarValidacion}
        onCancelar={() => setDialogo(null)}
      />
      <DialogoConfirmacion
        abierto={dialogo === 'rechazar'}
        titulo="Rechazar propuesta"
        consecuencia="La propuesta se descartará completa y ninguna prioridad quedará disponible para la programación."
        textoConfirmar="Rechazar propuesta"
        variante="destructivo"
        cargando={enviando}
        onConfirmar={() => void ejecutar(() => rechazarPriorizacion(propuesta.id, motivo.trim() || null))}
        onCancelar={() => setDialogo(null)}
      >
        <AreaTexto id="motivo-rechazo" etiqueta="Motivo del rechazo" maxLength={1000} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </DialogoConfirmacion>

      <AvisoTemporal mensaje={avisoTemporal} onCerrar={cerrarAvisoTemporal} />
    </div>
  )
}
