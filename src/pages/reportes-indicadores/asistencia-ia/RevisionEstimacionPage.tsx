// RF-IA-004 · HU-MOD06-006 · CU-MOD06-006 · CP-TR-MOD06-006 · RN-IA-001
/**
 * Revisión de una estimación de recursos (sistema de diseño de Figma).
 *
 * - Tres fichas de decisión (operarios, duración e insumos): la recomendación con unidades frente a «Tu decisión»
 *   (aceptar, corregir o descartar). Al corregir, la vista previa de la diferencia se actualiza (criterio 2 y A2).
 * - Variables consideradas, antecedentes comparables y el contexto de la IA (criterios 1 y 5).
 * - Con datos insuficientes (A1), el aviso ofrece «Continuar sin recomendación» (registro manual).
 * - Solo se registra lo confirmado; la estimación se conserva para compararla con lo real.
 *
 * Solo el jefe de sección confirma o descarta (ROLES_VALIDAR_IA); los demás la ven sin acciones.
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
import { MIGAS, RUTAS, rutaRevisionEstimacion } from '@/router/rutasApp'
import { aErrorApi } from '@/services/api/cliente'
import { confirmarEstimacion, descartarEstimacion, obtenerEstimacion } from '@/services/api/estimacionIa'
import { useRolActual } from '@/sesion/ContextoSesion'
import type { RecursosConfirmados, SolicitudEstimacion, SugerenciaEstimacion } from '@/types/estimacionIa'
import type { AccionDecision } from '@/types/ia'
import {
  aInsumosEnEdicion,
  calcularDiferencia,
  confirmadoDesdeDecisiones,
  deRecursosEnEdicion,
  estadoEstimacion,
  resumenEstimacion,
  textoDuracion,
  textoInsumo,
  validarConfirmados,
  type RecursosEnEdicion,
} from '@/utils/estimacionIa'
import { formatearFechaHora, formatearNumero } from '@/utils/formato'
import estilos from '../reportes/Reportes.module.css'
import estilosIa from './AsistenciaIa.module.css'
import ContextoEstimacion from './estimacion/ContextoEstimacion'
import DialogoRecursosManual from './estimacion/DialogoRecursosManual'
import estilosEstimacion from './estimacion/Estimacion.module.css'
import FichasRecursos, { type BloqueRecurso } from './estimacion/FichasRecursos'
import TablaDiferencia from './estimacion/TablaDiferencia'
import type { EstadoNavegacionRevision } from './ExtraccionReporteProveedorPage'

type Bloque = BloqueRecurso
const BLOQUES: { clave: Bloque; texto: string }[] = [
  { clave: 'operarios', texto: 'Operarios' },
  { clave: 'duracion', texto: 'Duración' },
  { clave: 'insumos', texto: 'Insumos' },
]

interface Revision {
  clave: string
  acciones: Partial<Record<Bloque, AccionDecision>>
  corregido: RecursosEnEdicion
  mostrarErrores: boolean
}

const claveRevision = (s: SugerenciaEstimacion) => `${s.id}|${s.estado}|${s.fecha_modificacion ?? ''}`

function textoConfirmado(c: RecursosConfirmados): { operarios: string; duracion: string; insumos: string } {
  return {
    operarios: c.operarios === null ? 'No se confirma' : `${formatearNumero(c.operarios)} ${c.operarios === 1 ? 'operario' : 'operarios'}`,
    duracion: c.duracion === null ? 'No se confirma' : textoDuracion(c.duracion, c.unidad_duracion ?? 'horas'),
    insumos: c.insumos.length === 0 ? 'Sin insumos' : c.insumos.map(textoInsumo).join('; '),
  }
}

export default function RevisionEstimacionPage() {
  const { id } = useParams()
  const idNumero = Number(id)
  const idValido = Number.isInteger(idNumero) && idNumero > 0
  const location = useLocation()
  const navigate = useNavigate()
  const navegacion = (location.state ?? null) as EstadoNavegacionRevision | null
  const rutaLista = `${RUTAS.estimacionRecursos}${navegacion?.volverA ?? ''}`
  const rol = useRolActual()
  const puedeConfirmar = rol !== null && puede(rol, ROLES_VALIDAR_IA)

  usePaginaActual(`Estimación n.º ${id}`, [
    MIGAS.reportesIndicadores,
    MIGAS.asistenciaIa,
    { ...MIGAS.estimacionRecursos, ruta: rutaLista },
    { texto: `Estimación n.º ${id}` },
  ])

  const consulta = useConsulta<SugerenciaEstimacion>(idValido ? `estimacion|${idNumero}` : null, (signal) => obtenerEstimacion(idNumero, signal))
  const sugerencia = consulta.datos
  const [avisoTemporal, setAvisoTemporal] = useState<string | null>(navegacion?.aviso ?? null)
  const cerrarAvisoTemporal = useCallback(() => setAvisoTemporal(null), [])
  const [avisoAccion, setAvisoAccion] = useState<{ tono: TonoAviso; texto: string } | null>(null)
  const [dialogo, setDialogo] = useState<'confirmar' | 'descartar' | null>(null)
  const [manual, setManual] = useState<{ solicitud: SolicitudEstimacion; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  const [revision, setRevision] = useState<Revision | null>(null)
  if (sugerencia && revision?.clave !== claveRevision(sugerencia)) {
    const est = sugerencia.contenido.estimacion
    setRevision({
      clave: claveRevision(sugerencia),
      acciones: {},
      corregido: {
        operarios: est ? String(est.operarios_sugeridos) : '',
        duracion: est ? String(est.duracion).replace('.', ',') : '',
        unidad_duracion: est?.unidad_duracion ?? 'horas',
        insumos: aInsumosEnEdicion(est?.insumos ?? []),
      },
      mostrarErrores: false,
    })
  }

  const volver = (
    <BotonEnlace to={rutaLista} variante="fantasma" icono="chevron-left">
      Volver a las estimaciones
    </BotonEnlace>
  )

  if (!idValido || consulta.error?.estado === 404) {
    return <EstadoVacio titulo="Estimación no encontrada" descripcion={consulta.error?.detalle} accion={volver} />
  }
  if (consulta.error?.estado === 403) return <EstadoSinAcceso descripcion={consulta.error.detalle} />
  if (consulta.estado === 'error' && consulta.error) {
    return <EstadoError titulo="No se pudo cargar la estimación" descripcion={consulta.error.detalle} onReintentar={consulta.reintentar} />
  }
  if (!sugerencia || !revision) return consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null

  const { contenido } = sugerencia
  const est = contenido.estimacion
  const pendiente = sugerencia.estado === 'Propuesta'
  const editable = pendiente && puedeConfirmar && est !== null
  const modo = editable ? 'editar' : pendiente ? 'consulta' : 'final'
  const titulo = contenido.actividad ? `${contenido.actividad.codigo} · ${contenido.actividad.tipo_actividad}` : 'Actividad descrita'
  const solicitudOrigen: SolicitudEstimacion = contenido.actividad
    ? { actividad_id: contenido.actividad.actividad_id }
    : contenido.descripcion
      ? { descripcion: contenido.descripcion }
      : {}

  // Vista previa de lo que se confirmaría y su diferencia.
  const corregido = deRecursosEnEdicion(revision.corregido)
  const confirmado = est ? confirmadoDesdeDecisiones(est, { ...revision.acciones, corregido }) : corregido
  const diferencia = calcularDiferencia(est, confirmado)
  const erroresValores = validarConfirmados(confirmado)
  const faltan = BLOQUES.filter((b) => !revision.acciones[b.clave])
  const erroresBloque = (b: Bloque) => (revision.mostrarErrores && !revision.acciones[b] ? 'Elige aceptar, corregir o descartar' : undefined)
  const completa = faltan.length === 0 && !erroresValores.operarios && !erroresValores.duracion && !erroresValores.insumos

  const cambiar = (cambio: Partial<RecursosEnEdicion>) => setRevision((r) => (r ? { ...r, corregido: { ...r.corregido, ...cambio } } : r))
  const decidir = (b: Bloque, accion: AccionDecision) => setRevision((r) => (r ? { ...r, acciones: { ...r.acciones, [b]: accion } } : r))

  function mostrarErrores() {
    setRevision((r) => (r ? { ...r, mostrarErrores: true } : r))
    const primero = faltan[0]?.clave ?? (erroresValores.operarios ? 'operarios' : erroresValores.duracion ? 'duracion' : 'insumos')
    window.setTimeout(() => document.getElementById(`ficha-${primero}`)?.scrollIntoView({ block: 'center' }), 0)
  }

  async function ejecutar(accion: () => Promise<SugerenciaEstimacion>, texto: string) {
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

  function confirmar() {
    const acciones = revision?.acciones
    if (!sugerencia || !acciones?.operarios || !acciones.duracion || !acciones.insumos) return
    const cuerpo = { acciones: { operarios: acciones.operarios, duracion: acciones.duracion, insumos: acciones.insumos }, confirmado }
    void ejecutar(() => confirmarEstimacion(sugerencia.id, cuerpo), 'Recursos confirmados')
  }

  const erroresResumen: ErrorResumen[] = revision.mostrarErrores
    ? [
        ...faltan.map((b) => ({ idCampo: `ficha-${b.clave}`, mensaje: `${b.texto}: elige aceptar, corregir o descartar` })),
        ...(erroresValores.operarios ? [{ idCampo: 'corregir-operarios', mensaje: `Operarios: ${erroresValores.operarios}` }] : []),
        ...(erroresValores.duracion ? [{ idCampo: 'corregir-duracion', mensaje: `Duración: ${erroresValores.duracion}` }] : []),
        ...(erroresValores.insumos ? [{ idCampo: 'corregir-insumos-nombre-0', mensaje: 'Insumos: revisa los insumos corregidos' }] : []),
      ]
    : []
  const final = contenido.decision ? textoConfirmado(contenido.decision.confirmado) : null

  return (
    <div className={`${estilos.pagina} ${editable ? estilosIa.conBarraFija : ''}`}>
      <div>{volver}</div>
      <AvisoDatosSimulados />

      <Tarjeta
        titulo={titulo}
        nivel={2}
        descripcion={[contenido.actividad?.espacio, `Solicitada el ${formatearFechaHora(sugerencia.fecha_creacion)}`].filter(Boolean).join(' · ')}
        acciones={
          <span className={estilosEstimacion.acciones}>
            <Estado {...estadoEstimacion(sugerencia.estado)} />
            {pendiente && <Estado tono="aviso" icono="triangle-alert" texto="Estimación: aún no se ha registrado" />}
          </span>
        }
      >
        <p className={estilosEstimacion.secundario}>Resultado: {resumenEstimacion(contenido)}</p>
      </Tarjeta>

      {contenido.suficiencia === 'insuficiente' && pendiente && (
        <AvisoEnLinea
          tono="advertencia"
          titulo="Estimación con datos insuficientes"
          accion={puedeConfirmar ? { texto: 'Continuar sin recomendación', onClick: () => setManual({ solicitud: solicitudOrigen, texto: titulo }) } : undefined}
        >
          La IA no tiene antecedentes suficientes: tómala como una referencia de baja confianza o registra los recursos sin ella.
        </AvisoEnLinea>
      )}
      {sugerencia.estado === 'Validada' && (
        <AvisoEnLinea tono="exito" titulo={`Recursos confirmados el ${formatearFechaHora(sugerencia.fecha_validacion)}`}>
          {est
            ? 'Solo los valores confirmados se registran como planificación. La estimación se conserva para compararla con lo real.'
            : 'Recursos registrados de forma manual, sin recomendación de la IA.'}
        </AvisoEnLinea>
      )}
      {sugerencia.estado === 'Rechazada' && (
        <AvisoEnLinea tono="info" titulo={`Estimación descartada el ${formatearFechaHora(sugerencia.fecha_validacion)}`}>
          No se registró ningún recurso a partir de ella.
        </AvisoEnLinea>
      )}
      {pendiente && !puedeConfirmar && <AvisoEnLinea tono="info">Solo la jefatura de sección puede confirmar o descartar esta estimación</AvisoEnLinea>}
      {avisoAccion && <AvisoEnLinea tono={avisoAccion.tono}>{avisoAccion.texto}</AvisoEnLinea>}

      <ResumenErrores titulo="Revisa la estimación antes de confirmar" errores={erroresResumen} />

      {est ? (
        <FichasRecursos
          estimacion={est}
          modo={modo}
          acciones={modo === 'final' ? (contenido.decision?.acciones ?? {}) : revision.acciones}
          corregido={revision.corregido}
          onCorregir={cambiar}
          onDecidir={decidir}
          errorBloque={erroresBloque}
          errores={revision.mostrarErrores ? erroresValores : {}}
          final={final}
        />
      ) : (
        final && (
          <Tarjeta titulo="Recursos registrados" nivel={2} descripcion="Registrados de forma manual, sin recomendación de la IA.">
            <ListaDescripcion
              elementos={[
                { etiqueta: 'Operarios', valor: final.operarios },
                { etiqueta: 'Duración', valor: final.duracion },
                { etiqueta: 'Insumos', valor: final.insumos, ancho: true },
              ]}
            />
          </Tarjeta>
        )
      )}

      {est && (editable || contenido.decision) && (
        <TablaDiferencia
          titulo={contenido.decision ? 'Diferencia frente a la estimación' : 'Diferencia frente a la estimación (vista previa)'}
          estimacion={est}
          confirmado={contenido.decision?.confirmado ?? confirmado}
          diferencia={contenido.decision?.diferencia ?? diferencia}
        />
      )}

      {est && <ContextoEstimacion variables={contenido.variables} antecedentes={contenido.antecedentes} />}
      {est && <BloqueContextoIA contexto={contenido} tituloFaltantes="Faltan datos para una estimación confiable" />}

      {editable && (
        <div className={estilosIa.barraFija}>
          <p className={`${estilosIa.textoBarra} cifra`}>
            {formatearNumero(3 - faltan.length)} de 3 decididos
          </p>
          <div className={estilosIa.acciones}>
            <Boton variante="secundario" onClick={() => setDialogo('descartar')}>
              Descartar estimación
            </Boton>
            <Boton variante="primario" deshabilitado={!completa} onClickDeshabilitado={mostrarErrores} onClick={() => setDialogo('confirmar')}>
              Confirmar recursos
            </Boton>
          </div>
        </div>
      )}

      <DialogoConfirmacion
        abierto={dialogo === 'confirmar'}
        titulo="Confirmar recursos"
        consecuencia={`${textoConfirmado(confirmado).operarios} · ${textoConfirmado(confirmado).duracion} · ${formatearNumero(confirmado.insumos.length)} insumos. Solo los valores confirmados se registran como planificación. La estimación se conserva para compararla con lo real.`}
        textoConfirmar="Confirmar recursos"
        cargando={enviando}
        onConfirmar={confirmar}
        onCancelar={() => setDialogo(null)}
      />
      <DialogoConfirmacion
        abierto={dialogo === 'descartar'}
        titulo="Descartar estimación"
        consecuencia="No se registrará ningún recurso a partir de esta estimación. Puedes registrar los recursos sin IA más adelante."
        textoConfirmar="Descartar estimación"
        variante="destructivo"
        cargando={enviando}
        onConfirmar={() => void ejecutar(() => descartarEstimacion(sugerencia.id, null), 'Estimación descartada')}
        onCancelar={() => setDialogo(null)}
      />
      <DialogoRecursosManual
        contexto={manual}
        onCerrar={() => setManual(null)}
        onRegistrado={(s) => {
          setManual(null)
          navigate(rutaRevisionEstimacion(s.id), { state: { aviso: 'Recursos registrados sin recomendación de la IA', volverA: navegacion?.volverA } })
        }}
      />
      <AvisoTemporal mensaje={avisoTemporal} onCerrar={cerrarAvisoTemporal} />
    </div>
  )
}
