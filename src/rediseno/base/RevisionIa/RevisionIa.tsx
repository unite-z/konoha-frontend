/**
 * Núcleo de `RevisionIa` (RD-10): tarjeta de vidrio «Konoha propone» con la propuesta, la decisión por elemento
 * (aceptar, corregir o descartar), «Aceptar pendientes», validar o rechazar la propuesta, la trazabilidad de quién
 * decidió y cuándo, y los permisos. No conoce ningún asistente: todo lo propio llega por el adaptador.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import BloqueContextoIA from '@/components/reportes-indicadores/BloqueContextoIA'
import FichaDecisionIA from '@/components/reportes-indicadores/FichaDecisionIA'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import BarraAvance from '@/design-system/BarraAvance'
import Boton from '@/design-system/Boton'
import { AreaTexto, ResumenErrores } from '@/design-system/CampoFormulario'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { AccionDecision } from '@/types/ia'
import { formatearFechaHora } from '@/utils/formato'
import {
  MAX_MOTIVO_RECHAZO,
  PERMISO_ENTRADA,
  PERMISO_PROPONER,
  PERMISO_VALIDAR,
  type AdaptadorRevision,
  type DecisionElemento,
  type ElementoRevision,
  type PropuestaRevision,
} from './contrato'
import estilos from './RevisionIa.module.css'

export interface RevisionIaProps<V> {
  adaptador: AdaptadorRevision<V>
  /** Permiso para entrar; por defecto el de hoy. */
  permisoEntrada?: string
}

type Borrador<V> = Record<string, DecisionElemento<V>>

function Traza({ por, en }: { por: string; en: string }) {
  return (
    <p className={estilos.traza}>
      Decidido por {por} · {formatearFechaHora(en)}
    </p>
  )
}

export default function RevisionIa<V>({ adaptador, permisoEntrada = PERMISO_ENTRADA }: RevisionIaProps<V>) {
  const permisos = usePermisos()
  const [propuesta, setPropuesta] = useState<PropuestaRevision<V> | null>(null)
  const [fallo, setFallo] = useState(false)
  const [borrador, setBorrador] = useState<Borrador<V>>({})
  const [revisando, setRevisando] = useState(false)
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)

  const cargar = useCallback(() => {
    setFallo(false)
    setPropuesta(null)
    setBorrador({})
    adaptador.cargar().then(setPropuesta, () => setFallo(true))
  }, [adaptador])
  useEffect(() => {
    if (permisos?.includes(permisoEntrada)) cargar()
  }, [permisos, permisoEntrada, cargar])

  if (!permisos?.includes(permisoEntrada)) return <EstadoSinAcceso />
  if (fallo) return <EstadoError titulo="No pudimos cargar la propuesta" descripcion="Vuelve a intentarlo." onReintentar={cargar} />
  if (!propuesta) return <EstadoCarga forma="tarjetas" />

  const puedeValidar = permisos.includes(PERMISO_VALIDAR) && propuesta.estado === 'Propuesta'
  const pendientes = propuesta.elementos.filter((e) => !borrador[e.id])
  const decididos = propuesta.elementos.length - pendientes.length
  const errores = intentado ? pendientes.map((e) => ({ idCampo: `elemento-${e.id}`, mensaje: `Falta decidir «${e.titulo}»` })) : []
  const motivoVacio = adaptador.motivoRechazo === 'obligatorio' && motivo.trim() === ''

  const decidir = (elemento: ElementoRevision<V>, accion: AccionDecision) =>
    setBorrador((previo) => ({
      ...previo,
      [elemento.id]: {
        ...previo[elemento.id],
        accion,
        valorFinal: accion === 'descartar' ? null : accion === 'corregir' ? (previo[elemento.id]?.valorFinal ?? elemento.valorSugerido) : elemento.valorSugerido,
      },
    }))

  const aceptarPendientes = (): Borrador<V> => {
    const completo = { ...borrador }
    for (const e of pendientes) completo[e.id] = { accion: 'aceptar', valorFinal: e.valorSugerido }
    setBorrador(completo)
    return completo
  }

  const enviar = async (accion: () => Promise<void>) => {
    setEnviando(true)
    setErrorEnvio(null)
    try {
      await accion()
      cargar()
    } catch {
      setErrorEnvio('No pudimos guardar tu decisión. Vuelve a intentarlo.')
    } finally {
      setEnviando(false)
    }
  }

  const validar = (decisiones: Borrador<V>) => enviar(() => adaptador.validar(decisiones))
  const validarRevisadas = () => {
    setIntentado(true)
    if (pendientes.length === 0) void validar(borrador)
  }
  const rechazar = () => {
    setIntentado(true)
    if (!motivoVacio) void enviar(() => adaptador.rechazar(motivo.trim()))
  }

  const mostrar = (valor: V | null): ReactNode => (valor === null ? 'Descartado' : adaptador.mostrarValor ? adaptador.mostrarValor(valor) : String(valor))
  const { ia, contexto } = propuesta
  const solicitar = adaptador.solicitar

  return (
    <div className={estilos.revision}>
      <section className={estilos.vidrio} aria-labelledby="titulo-konoha-propone">
        <h2 id="titulo-konoha-propone" className={estilos.encabezado}>
          Konoha propone
        </h2>
        <div className={estilos.texto}>{propuesta.resumen}</div>
        <p className={estilos.linea}>Generado por IA · revisa antes de aplicar</p>
        <p className={estilos.traza}>
          {ia.proveedor} · {ia.modelo} · {formatearFechaHora(ia.solicitado_en)}
        </p>
        {propuesta.estado === 'Validada' && propuesta.validadaPor && <Traza por={propuesta.validadaPor} en={propuesta.validadaEn ?? ''} />}
        {propuesta.estado === 'Rechazada' && (
          <AvisoEnLinea tono="info" titulo="Propuesta rechazada">
            {propuesta.motivoRechazo ?? 'Sin motivo indicado.'}
          </AvisoEnLinea>
        )}
        {puedeValidar && (
          <div className={estilos.acciones}>
            <Boton variante="primario" cargando={enviando} onClick={() => void validar(aceptarPendientes())}>
              Aplicar
            </Boton>
            <Boton variante="secundario" className={estilos.botonVidrio} onClick={() => setRevisando(true)}>
              Corregir
            </Boton>
            <Boton variante="enlace" onClick={() => setRechazando(true)}>
              Rechazar con motivo
            </Boton>
          </div>
        )}
        {permisos.includes(PERMISO_PROPONER) && solicitar && propuesta.estado !== 'Propuesta' && (
          <Boton variante="secundario" onClick={() => void enviar(solicitar)}>
            Pedir otro análisis
          </Boton>
        )}
        {puedeValidar && adaptador.alternativaManual && (
          <Boton variante="fantasma" onClick={adaptador.alternativaManual.alElegir}>
            {adaptador.alternativaManual.texto}
          </Boton>
        )}
        {errorEnvio && <AvisoEnLinea tono="error" titulo={errorEnvio} />}
      </section>

      {rechazando && puedeValidar && (
        <section className={estilos.vidrio} aria-label="Rechazar la propuesta">
          <AreaTexto
            id="motivo-rechazo"
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
        <section className={estilos.elementos} aria-label="Decisiones por elemento">
          {puedeValidar && (
            <div className={estilos.progreso}>
              <BarraAvance valor={decididos} maximo={propuesta.elementos.length} etiqueta="Elementos decididos" textoValor={`${decididos} de ${propuesta.elementos.length}`} />
              <Boton variante="secundario" compacto onClick={aceptarPendientes} deshabilitado={pendientes.length === 0}>
                Aceptar pendientes
              </Boton>
            </div>
          )}
          <ResumenErrores titulo="Faltan elementos por decidir" errores={errores} />
          {propuesta.elementos.map((e) => {
            const decision = borrador[e.id]
            const registro = e.decision
            const modo = propuesta.estado !== 'Propuesta' ? (registro ? 'final' : 'consulta') : puedeValidar ? 'editar' : 'consulta'
            return (
              <div key={e.id} id={`elemento-${e.id}`} tabIndex={-1}>
                <FichaDecisionIA
                  titulo={e.titulo}
                  sugerencia={e.sugerencia}
                  modo={modo}
                  accion={modo === 'final' ? registro?.accion : decision?.accion}
                  onAccion={(accion) => decidir(e, accion)}
                  final={registro && mostrar(registro.valorFinal)}
                  error={intentado && modo === 'editar' && !decision ? 'Decide este elemento' : undefined}
                />
                {modo === 'editar' && decision && adaptador.renderHueco?.({ elemento: e, decision, cambiar: (parcial) => setBorrador((p) => ({ ...p, [e.id]: { ...p[e.id], ...parcial } })) })}
                {modo === 'final' && registro && (
                  <>
                    {registro.comentario && <p className={estilos.traza}>Comentario: {registro.comentario}</p>}
                    {registro.motivo && <p className={estilos.traza}>Motivo: {registro.motivo}</p>}
                    <Traza por={registro.decididoPor} en={registro.decididoEn} />
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
