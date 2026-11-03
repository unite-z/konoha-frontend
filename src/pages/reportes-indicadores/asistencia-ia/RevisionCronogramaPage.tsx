// RF-IA-003 · HU-MOD06-005 · CU-MOD06-005 · CP-TR-MOD06-005 · RN-IA-001 · RI-25
/**
 * Revisión de una propuesta de cronograma (mismo patrón que las demás revisiones de Asistencia IA).
 *
 * - La propuesta se distingue de una programación confirmada (insignia ámbar y, en el calendario, borde discontinuo).
 * - Cada sugerencia se acepta, se modifica (A1: decisión del usuario) o se descarta; las que coinciden con una
 *   prohibición exigen confirmación expresa (RI-25). Solo lo aceptado o modificado se programa al confirmar.
 * - Se muestran los criterios, las restricciones consideradas y la suficiencia de los datos (A3).
 * - Vista «Calendario» (por defecto, al estilo de Teams: lo programado junto a la propuesta, con la ficha de la
 *   propuesta elegida en un panel lateral) y vista «Lista» por semanas. En móvil, solo la lista (agenda).
 *
 * Solo el jefe de sección confirma o descarta (ROLES_VALIDAR_IA); los demás la ven sin acciones.
 */
import { useCallback, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import AvisoDatosSimulados from '../../../components/reportes-indicadores/AvisoDatosSimulados'
import { useEsMovil } from '../../../components/reportes-indicadores/useEsMovil'
import AvisoEnLinea, { type TonoAviso } from '../../../components/ui/AvisoEnLinea'
import AvisoTemporal from '../../../components/ui/AvisoTemporal'
import BarraAvance from '../../../components/ui/BarraAvance'
import Boton, { BotonEnlace } from '../../../components/ui/Boton'
import { AreaTexto, ResumenErrores, type ErrorResumen } from '../../../components/ui/CampoFormulario'
import DialogoConfirmacion from '../../../components/ui/DialogoConfirmacion'
import EstadoCarga from '../../../components/ui/EstadoCarga'
import EstadoError from '../../../components/ui/EstadoError'
import EstadoSinAcceso from '../../../components/ui/EstadoSinAcceso'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import Pestanas from '../../../components/ui/Pestanas'
import { puede, ROLES_VALIDAR_IA } from '../../../config/permisos'
import { useConsulta } from '../../../hooks/useConsulta'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS, RUTAS, RUTAS_PLANIFICACION } from '../../../router/rutasApp'
import { aErrorApi } from '../../../services/api/cliente'
import {
  confirmarCronograma,
  listarProgramacionExistente,
  obtenerCronograma,
  programacionExistenteDisponible,
  rechazarCronograma,
} from '../../../services/api/cronogramaIa'
import { obtenerCatalogoComparacion } from '../../../services/api/reportesGestion'
import { useRolActual } from '../../../sesion/ContextoSesion'
import type { SugerenciaCronograma, ValoresCronograma } from '../../../types/cronogramaIa'
import {
  cuerpoConfirmacion,
  idConfirmaRestriccion,
  MENSAJES_CRONOGRAMA,
  recursosDisponibles,
  resumenConfirmacion,
  textoCambios,
  textoResumenConfirmacion,
  validarDecisiones,
  valoresDePropuesta,
  type DecisionEnCursoCronograma,
} from '../../../utils/cronogramaIa'
import { formatearNumero } from '../../../utils/formato'
import estilos from '../reportes/Reportes.module.css'
import estilosIa from './AsistenciaIa.module.css'
import CabeceraCronograma from './cronograma/CabeceraCronograma'
import DialogoModificar from './cronograma/DialogoModificar'
import FichaPropuesta from './cronograma/FichaPropuesta'
import type { EstadoNavegacionRevision } from './ExtraccionReporteProveedorPage'
import ListaPorSemana from './cronograma/ListaPorSemana'
import VistaCalendario from './cronograma/VistaCalendario'
import { idDecision } from './extraccion/valoresCampo'

interface Revision {
  clave: string
  decisiones: Record<string, DecisionEnCursoCronograma>
  errores: Record<string, string>
  mostrarResumen: boolean
}

const claveRevision = (s: SugerenciaCronograma) => `${s.id}|${s.estado}|${s.fecha_modificacion ?? ''}`
const SIN_DECISION: DecisionEnCursoCronograma = { valores: null, confirma: false }

export default function RevisionCronogramaPage() {
  const { id } = useParams()
  const idNumero = Number(id)
  const idValido = Number.isInteger(idNumero) && idNumero > 0
  const location = useLocation()
  const navegacion = (location.state ?? null) as EstadoNavegacionRevision | null
  const rutaBandeja = `${RUTAS.cronogramaIa}${navegacion?.volverA ?? ''}`
  const rol = useRolActual()
  const puedeConfirmar = rol !== null && puede(rol, ROLES_VALIDAR_IA)
  const esMovil = useEsMovil()

  usePaginaActual(`Propuesta de cronograma n.º ${id}`, [
    MIGAS.reportesIndicadores,
    MIGAS.asistenciaIa,
    { ...MIGAS.cronogramaIa, ruta: rutaBandeja },
    { texto: `Propuesta n.º ${id}` },
  ])

  const consulta = useConsulta<SugerenciaCronograma>(idValido ? `cronograma|${idNumero}` : null, (signal) => obtenerCronograma(idNumero, signal))
  const catalogo = useConsulta('catalogo-comparacion', obtenerCatalogoComparacion)
  const propuesta = consulta.datos
  const periodo = propuesta?.contenido.entrada
  const existentes = useConsulta(periodo ? `programacion-existente|${periodo.desde}|${periodo.hasta}` : null, (signal) =>
    listarProgramacionExistente(periodo?.desde ?? '', periodo?.hasta ?? '', signal),
  )

  const [avisoTemporal, setAvisoTemporal] = useState<string | null>(navegacion?.aviso ?? null)
  const cerrarAvisoTemporal = useCallback(() => setAvisoTemporal(null), [])
  const [avisoAccion, setAvisoAccion] = useState<{ tono: TonoAviso; texto: string } | null>(null)
  const [dialogo, setDialogo] = useState<'confirmar' | 'descartar' | null>(null)
  const [modificando, setModificando] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [vista, setVista] = useState('calendario')
  const [elegida, setElegida] = useState<string | null>(null)

  const [revision, setRevision] = useState<Revision | null>(null)
  if (propuesta && revision?.clave !== claveRevision(propuesta)) {
    setRevision({ clave: claveRevision(propuesta), decisiones: {}, errores: {}, mostrarResumen: false })
  }

  const volver = (
    <BotonEnlace to={rutaBandeja} variante="terciario">
      Volver a la bandeja
    </BotonEnlace>
  )

  if (!idValido || consulta.error?.estado === 404) {
    return <EstadoVacio titulo="Propuesta no encontrada" descripcion={consulta.error?.detalle} accion={volver} />
  }
  if (consulta.error?.estado === 403) {
    return (
      <div className={estilos.pagina}>
        <div>{volver}</div>
        <EstadoSinAcceso descripcion={consulta.error.detalle} />
      </div>
    )
  }
  if (consulta.estado === 'error' && consulta.error) {
    return (
      <div className={estilos.pagina}>
        <div>{volver}</div>
        <EstadoError titulo="No se pudo cargar la propuesta" descripcion={consulta.error.detalle} onReintentar={consulta.reintentar} />
      </div>
    )
  }
  if (!propuesta || !revision) return consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null

  const { contenido } = propuesta
  const { propuestas } = contenido
  const enPropuesta = propuesta.estado === 'Propuesta'
  const editable = enPropuesta && puedeConfirmar && propuestas.length > 0
  const modo = editable ? 'editar' : enPropuesta ? 'consulta' : 'final'
  const errores = validarDecisiones(propuestas, revision.decisiones)
  const completa = Object.keys(errores).length === 0
  const decididas = propuestas.filter((p) => revision.decisiones[p.clave]?.accion).length
  const sinDecidir = propuestas.length - decididas
  const resumen = resumenConfirmacion(propuestas.map((p) => revision.decisiones[p.clave]))

  const recursos = recursosDisponibles(propuestas)
  const espacios = (catalogo.datos?.espacios ?? []).map((e) => ({ id: e.id, nombre: e.nombre }))
  const nombre = (lista: { id: number; nombre: string }[], id: number | null, texto: string) =>
    id === null ? 'Sin asignar' : (lista.find((e) => e.id === id)?.nombre ?? `${texto} n.º ${id}`)
  const cambios = (clave: string) => (valores: ValoresCronograma) => {
    const p = propuestas.find((x) => x.clave === clave)
    if (!p) return ''
    return textoCambios(p, valores, {
      espacio: (i) => (i === p.area_verde_id ? p.ubicacion : nombre(espacios, i, 'Espacio')),
      cuadrilla: (i) => nombre(recursos.cuadrillas, i, 'Cuadrilla'),
      proveedor: (i) => nombre(recursos.proveedores, i, 'Proveedor'),
    })
  }

  function actualizar(clave: string, cambio: Partial<DecisionEnCursoCronograma>) {
    setRevision((r) => {
      if (!r) return r
      const nuevosErrores = { ...r.errores }
      delete nuevosErrores[clave]
      return { ...r, errores: nuevosErrores, decisiones: { ...r.decisiones, [clave]: { ...SIN_DECISION, ...r.decisiones[clave], ...cambio } } }
    })
  }

  function elegirAccion(clave: string, accion: DecisionEnCursoCronograma['accion']) {
    actualizar(clave, { accion })
    // Al modificar sin cambios todavía, se abre directamente el diálogo.
    if (accion === 'corregir' && !revision?.decisiones[clave]?.valores) setModificando(clave)
  }

  function aceptarPendientes() {
    setRevision((r) => {
      if (!r) return r
      const decisiones = { ...r.decisiones }
      for (const p of propuestas) if (!decisiones[p.clave]?.accion) decisiones[p.clave] = { ...SIN_DECISION, accion: 'aceptar' }
      return { ...r, decisiones }
    })
  }

  const destinoFoco = (clave: string, mensaje: string) =>
    mensaje === MENSAJES_CRONOGRAMA.sinConfirmar ? idConfirmaRestriccion(clave) : idDecision(clave, 'aceptar')

  function mostrarErrores(lista: Record<string, string> = errores) {
    setVista('lista')
    setRevision((r) => (r ? { ...r, errores: lista, mostrarResumen: true } : r))
    const primera = propuestas.find((p) => lista[p.clave])
    if (primera) window.setTimeout(() => document.getElementById(destinoFoco(primera.clave, lista[primera.clave]))?.focus(), 0)
  }

  async function ejecutar(accion: () => Promise<SugerenciaCronograma>, texto: string) {
    if (enviando) return
    setEnviando(true)
    setAvisoAccion(null)
    try {
      await accion()
      setDialogo(null)
      setMotivo('')
      setAvisoTemporal(texto)
      consulta.reintentar()
    } catch (causa) {
      const error = aErrorApi(causa)
      setDialogo(null)
      if (error.estado === 409) {
        setAvisoAccion({ tono: 'advertencia', texto: error.detalle })
        consulta.reintentar()
      } else if ((error.estado === 422 || error.estado === 400) && Object.keys(error.errores_campo).length > 0) {
        const mensaje = error.estado === 422 ? MENSAJES_CRONOGRAMA.sinConfirmar : MENSAJES_CRONOGRAMA.sinDecision
        mostrarErrores(Object.fromEntries(Object.keys(error.errores_campo).map((clave) => [clave, mensaje])))
      } else {
        setAvisoAccion({ tono: 'error', texto: error.detalle })
      }
    } finally {
      setEnviando(false)
    }
  }

  function confirmar() {
    if (!propuesta || !revision) return
    const cuerpo = cuerpoConfirmacion(propuestas, revision.decisiones)
    if (cuerpo) void ejecutar(() => confirmarCronograma(propuesta.id, cuerpo), 'Planificación confirmada')
  }

  const erroresResumen: ErrorResumen[] = revision.mostrarResumen
    ? propuestas
        .filter((p) => revision.errores[p.clave])
        .map((p) => ({ idCampo: destinoFoco(p.clave, revision.errores[p.clave]), mensaje: `${p.actividad} (${p.ubicacion}): ${revision.errores[p.clave]}` }))
    : []
  const enModificacion = propuestas.find((p) => p.clave === modificando)
  const decisionFinal = contenido.decision
  // Decisiones que pinta el calendario: las de la revisión en curso o, ya confirmada, las finales.
  const decisionesCalendario = editable
    ? revision.decisiones
    : Object.fromEntries(Object.entries(decisionFinal?.por_propuesta ?? {}).map(([clave, d]) => [clave, { accion: d.accion, valores: d.valores_finales }]))
  const ficha = (p: (typeof propuestas)[number]) => (
    <FichaPropuesta
      key={p.clave}
      propuesta={p}
      modo={modo}
      decision={revision.decisiones[p.clave]}
      error={revision.errores[p.clave]}
      final={decisionFinal?.por_propuesta[p.clave]}
      textoCambios={cambios(p.clave)}
      onAccion={(accion) => elegirAccion(p.clave, accion)}
      onModificar={() => setModificando(p.clave)}
      onConfirma={(confirma) => actualizar(p.clave, { confirma })}
    />
  )
  const calendario = (
    <VistaCalendario
      desde={contenido.entrada.desde}
      hasta={contenido.entrada.hasta}
      propuestas={propuestas}
      existentes={existentes.datos ?? []}
      existentesDisponibles={programacionExistenteDisponible() && existentes.estado !== 'error'}
      restricciones={contenido.restricciones}
      decisiones={decisionesCalendario}
      elegida={elegida}
      onElegir={setElegida}
      renderFicha={ficha}
    />
  )

  const lista = <ListaPorSemana propuestas={propuestas} renderFicha={ficha} />

  return (
    <div className={`${estilos.pagina} ${editable ? estilosIa.conBarraFija : ''}`}>
      <div>{volver}</div>
      <AvisoDatosSimulados />

      <CabeceraCronograma propuesta={propuesta} puedeConfirmar={puedeConfirmar} />

      {avisoAccion && <AvisoEnLinea tono={avisoAccion.tono}>{avisoAccion.texto}</AvisoEnLinea>}

      <section className={estilos.seccion} aria-labelledby="titulo-propuestas">
        <div className={estilosIa.cabeceraRevision}>
          <h2 id="titulo-propuestas" className={estilos.tituloSeccion}>
            Actividades propuestas
          </h2>
          {editable && (
            <Boton variante="secundario" deshabilitado={sinDecidir === 0} onClick={aceptarPendientes}>
              Aceptar las pendientes ({formatearNumero(sinDecidir)})
            </Boton>
          )}
        </div>

        {propuestas.length === 0 ? (
          <EstadoVacio
            nivel={3}
            titulo="No hay actividades pendientes en el periodo"
            descripcion="Puedes planificar de forma manual en Planificación."
            accion={
              <BotonEnlace to={RUTAS_PLANIFICACION.servicios} variante="secundario">
                Planificar de forma manual
              </BotonEnlace>
            }
          />
        ) : (
          <>
            {editable && (
              <div className={estilosIa.avance}>
                <p className="cifra">
                  <strong>{formatearNumero(decididas)}</strong> de {formatearNumero(propuestas.length)} decididas
                </p>
                <BarraAvance valor={decididas} maximo={propuestas.length} etiqueta="Avance de la revisión" textoValor={`${decididas} de ${propuestas.length} decididas`} />
              </div>
            )}
            <ResumenErrores titulo="Revisa estas propuestas antes de confirmar" errores={erroresResumen} />
            {esMovil ? (
              lista
            ) : (
              <Pestanas
                etiqueta="Vista de la propuesta"
                valor={vista}
                onCambiar={setVista}
                pestanas={[
                  { valor: 'calendario', texto: 'Calendario' },
                  { valor: 'lista', texto: 'Lista' },
                ]}
              >
                {vista === 'calendario' ? calendario : lista}
              </Pestanas>
            )}
          </>
        )}
      </section>

      {editable && (
        <div className={estilosIa.barraFija}>
          <p className={`${estilosIa.textoBarra} cifra`}>
            {formatearNumero(decididas)} de {formatearNumero(propuestas.length)} decididas
          </p>
          <div className={estilosIa.acciones}>
            <Boton variante="secundario" onClick={() => setDialogo('descartar')}>
              Descartar propuesta
            </Boton>
            <Boton variante="primario" deshabilitado={!completa} onClickDeshabilitado={() => mostrarErrores()} onClick={() => setDialogo('confirmar')}>
              Confirmar planificación
            </Boton>
          </div>
        </div>
      )}

      {enModificacion && (
        <DialogoModificar
          propuesta={enModificacion}
          valoresIniciales={revision.decisiones[enModificacion.clave]?.valores ?? valoresDePropuesta(enModificacion)}
          espacios={espacios}
          cuadrillas={recursos.cuadrillas}
          proveedores={recursos.proveedores}
          onGuardar={(valores) => {
            actualizar(enModificacion.clave, { accion: 'corregir', valores })
            setModificando(null)
          }}
          onCerrar={() => setModificando(null)}
        />
      )}
      <DialogoConfirmacion
        abierto={dialogo === 'confirmar'}
        titulo="Confirmar planificación"
        consecuencia={`${textoResumenConfirmacion(resumen)} Esta acción registra la programación oficial.`}
        textoConfirmar="Confirmar planificación"
        cargando={enviando}
        onConfirmar={confirmar}
        onCancelar={() => setDialogo(null)}
      />
      <DialogoConfirmacion
        abierto={dialogo === 'descartar'}
        titulo="Descartar propuesta"
        consecuencia="La propuesta se descartará completa y no se programará nada. Puedes planificar de forma manual en Planificación."
        textoConfirmar="Descartar propuesta"
        variante="destructivo"
        cargando={enviando}
        onConfirmar={() => void ejecutar(() => rechazarCronograma(propuesta.id, motivo.trim() || null), 'Propuesta descartada')}
        onCancelar={() => setDialogo(null)}
      >
        <AreaTexto id="motivo-descarte" etiqueta="Motivo" ayuda="Opcional" maxLength={1000} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </DialogoConfirmacion>

      <AvisoTemporal mensaje={avisoTemporal} onCerrar={cerrarAvisoTemporal} />
    </div>
  )
}
