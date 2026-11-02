// RF-IA-001 · HU-MOD06-010 · CU-MOD06-010 · CP-TR-MOD06-010 · RN-IA-001
/**
 * Revisión de una propuesta de extracción con IA (patrón «Ficha de detalle»).
 *
 * RN-IA-001: la salida de la IA es una recomendación; la validación humana es obligatoria antes de cualquier
 * efecto. Cada dato es una ficha que separa lo que propone la IA («Sugerencia de la IA», panel azul) de la
 * decisión de la persona («Tu decisión») o, ya validada, del «Valor final» con la insignia de la acción.
 *
 * - Avance de la revisión con filtros (todos, pendientes, no encontrados por la IA, obligatorios).
 * - «Aceptar sugerencias con valor»: acepta de una vez los datos pendientes que tienen sugerencia.
 * - Las acciones «Validar» y «Rechazar» quedan fijas al pie mientras se revisa.
 *
 * Solo el jefe de sección valida o rechaza (ROLES_VALIDAR_IA); los demás ven la propuesta sin acciones.
 */
import { useCallback, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import AvisoEnLinea, { type TonoAviso } from '../../../components/ui/AvisoEnLinea'
import AvisoTemporal from '../../../components/ui/AvisoTemporal'
import BarraAvance from '../../../components/ui/BarraAvance'
import Boton, { BotonEnlace } from '../../../components/ui/Boton'
import { AreaTexto, ResumenErrores, type ErrorResumen } from '../../../components/ui/CampoFormulario'
import { GrupoChips } from '../../../components/ui/ChipsFiltro'
import DialogoConfirmacion from '../../../components/ui/DialogoConfirmacion'
import EstadoCarga from '../../../components/ui/EstadoCarga'
import EstadoError from '../../../components/ui/EstadoError'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import { puede, ROLES_VALIDAR_IA } from '../../../config/permisos'
import { useRolActual } from '../../../sesion/ContextoSesion'
import { useConsulta } from '../../../hooks/useConsulta'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS, RUTAS } from '../../../router/rutasApp'
import { aErrorApi } from '../../../services/api/cliente'
import { obtenerExtraccion, rechazarExtraccion, validarExtraccion } from '../../../services/api/ia'
import { claveCampo, type CampoSolicitado, type CuerpoValidacion, type SugerenciaIA } from '../../../types/ia'
import { formatearFechaHora, formatearNumero } from '../../../utils/formato'
import estilos from '../reportes/Reportes.module.css'
import estilosIa from './AsistenciaIa.module.css'
import type { EstadoNavegacionRevision } from './ExtraccionReporteProveedorPage'
import CabeceraPropuesta from './extraccion/CabeceraPropuesta'
import FichaCampo, { type DecisionCampo } from './extraccion/FichaCampo'
import {
  convertirCorreccion,
  idCorreccion,
  idDecision,
  MENSAJES,
  pasaFiltro,
  tieneValor,
  valorATexto,
  valorSugerido,
  type FiltroCampos,
} from './extraccion/valoresCampo'

const FILTROS: { valor: FiltroCampos; texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'pendientes', texto: 'Pendientes' },
  { valor: 'sin_valor', texto: 'No encontrados por la IA' },
  { valor: 'obligatorios', texto: 'Obligatorios' },
]

// =============================================================================
// Estado de la revisión
// =============================================================================

interface Revision {
  /** Identifica la versión de la propuesta a la que corresponde el estado. */
  clave: string
  decisiones: Record<string, DecisionCampo>
  errores: Record<string, string>
  mostrarResumen: boolean
}

function claveRevision(s: SugerenciaIA): string {
  return `${s.id}|${s.estado}|${s.fecha_modificacion ?? ''}`
}

function revisionInicial(s: SugerenciaIA): Revision {
  const decisiones: Record<string, DecisionCampo> = {}
  for (const campo of s.contenido.entrada.campos_solicitados) {
    decisiones[claveCampo(campo.campo_id)] = { texto: valorATexto(campo.tipo_dato, valorSugerido(s, campo)) }
  }
  return { clave: claveRevision(s), decisiones, errores: {}, mostrarResumen: false }
}

// =============================================================================
// Página
// =============================================================================

export default function RevisionExtraccionPage() {
  const { id } = useParams()
  const idNumero = Number(id)
  const idValido = Number.isInteger(idNumero) && idNumero > 0
  const location = useLocation()
  const navegacion = (location.state ?? null) as EstadoNavegacionRevision | null
  const rutaBandeja = `${RUTAS.extraccionReportes}${navegacion?.volverA ?? ''}`
  const rol = useRolActual()
  const puedeValidar = rol !== null && puede(rol, ROLES_VALIDAR_IA)

  usePaginaActual(`Revisión de la propuesta n.º ${id}`, [
    MIGAS.reportesIndicadores,
    MIGAS.asistenciaIa,
    { ...MIGAS.extraccionReportes, ruta: rutaBandeja },
    { texto: `Propuesta n.º ${id}` },
  ])

  const consulta = useConsulta<SugerenciaIA>(idValido ? `propuesta|${idNumero}` : null, (signal) =>
    obtenerExtraccion(idNumero, signal),
  )
  const sugerencia = consulta.datos

  const [avisoTemporal, setAvisoTemporal] = useState<string | null>(navegacion?.aviso ?? null)
  const cerrarAvisoTemporal = useCallback(() => setAvisoTemporal(null), [])
  const [avisoAccion, setAvisoAccion] = useState<{ tono: TonoAviso; texto: string } | null>(null)
  const [dialogo, setDialogo] = useState<'validar' | 'rechazar' | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [filtro, setFiltro] = useState<FiltroCampos>('todos')

  // El estado de la revisión se reinicia cuando cambia la propuesta (patrón de ajuste durante el render).
  const [revision, setRevision] = useState<Revision | null>(null)
  if (sugerencia && revision?.clave !== claveRevision(sugerencia)) {
    setRevision(revisionInicial(sugerencia))
  }

  const volver = (
    <BotonEnlace to={rutaBandeja} variante="terciario">
      Volver a la bandeja
    </BotonEnlace>
  )

  // --- Estados de carga ---------------------------------------------------------
  if (!idValido || consulta.error?.estado === 404) {
    return <EstadoVacio titulo="Propuesta no encontrada" descripcion={consulta.error?.detalle} accion={volver} />
  }
  if (consulta.estado === 'error' && consulta.error) {
    return (
      <div className={estilos.pagina}>
        <div>{volver}</div>
        <EstadoError
          titulo="No se pudo cargar la propuesta"
          descripcion={consulta.error.detalle}
          onReintentar={consulta.reintentar}
        />
      </div>
    )
  }
  if (!sugerencia || !revision) {
    return consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  }

  // --- Datos de la propuesta -----------------------------------------------------
  const { contenido } = sugerencia
  const campos = contenido.entrada.campos_solicitados
  const enPropuesta = sugerencia.estado === 'Propuesta'
  const editable = enPropuesta && puedeValidar
  const nombreCampo = (c: CampoSolicitado) => c.nombre_campo ?? claveCampo(c.campo_id)
  const sinValor = (c: CampoSolicitado) => !tieneValor(valorSugerido(sugerencia, c))

  function actualizarDecision(clave: string, cambio: Partial<DecisionCampo>) {
    setRevision((r) => {
      if (!r) return r
      const errores = { ...r.errores }
      delete errores[clave]
      return { ...r, errores, decisiones: { ...r.decisiones, [clave]: { ...r.decisiones[clave], ...cambio } } }
    })
  }

  /** Acepta de una vez los datos pendientes que tienen sugerencia (las decisiones ya tomadas no cambian). */
  function aceptarConValor() {
    setRevision((r) => {
      if (!r) return r
      const decisiones = { ...r.decisiones }
      const errores = { ...r.errores }
      for (const campo of campos) {
        const clave = claveCampo(campo.campo_id)
        if (!decisiones[clave]?.accion && !sinValor(campo)) {
          decisiones[clave] = { ...decisiones[clave], accion: 'aceptar' }
          delete errores[clave]
        }
      }
      return { ...r, decisiones, errores }
    })
  }

  /** Validación de formato al salir del campo de corrección. */
  function validarAlSalir(campo: CampoSolicitado) {
    const clave = claveCampo(campo.campo_id)
    setRevision((r) => {
      if (!r) return r
      const texto = r.decisiones[clave]?.texto ?? ''
      const { error } = convertirCorreccion(campo.tipo_dato, texto)
      const errores = { ...r.errores }
      // La obligatoriedad se comprueba al enviar; aquí solo el formato de lo escrito.
      if (error && texto.trim() !== '' && campo.tipo_dato !== 'Booleano') errores[clave] = error
      else delete errores[clave]
      return { ...r, errores }
    })
  }

  /** Errores de toda la revisión (decisión pendiente o corrección no válida). */
  function erroresRevision(r: Revision): Record<string, string> {
    const errores: Record<string, string> = {}
    for (const campo of campos) {
      const clave = claveCampo(campo.campo_id)
      const decision = r.decisiones[clave]
      if (!decision?.accion) errores[clave] = MENSAJES.sinDecision
      else if (decision.accion === 'corregir') {
        const { error } = convertirCorreccion(campo.tipo_dato, decision.texto)
        if (error) errores[clave] = error
      }
    }
    return errores
  }

  const erroresActuales = erroresRevision(revision)
  const completa = Object.keys(erroresActuales).length === 0

  function destinoFoco(clave: string): string {
    const decision = revision?.decisiones[clave]
    if (decision?.accion === 'corregir') return idCorreccion(clave)
    const campo = campos.find((c) => claveCampo(c.campo_id) === clave)
    return idDecision(clave, campo && sinValor(campo) ? 'corregir' : 'aceptar')
  }

  function mostrarErrores() {
    setFiltro('todos') // que se vean todas las fichas con error
    setRevision((r) => (r ? { ...r, errores: erroresActuales, mostrarResumen: true } : r))
    const primero = campos.map((c) => claveCampo(c.campo_id)).find((clave) => erroresActuales[clave])
    if (primero) window.setTimeout(() => document.getElementById(destinoFoco(primero))?.focus(), 0)
  }

  const resumenDecisiones = campos.reduce(
    (total, campo) => {
      const accion = revision.decisiones[claveCampo(campo.campo_id)]?.accion
      if (accion === 'descartar') total.descartados += 1
      else if (accion) total.validados += 1
      if (accion) total.decididos += 1
      else if (!sinValor(campo)) total.pendientesConValor += 1
      return total
    },
    { validados: 0, descartados: 0, decididos: 0, pendientesConValor: 0 },
  )

  /** Asocia un 400 del back-end al campo que nombra («campo 'Metrado'»), o lo muestra en un aviso. */
  function mostrarError400(detalle: string) {
    const campo = campos.find((c) => c.nombre_campo && detalle.includes(`'${c.nombre_campo}'`))
    if (campo) {
      const clave = claveCampo(campo.campo_id)
      setRevision((r) => (r ? { ...r, errores: { ...r.errores, [clave]: detalle }, mostrarResumen: true } : r))
    } else {
      setAvisoAccion({ tono: 'error', texto: detalle })
    }
  }

  async function ejecutar(accion: () => Promise<SugerenciaIA>) {
    if (enviando) return
    setEnviando(true)
    setAvisoAccion(null)
    try {
      const resultado = await accion()
      setDialogo(null)
      setMotivo('')
      setAvisoTemporal(resultado.estado === 'Rechazada' ? 'Propuesta rechazada' : 'Propuesta validada')
      consulta.reintentar()
    } catch (causa) {
      const error = aErrorApi(causa)
      setDialogo(null)
      if (error.estado === 409) {
        setAvisoAccion({ tono: 'advertencia', texto: error.detalle })
        consulta.reintentar()
      } else if (error.estado === 400) {
        mostrarError400(error.detalle)
      } else {
        setAvisoAccion({ tono: 'error', texto: error.detalle })
      }
    } finally {
      setEnviando(false)
    }
  }

  function confirmarValidacion() {
    if (!revision) return
    const decisiones: CuerpoValidacion['decisiones'] = {}
    for (const campo of campos) {
      const clave = claveCampo(campo.campo_id)
      const decision = revision.decisiones[clave]
      if (!decision?.accion) return
      decisiones[clave] =
        decision.accion === 'corregir'
          ? { accion: 'corregir', valor_final: convertirCorreccion(campo.tipo_dato, decision.texto).valor ?? null }
          : { accion: decision.accion }
    }
    // oxlint-disable-next-line typescript/no-non-null-assertion -- revision solo existe cuando hay sugerencia
    void ejecutar(() => validarExtraccion(sugerencia!.id, { decisiones }))
  }

  const erroresResumen: ErrorResumen[] = revision.mostrarResumen
    ? campos
        .map((c) => ({ c, clave: claveCampo(c.campo_id) }))
        .filter(({ clave }) => revision.errores[clave])
        .map(({ c, clave }) => ({ idCampo: destinoFoco(clave), mensaje: `${nombreCampo(c)}: ${revision.errores[clave]}` }))
    : []
  const hayPendientes = Object.values(revision.errores).includes(MENSAJES.sinDecision)
  const resumen = contenido.decision?.resumen
  const modo = editable ? 'editar' : enPropuesta ? 'consulta' : 'final'
  const opcionesFiltro = editable ? FILTROS : FILTROS.filter((f) => f.valor !== 'pendientes')
  const visibles = campos.filter((c) =>
    pasaFiltro(filtro, c, valorSugerido(sugerencia, c), revision.decisiones[claveCampo(c.campo_id)]?.accion),
  )

  return (
    <div className={`${estilos.pagina} ${editable ? estilosIa.conBarraFija : ''}`}>
      <div>{volver}</div>

      <CabeceraPropuesta sugerencia={sugerencia} />

      {contenido.campos_obligatorios_faltantes.length > 0 && (
        <AvisoEnLinea tono="advertencia" titulo="Datos mínimos no encontrados en el informe">
          <p>La IA no encontró estos datos obligatorios. Complétalos al corregir o regístralos manualmente.</p>
          <ul>
            {contenido.campos_obligatorios_faltantes.map((nombre) => (
              <li key={nombre}>{nombre}</li>
            ))}
          </ul>
        </AvisoEnLinea>
      )}

      {sugerencia.estado === 'Validada' && (
        <AvisoEnLinea tono="exito" titulo="Propuesta validada">
          Validada el {formatearFechaHora(sugerencia.fecha_validacion)}. {resumen?.aceptados ?? 0} aceptados,{' '}
          {resumen?.corregidos ?? 0} corregidos, {resumen?.descartados ?? 0} descartados. Los datos validados quedan
          disponibles para registrarse en Servicios tercerizados.
        </AvisoEnLinea>
      )}
      {sugerencia.estado === 'Rechazada' && (
        <AvisoEnLinea tono="info" titulo={`Propuesta rechazada el ${formatearFechaHora(sugerencia.fecha_validacion)}`}>
          {contenido.decision?.motivo_rechazo ? `Motivo: ${contenido.decision.motivo_rechazo}` : undefined}
        </AvisoEnLinea>
      )}
      {enPropuesta && !puedeValidar && (
        <AvisoEnLinea tono="info">Solo el jefe de sección puede validar o rechazar esta propuesta</AvisoEnLinea>
      )}
      {avisoAccion && <AvisoEnLinea tono={avisoAccion.tono}>{avisoAccion.texto}</AvisoEnLinea>}

      <section className={estilos.seccion} aria-labelledby="titulo-revision">
        <div className={estilosIa.cabeceraRevision}>
          <h2 id="titulo-revision" className={estilos.tituloSeccion}>
            Revisión campo por campo
          </h2>
          {editable && (
            <Boton variante="secundario" deshabilitado={resumenDecisiones.pendientesConValor === 0} onClick={aceptarConValor}>
              Aceptar sugerencias con valor ({formatearNumero(resumenDecisiones.pendientesConValor)})
            </Boton>
          )}
        </div>

        {editable && (
          <div className={estilosIa.avance}>
            <p className="cifra">
              <strong>{formatearNumero(resumenDecisiones.decididos)}</strong> de {formatearNumero(campos.length)} datos
              decididos
            </p>
            <BarraAvance
              valor={resumenDecisiones.decididos}
              maximo={campos.length}
              etiqueta="Avance de la revisión"
              textoValor={`${resumenDecisiones.decididos} de ${campos.length} datos decididos`}
            />
          </div>
        )}

        <GrupoChips
          etiqueta="Mostrar datos"
          opciones={opcionesFiltro}
          valor={filtro}
          onCambiar={(v) => setFiltro(v as FiltroCampos)}
        />

        <ResumenErrores titulo={hayPendientes ? MENSAJES.sinDecision : MENSAJES.correcciones} errores={erroresResumen} />

        {visibles.length === 0 ? (
          <EstadoVacio nivel={3} titulo="Ningún dato con este filtro" descripcion="Elige «Todos» para ver todos los datos." />
        ) : (
          <ul className={estilosIa.fichasCampo} aria-label="Datos de la propuesta">
            {visibles.map((c) => {
              const clave = claveCampo(c.campo_id)
              return (
                <FichaCampo
                  key={clave}
                  campo={c}
                  sugerido={valorSugerido(sugerencia, c)}
                  modo={modo}
                  decision={revision.decisiones[clave]}
                  error={revision.errores[clave]}
                  final={contenido.decision?.por_campo[clave]}
                  onAccion={(accion) => actualizarDecision(clave, { accion })}
                  onTexto={(texto) => actualizarDecision(clave, { texto })}
                  onSalir={() => validarAlSalir(c)}
                />
              )
            })}
          </ul>
        )}
      </section>

      {editable && (
        <div className={estilosIa.barraFija}>
          <p className={`${estilosIa.textoBarra} cifra`}>
            {completa
              ? 'Todos los datos tienen decisión'
              : `Faltan ${formatearNumero(campos.length - resumenDecisiones.decididos)} datos por decidir`}
          </p>
          <div className={estilosIa.acciones}>
            <Boton variante="destructivo" onClick={() => setDialogo('rechazar')}>
              Rechazar propuesta
            </Boton>
            <Boton
              variante="primario"
              deshabilitado={!completa}
              onClickDeshabilitado={mostrarErrores}
              onClick={() => setDialogo('validar')}
            >
              Validar propuesta
            </Boton>
          </div>
        </div>
      )}

      <DialogoConfirmacion
        abierto={dialogo === 'validar'}
        titulo="Validar propuesta"
        consecuencia={`Se registrarán como validados ${resumenDecisiones.validados} datos y se descartarán ${resumenDecisiones.descartados}. Esta acción no se puede deshacer.`}
        textoConfirmar="Validar propuesta"
        cargando={enviando}
        onConfirmar={confirmarValidacion}
        onCancelar={() => setDialogo(null)}
      />
      <DialogoConfirmacion
        abierto={dialogo === 'rechazar'}
        titulo="Rechazar propuesta"
        consecuencia="La propuesta se descartará completa y ningún dato se registrará."
        textoConfirmar="Rechazar propuesta"
        variante="destructivo"
        cargando={enviando}
        onConfirmar={() => void ejecutar(() => rechazarExtraccion(sugerencia.id, motivo.trim() || null))}
        onCancelar={() => setDialogo(null)}
      >
        <AreaTexto
          id="motivo-rechazo"
          etiqueta="Motivo del rechazo"
          maxLength={1000}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </DialogoConfirmacion>

      <AvisoTemporal mensaje={avisoTemporal} onCerrar={cerrarAvisoTemporal} />
    </div>
  )
}
