// RF-IA-001 · HU-MOD06-010 · CU-MOD06-010 · CP-TR-MOD06-010 · RN-IA-001
/**
 * Revisión de una propuesta de extracción con IA (patrón «Ficha de detalle»).
 *
 * RN-IA-001: la salida de la IA es una recomendación; la validación humana es obligatoria antes de cualquier
 * efecto, y la interfaz distingue entre datos registrados, sugerencias de IA («Sugerencia») y decisiones
 * validadas por el usuario («Valor final», con la insignia de la acción).
 *
 * Solo el jefe de sección valida o rechaza (ROLES_VALIDAR_IA); los demás ven la propuesta sin acciones.
 */
import { useCallback, useState, type ReactNode } from 'react'
import { useLocation, useParams } from 'react-router'
import AvisoEnLinea, { type TonoAviso } from '../../../components/ui/AvisoEnLinea'
import AvisoTemporal from '../../../components/ui/AvisoTemporal'
import Badge from '../../../components/ui/Badge'
import Boton, { BotonEnlace } from '../../../components/ui/Boton'
import CampoFormulario, { AreaTexto, ResumenErrores, type ErrorResumen } from '../../../components/ui/CampoFormulario'
import DialogoConfirmacion from '../../../components/ui/DialogoConfirmacion'
import EstadoCarga from '../../../components/ui/EstadoCarga'
import EstadoError from '../../../components/ui/EstadoError'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import Icono from '../../../components/ui/Icono'
import Selector from '../../../components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '../../../components/ui/TablaDatos'
import { puede, ROLES_VALIDAR_IA } from '../../../config/permisos'
import { obtenerSesion } from '../../../config/sesion'
import { useConsulta } from '../../../hooks/useConsulta'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS, RUTAS } from '../../../router/rutasApp'
import { aErrorApi } from '../../../services/api/cliente'
import { obtenerExtraccion, rechazarExtraccion, validarExtraccion } from '../../../services/api/ia'
import {
  claveCampo,
  type AccionDecision,
  type CampoSolicitado,
  type CuerpoValidacion,
  type SugerenciaIA,
  type TipoDato,
  type ValorCampo,
} from '../../../types/ia'
import { ETIQUETA_OPCION_ACCION, insigniaAccion, insigniaSugerencia } from '../../../utils/estados'
import { esFechaIsoValida, formatearFecha, formatearFechaHora, formatearNumero, SIN_VALOR } from '../../../utils/formato'
import estilos from '../reportes/Reportes.module.css'
import estilosIa from './AsistenciaIa.module.css'
import type { EstadoNavegacionRevision } from './ExtraccionReporteProveedorPage'

const ACCIONES: AccionDecision[] = ['aceptar', 'corregir', 'descartar']

/** Mensajes de la revisión. */
const MENSAJES = {
  sinDecision: 'Elige una decisión para cada dato',
  sinValorAceptar: 'No hay valor que aceptar: corrígelo o descártalo',
  json: 'Escribe una lista JSON válida, por ejemplo [{"nombre": "..."}]',
  vacio: 'Escribe el valor corregido',
  entero: 'Escribe un número entero, por ejemplo 12',
  decimal: 'Escribe un número, por ejemplo 1250,5',
  booleano: 'Elige Sí o No',
  fecha: 'Indica una fecha válida',
  correcciones: 'Corrige los valores marcados',
} as const

// =============================================================================
// Valores: presentación y conversión
// =============================================================================

function textoValorSimple(valor: unknown, tipo?: TipoDato | null): string {
  if (valor === null || valor === undefined) return SIN_VALOR
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (typeof valor === 'number') return formatearNumero(valor)
  if (typeof valor === 'string') return tipo === 'Fecha' || esFechaIsoValida(valor) ? formatearFecha(valor) : valor
  return JSON.stringify(valor)
}

/** Objeto de una lista JSON como «clave: valor · clave: valor». */
function textoObjeto(objeto: Record<string, unknown>): string {
  return Object.entries(objeto)
    .map(([clave, valor]) => `${clave}: ${textoValorSimple(valor)}`)
    .join(' · ')
}

/** Valor legible: listas JSON como lista, cifras y fechas con el formato de la Guía Web 7. */
function ValorLegible({ valor, tipo, textoNulo }: { valor: ValorCampo; tipo: TipoDato | null; textoNulo: string }) {
  if (valor === null || valor === undefined) return <span className={estilosIa.noEncontrado}>{textoNulo}</span>
  if (Array.isArray(valor)) {
    if (valor.length === 0) return <span className={estilosIa.noEncontrado}>{SIN_VALOR}</span>
    return (
      <ul className={estilosIa.listaJson}>
        {valor.map((objeto, i) => (
          <li key={i}>
            {objeto && typeof objeto === 'object' ? textoObjeto(objeto) : textoValorSimple(objeto)}
          </li>
        ))}
      </ul>
    )
  }
  return <span className={typeof valor === 'number' ? 'cifra' : undefined}>{textoValorSimple(valor, tipo)}</span>
}

/** Texto inicial del campo de corrección, a partir del valor sugerido. */
function valorATexto(tipo: TipoDato | null, valor: ValorCampo): string {
  if (valor === null || valor === undefined) return ''
  if (tipo === 'Booleano') return valor ? 'si' : 'no'
  if (tipo === 'Decimal' && typeof valor === 'number') return String(valor).replace('.', ',')
  if (tipo === 'JSON') return JSON.stringify(valor, null, 2)
  return String(valor)
}

/** Convierte el texto del campo de corrección al tipo del dato, o devuelve qué hacer. */
function convertirCorreccion(tipo: TipoDato | null, texto: string): { valor?: ValorCampo; error?: string } {
  const limpio = texto.trim()
  switch (tipo) {
    case 'Entero':
      if (limpio === '') return { error: MENSAJES.vacio }
      return /^-?\d+$/.test(limpio) ? { valor: Number(limpio) } : { error: MENSAJES.entero }
    case 'Decimal': {
      if (limpio === '') return { error: MENSAJES.vacio }
      const normalizado = limpio.replace(/[\s ]/g, '').replace(',', '.')
      return /^-?\d+(\.\d+)?$/.test(normalizado) ? { valor: Number(normalizado) } : { error: MENSAJES.decimal }
    }
    case 'Booleano':
      if (limpio === 'si') return { valor: true }
      if (limpio === 'no') return { valor: false }
      return { error: MENSAJES.booleano }
    case 'Fecha':
      if (limpio === '') return { error: MENSAJES.vacio }
      return esFechaIsoValida(limpio) ? { valor: limpio } : { error: MENSAJES.fecha }
    case 'JSON': {
      if (limpio === '') return { error: MENSAJES.json }
      try {
        const lista: unknown = JSON.parse(limpio)
        const valida =
          Array.isArray(lista) && lista.every((e) => e !== null && typeof e === 'object' && !Array.isArray(e))
        return valida ? { valor: lista as Record<string, unknown>[] } : { error: MENSAJES.json }
      } catch {
        return { error: MENSAJES.json }
      }
    }
    default: // Texto, Texto largo o sin tipo
      return limpio === '' ? { error: MENSAJES.vacio } : { valor: texto }
  }
}

// =============================================================================
// Estado de la revisión
// =============================================================================

interface DecisionCampo {
  accion?: AccionDecision
  texto: string
}

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
    const clave = claveCampo(campo.campo_id)
    decisiones[clave] = { texto: valorATexto(campo.tipo_dato, s.contenido.propuesta[clave]?.valor ?? null) }
  }
  return { clave: claveRevision(s), decisiones, errores: {}, mostrarResumen: false }
}

const idDecision = (clave: string, accion: AccionDecision) => `decision-${clave}-${accion}`
const idCorreccion = (clave: string) => `correccion-${clave}`

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
  const puedeValidar = puede(obtenerSesion().rol, ROLES_VALIDAR_IA)

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
  const conValor = campos.filter((c) => {
    const valor = contenido.propuesta[claveCampo(c.campo_id)]?.valor
    return valor !== null && valor !== undefined
  }).length
  const nombreCampo = (c: CampoSolicitado) => c.nombre_campo ?? claveCampo(c.campo_id)

  function actualizarDecision(clave: string, cambio: Partial<DecisionCampo>) {
    setRevision((r) => {
      if (!r) return r
      const errores = { ...r.errores }
      delete errores[clave]
      return { ...r, errores, decisiones: { ...r.decisiones, [clave]: { ...r.decisiones[clave], ...cambio } } }
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
    const sinValor = contenido.propuesta[clave]?.valor === null || contenido.propuesta[clave]?.valor === undefined
    return idDecision(clave, sinValor ? 'corregir' : 'aceptar')
  }

  function mostrarErrores() {
    setRevision((r) => (r ? { ...r, errores: erroresActuales, mostrarResumen: true } : r))
    const primero = campos.map((c) => claveCampo(c.campo_id)).find((clave) => erroresActuales[clave])
    if (primero) window.setTimeout(() => document.getElementById(destinoFoco(primero))?.focus(), 0)
  }

  const resumenDecisiones = campos.reduce(
    (total, campo) => {
      const accion = revision.decisiones[claveCampo(campo.campo_id)]?.accion
      if (accion === 'descartar') total.descartados += 1
      else if (accion) total.validados += 1
      return total
    },
    { validados: 0, descartados: 0 },
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
    void ejecutar(() => validarExtraccion(sugerencia!.id, { decisiones }))
  }

  // --- Columnas --------------------------------------------------------------------
  function campoCorreccion(campo: CampoSolicitado): ReactNode {
    const clave = claveCampo(campo.campo_id)
    const comun = {
      id: idCorreccion(clave),
      etiqueta: `Valor corregido de ${nombreCampo(campo)}`,
      etiquetaOculta: true,
      error: revision?.errores[clave] !== MENSAJES.sinDecision ? revision?.errores[clave] : undefined,
    }
    const texto = revision?.decisiones[clave]?.texto ?? ''
    const cambiar = (valor: string) => actualizarDecision(clave, { texto: valor })
    switch (campo.tipo_dato) {
      case 'Texto largo':
      case 'JSON':
        return (
          <AreaTexto
            {...comun}
            rows={campo.tipo_dato === 'JSON' ? 4 : 3}
            value={texto}
            onChange={(e) => cambiar(e.target.value)}
            onBlur={() => validarAlSalir(campo)}
          />
        )
      case 'Booleano':
        return (
          <Selector
            {...comun}
            valor={texto}
            opcionTodos="Elige una opción"
            opciones={[
              { valor: 'si', texto: 'Sí' },
              { valor: 'no', texto: 'No' },
            ]}
            onCambiar={cambiar}
          />
        )
      default:
        return (
          <CampoFormulario
            {...comun}
            type={campo.tipo_dato === 'Fecha' ? 'date' : 'text'}
            inputMode={campo.tipo_dato === 'Entero' ? 'numeric' : campo.tipo_dato === 'Decimal' ? 'decimal' : undefined}
            value={texto}
            onChange={(e) => cambiar(e.target.value)}
            onBlur={() => validarAlSalir(campo)}
          />
        )
    }
  }

  const columnaDato: ColumnaTabla<CampoSolicitado> = {
    clave: 'dato',
    titulo: 'Dato',
    render: (c) => (
      <span className={estilosIa.celdaDato}>
        <span>
          {nombreCampo(c)}
          {c.obligatorio && (
            <>
              <span className={estilosIa.asterisco} aria-hidden="true">
                {' '}
                *
              </span>
              <span className="sr-only"> (obligatorio)</span>
            </>
          )}
        </span>
        {c.tipo_dato && <span className={estilosIa.tipoDato}>{c.tipo_dato}</span>}
      </span>
    ),
  }

  const columnaSugerencia: ColumnaTabla<CampoSolicitado> = {
    clave: 'sugerencia',
    titulo: 'Sugerencia de IA',
    multilinea: true,
    render: (c) => (
      <span className={estilosIa.celdaValor}>
        <Badge tono="info" texto="Sugerencia" />
        <ValorLegible
          valor={contenido.propuesta[claveCampo(c.campo_id)]?.valor ?? null}
          tipo={c.tipo_dato}
          textoNulo="No encontrado en el informe"
        />
      </span>
    ),
  }

  const columnaDecision: ColumnaTabla<CampoSolicitado> = {
    clave: 'decision',
    titulo: 'Decisión',
    multilinea: true,
    render: (c) => {
      const clave = claveCampo(c.campo_id)
      const decision = revision.decisiones[clave]
      const sinValor = contenido.propuesta[clave]?.valor === null || contenido.propuesta[clave]?.valor === undefined
      const idAyuda = `ayuda-${clave}`
      const errorPendiente = revision.errores[clave] === MENSAJES.sinDecision
      return (
        <fieldset className={estilosIa.decision} aria-describedby={errorPendiente ? `error-${clave}` : undefined}>
          <legend className="sr-only">{nombreCampo(c)}</legend>
          <div className={estilosIa.opciones}>
            {ACCIONES.map((accion) => {
              const deshabilitada = accion === 'aceptar' && sinValor
              return (
                <label
                  key={accion}
                  className={`${estilosIa.opcion} ${deshabilitada ? estilosIa.opcionDeshabilitada : ''}`}
                >
                  <input
                    type="radio"
                    id={idDecision(clave, accion)}
                    name={`decision-${clave}`}
                    value={accion}
                    checked={decision?.accion === accion}
                    disabled={deshabilitada}
                    aria-describedby={deshabilitada ? idAyuda : undefined}
                    onChange={() => actualizarDecision(clave, { accion })}
                  />
                  {ETIQUETA_OPCION_ACCION[accion]}
                </label>
              )
            })}
          </div>
          {sinValor && (
            <p id={idAyuda} className={estilosIa.ayudaDecision}>
              {MENSAJES.sinValorAceptar}
            </p>
          )}
          {errorPendiente && (
            <p id={`error-${clave}`} className={estilosIa.errorDecision}>
              {MENSAJES.sinDecision}
            </p>
          )}
          {decision?.accion === 'corregir' && <div className={estilosIa.correccion}>{campoCorreccion(c)}</div>}
        </fieldset>
      )
    },
  }

  const columnaValorFinal: ColumnaTabla<CampoSolicitado> = {
    clave: 'valor_final',
    titulo: 'Valor final',
    multilinea: true,
    subtitulo: 'Decisión validada',
    render: (c) => {
      const final = contenido.decision?.por_campo[claveCampo(c.campo_id)]
      if (!final) return SIN_VALOR
      return (
        <span className={estilosIa.celdaValor}>
          <Badge {...insigniaAccion(final.accion)} />
          {final.accion !== 'descartar' && (
            <ValorLegible valor={final.valor_final} tipo={c.tipo_dato} textoNulo={SIN_VALOR} />
          )}
        </span>
      )
    },
  }

  const columnas = [
    columnaDato,
    columnaSugerencia,
    ...(enPropuesta ? (editable ? [columnaDecision] : []) : [columnaValorFinal]),
  ]

  const erroresResumen: ErrorResumen[] = revision.mostrarResumen
    ? campos
        .map((c) => ({ c, clave: claveCampo(c.campo_id) }))
        .filter(({ clave }) => revision.errores[clave])
        .map(({ c, clave }) => ({ idCampo: destinoFoco(clave), mensaje: `${nombreCampo(c)}: ${revision.errores[clave]}` }))
    : []
  const hayPendientes = Object.values(revision.errores).includes(MENSAJES.sinDecision)
  const resumen = contenido.decision?.resumen

  return (
    <div className={estilos.pagina}>
      <div>{volver}</div>

      {/* Cabecera de identificación (mockup, pantalla 6). */}
      <section className={estilosIa.cabeceraPropuesta} aria-label="Identificación de la propuesta">
        <dl className={estilosIa.datosPropuesta}>
          <div>
            <dt>Reporte del proveedor</dt>
            <dd>n.º {contenido.entrada.reporte_proveedor_id}</dd>
          </div>
          <div>
            <dt>Atención</dt>
            <dd>n.º {contenido.entrada.atencion_id}</dd>
          </div>
          <div>
            <dt>Formato estándar</dt>
            <dd>versión {contenido.entrada.formato_version ?? SIN_VALOR}</dd>
          </div>
          <div>
            <dt>Generada con</dt>
            <dd>
              {contenido.ia.proveedor} · {contenido.ia.modelo}
            </dd>
          </div>
        </dl>
        <Badge {...insigniaSugerencia(sugerencia.estado, sugerencia.etiqueta_estado)} />
      </section>

      {/* Documento analizado (mockup, pantalla 6: «Reporte y documentos del proveedor»). */}
      <section className={estilos.seccion} aria-labelledby="titulo-documento">
        <h2 id="titulo-documento" className={estilos.tituloSeccion}>
          Documento analizado
        </h2>
        <div className={estilosIa.documento}>
          <span className={estilosIa.nombreDocumento}>
            <Icono nombre="documento" />
            Informe final del proveedor · PDF · archivo n.º {contenido.entrada.archivo_id}
          </span>
          <span className={`${estilosIa.cobertura} cifra`}>
            Formato estándar: {conValor} de {campos.length} datos
          </span>
          {/* TODO: acción «Ver» del PDF cuando se exponga la descarga de archivos (el back-end del MOD-06 no la ofrece). */}
        </div>
      </section>

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
        <h2 id="titulo-revision" className={estilos.tituloSeccion}>
          Revisión campo por campo
        </h2>
        <ResumenErrores titulo={hayPendientes ? MENSAJES.sinDecision : MENSAJES.correcciones} errores={erroresResumen} />
        <TablaDatos
          titulo="Revisión campo por campo"
          columnas={columnas}
          filas={campos}
          claveFila={(c) => claveCampo(c.campo_id)}
        />
      </section>

      {editable && (
        <div className={estilosIa.acciones}>
          <Boton
            variante="primario"
            deshabilitado={!completa}
            ayudaDeshabilitado={!completa ? MENSAJES.sinDecision : undefined}
            onClickDeshabilitado={mostrarErrores}
            onClick={() => setDialogo('validar')}
          >
            Validar propuesta
          </Boton>
          <Boton variante="destructivo" onClick={() => setDialogo('rechazar')}>
            Rechazar propuesta
          </Boton>
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
