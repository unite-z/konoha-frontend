/**
 * Núcleo de `RevisionIa` (RD-10): tarjeta de vidrio «Konoha propone» con la propuesta, la decisión por elemento
 * (aceptar, corregir o descartar), «Aceptar pendientes», validar o rechazar la propuesta, la trazabilidad de quién
 * decidió y cuándo, y los permisos. No conoce ningún asistente: todo lo propio llega por el adaptador.
 */
import { useId, useState, type ReactNode } from 'react'
import BloqueContextoIA from '@/components/reportes-indicadores/BloqueContextoIA'
import FichaDecisionIA from '@/components/reportes-indicadores/FichaDecisionIA'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import BarraAvance from '@/design-system/BarraAvance'
import Boton from '@/design-system/Boton'
import { AreaTexto, ResumenErrores } from '@/design-system/CampoFormulario'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { PERMISO_CONSULTA_REPORTES, PERMISO_SOLICITAR_IA, PERMISO_VALIDAR_IA } from '@/config/permisos'
import { useConsulta } from '@/hooks/useConsulta'
import { aErrorApi } from '@/services/api/cliente'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { AccionDecision } from '@/types/ia'
import { formatearFechaHora } from '@/utils/formato'
import { MAX_MOTIVO_RECHAZO, type AdaptadorRevision, type DecisionElemento, type ElementoRevision } from './contrato'
import type { PropuestaRevision } from './contrato'
import estilos from './RevisionIa.module.css'

export interface RevisionIaProps<V> {
  adaptador: AdaptadorRevision<V>
  /** Permiso para entrar; por defecto el de hoy. */
  permisoEntrada?: string
}

type Borrador<V> = Record<string, DecisionElemento<V>>
type Enviar = (accion: () => Promise<void>) => void
/** El foco va con la vista: a las decisiones al pulsar «Corregir» y al motivo al pulsar «Rechazar con motivo». */
const enfocar = (elemento: HTMLElement | null) => elemento?.focus()

const traza = (texto: string, por: string, en: string | null) => (
  <p className={estilos.traza}>{`${texto} por ${por} · ${formatearFechaHora(en)}`}</p>
)

export default function RevisionIa<V>({ adaptador, permisoEntrada = PERMISO_CONSULTA_REPORTES }: RevisionIaProps<V>) {
  const permisos = usePermisos() ?? []
  const entra = permisos.includes(permisoEntrada)
  const consulta = useConsulta(entra ? adaptador.clave : null, adaptador.cargar, (p) => p === null)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const enviar: Enviar = (accion) => {
    if (enviando) return
    setEnviando(true)
    setAviso(null)
    accion()
      // Tras un fallo también se recarga: si otra persona ya decidió (409), se ve su decisión; si no, nada cambia.
      .then(consulta.reintentar, (causa: unknown) => {
        setAviso(aErrorApi(causa).detalle)
        consulta.reintentar()
      })
      .finally(() => setEnviando(false))
  }

  const { error, reintentar } = consulta
  if (!entra || error?.estado === 403) return <EstadoSinAcceso />
  const avisoEnvio = aviso && <AvisoEnLinea tono="error" titulo={aviso} />
  const { solicitar } = adaptador
  const pedir = (texto: string) =>
    permisos.includes(PERMISO_SOLICITAR_IA) &&
    solicitar && (
      <Boton variante="secundario" cargando={enviando} onClick={() => enviar(solicitar)}>
        {texto}
      </Boton>
    )
  if (consulta.estado === 'vacio' || error?.estado === 404)
    return <EstadoVacio titulo="Aún no hay propuesta" descripcion={avisoEnvio} accion={pedir('Pedir análisis')} />
  if (error) return <EstadoError titulo="No se pudo cargar" descripcion={error.detalle} onReintentar={reintentar} />
  if (!consulta.datos) return consulta.cargaVisible ? <EstadoCarga forma="tarjetas" /> : null

  const { id, estado } = consulta.datos
  const comun = { adaptador, permisos, enviar, enviando, avisoEnvio, pedir: pedir('Pedir otro análisis') }
  return <Propuesta key={`${id}|${estado}`} propuesta={consulta.datos} {...comun} />
}

interface PropuestaProps<V> {
  propuesta: PropuestaRevision<V>
  adaptador: AdaptadorRevision<V>
  permisos: readonly string[]
  enviar: Enviar
  enviando: boolean
  avisoEnvio: ReactNode
  pedir: ReactNode
}

/** Estado de la decisión de una propuesta concreta: se reinicia (por `key`) cuando cambia su id o su estado. */
function Propuesta<V>({ propuesta, adaptador, permisos, enviar, enviando, avisoEnvio, pedir }: PropuestaProps<V>) {
  const id = useId()
  const [borrador, setBorrador] = useState<Borrador<V>>({})
  const [revisando, setRevisando] = useState(false)
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [intentado, setIntentado] = useState(false)

  const enPropuesta = propuesta.estado === 'Propuesta'
  const puedeValidar = permisos.includes(PERMISO_VALIDAR_IA) && enPropuesta
  const idElemento = (e: ElementoRevision<V>) => `${id}-elemento-${e.id}`
  const pendientes = propuesta.elementos.filter((e) => !borrador[e.id])
  const total = propuesta.elementos.length
  const decididos = total - pendientes.length
  const errores = (intentado ? pendientes : []).map((e) => ({
    idCampo: idElemento(e),
    mensaje: `Falta decidir «${e.titulo}»`,
  }))
  const motivoVacio = adaptador.motivoRechazo === 'obligatorio' && motivo.trim() === ''

  const decidir = (elemento: ElementoRevision<V>, accion: AccionDecision) =>
    setBorrador((previo) => {
      const anterior = previo[elemento.id]
      const corregido = anterior?.valorFinal ?? elemento.valorSugerido
      const valorFinal = accion === 'descartar' ? null : accion === 'corregir' ? corregido : elemento.valorSugerido
      return { ...previo, [elemento.id]: { ...anterior, accion, valorFinal } }
    })
  const cambiar = (elemento: ElementoRevision<V>, parcial: Partial<DecisionElemento<V>>) =>
    setBorrador((previo) => ({ ...previo, [elemento.id]: { ...previo[elemento.id], ...parcial } }))

  const aceptarPendientes = (): Borrador<V> => {
    const completo = { ...borrador }
    for (const e of pendientes) completo[e.id] = { accion: 'aceptar', valorFinal: e.valorSugerido }
    setBorrador(completo)
    return completo
  }
  const aplicar = () => enviar(() => adaptador.validar(aceptarPendientes()))
  const validarRevisadas = () => {
    setIntentado(true)
    if (pendientes.length > 0) document.getElementById(idElemento(pendientes[0]))?.focus()
    else enviar(() => adaptador.validar(borrador))
  }
  const rechazar = () => {
    setIntentado(true)
    if (!motivoVacio) enviar(() => adaptador.rechazar(motivo.trim()))
  }

  const mostrar = (valor: V | null): ReactNode =>
    valor === null ? 'Descartado' : adaptador.mostrarValor ? adaptador.mostrarValor(valor) : String(valor)
  const { ia, contexto, validadaPor } = propuesta

  return (
    <div className={estilos.revision}>
      <section className={estilos.vidrio} aria-labelledby={`${id}-titulo`}>
        <h2 id={`${id}-titulo`} className={estilos.encabezado}>
          Konoha propone
        </h2>
        <div>{propuesta.resumen}</div>
        <p className={estilos.linea}>Generado por IA · revisa antes de aplicar</p>
        <p className={estilos.traza}>
          {ia.proveedor} · {ia.modelo} · {formatearFechaHora(ia.solicitado_en)}
        </p>
        {!enPropuesta && validadaPor && traza(propuesta.estado, validadaPor, propuesta.validadaEn)}
        {propuesta.estado === 'Rechazada' && (
          <AvisoEnLinea tono="info" titulo="Propuesta rechazada">
            {propuesta.motivoRechazo || 'Sin motivo indicado.'}
          </AvisoEnLinea>
        )}
        {puedeValidar && (
          <div className={estilos.acciones}>
            <Boton variante="primario" cargando={enviando} onClick={aplicar}>
              Aplicar
            </Boton>
            <Boton
              variante="secundario"
              className={estilos.botonVidrio}
              aria-expanded={revisando}
              onClick={() => setRevisando(true)}
            >
              Corregir
            </Boton>
            <Boton variante="enlace" aria-expanded={rechazando} onClick={() => setRechazando(true)}>
              Rechazar con motivo
            </Boton>
          </div>
        )}
        {!enPropuesta && pedir}
        {puedeValidar && adaptador.alternativaManual && (
          <Boton variante="fantasma" onClick={adaptador.alternativaManual.alElegir}>
            {adaptador.alternativaManual.texto}
          </Boton>
        )}
        {avisoEnvio}
      </section>

      {rechazando && puedeValidar && (
        <section className={estilos.vidrio} aria-label="Rechazar la propuesta" ref={enfocar} tabIndex={-1}>
          <AreaTexto
            id={`${id}-motivo`}
            etiqueta="Motivo del rechazo"
            obligatorio={adaptador.motivoRechazo === 'obligatorio'}
            maxLength={MAX_MOTIVO_RECHAZO}
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            error={intentado && motivoVacio ? 'Escribe el motivo del rechazo' : undefined}
            ayuda={`${motivo.length} de ${MAX_MOTIVO_RECHAZO} caracteres`}
          />
          <div className={estilos.acciones}>
            <Boton variante="destructivo" cargando={enviando} onClick={rechazar}>
              Rechazar propuesta
            </Boton>
            <Boton variante="fantasma" onClick={() => setRechazando(false)}>
              Cancelar
            </Boton>
          </div>
        </section>
      )}

      <BloqueContextoIA contexto={contexto} tituloFaltantes={adaptador.tituloFaltantes} />

      {(revisando || !puedeValidar) && (
        <section className={estilos.elementos} aria-labelledby={`${id}-decisiones`}>
          <h2
            id={`${id}-decisiones`}
            ref={revisando ? enfocar : undefined}
            tabIndex={-1}
            className={estilos.encabezado}
          >
            Decisiones por elemento
          </h2>
          {puedeValidar && (
            <div className={estilos.progreso}>
              <BarraAvance
                valor={decididos}
                maximo={total}
                etiqueta="Decididos"
                textoValor={`${decididos} de ${total}`}
              />
              <Boton variante="secundario" compacto onClick={aceptarPendientes} deshabilitado={pendientes.length === 0}>
                Aceptar pendientes
              </Boton>
            </div>
          )}
          <ResumenErrores titulo="Faltan elementos por decidir" errores={errores} />
          {propuesta.elementos.map((e) => {
            const decision = borrador[e.id]
            const registro = e.decision
            const modo = !enPropuesta ? (registro ? 'final' : 'consulta') : puedeValidar ? 'editar' : 'consulta'
            return (
              <div key={e.id} id={idElemento(e)} tabIndex={-1}>
                <FichaDecisionIA
                  titulo={e.titulo}
                  sugerencia={e.sugerencia}
                  modo={modo}
                  accion={modo === 'final' ? registro?.accion : decision?.accion}
                  onAccion={(accion) => decidir(e, accion)}
                  final={registro && mostrar(registro.valorFinal)}
                  error={intentado && modo === 'editar' && !decision ? 'Decide este elemento' : undefined}
                />
                {modo === 'editar' &&
                  decision &&
                  adaptador.renderHueco?.({ elemento: e, decision, cambiar: (parcial) => cambiar(e, parcial) })}
                {modo === 'final' && registro && (
                  <>
                    {registro.comentario && <p className={estilos.traza}>Comentario: {registro.comentario}</p>}
                    {registro.motivo && <p className={estilos.traza}>Motivo: {registro.motivo}</p>}
                    {traza('Decidido', registro.decididoPor, registro.decididoEn)}
                  </>
                )}
              </div>
            )
          })}
          {puedeValidar && (
            <div className={estilos.acciones}>
              <Boton variante="primario" cargando={enviando} onClick={validarRevisadas}>
                Validar decisiones
              </Boton>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
