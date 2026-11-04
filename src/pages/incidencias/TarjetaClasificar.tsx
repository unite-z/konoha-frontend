/**
 * Tarjeta «Clasificar» del detalle de incidencia (AV-284, Figma 388-7305, 389-7300, 394-8700 y 394-8782; AV-276):
 * - «Sugerencia de IA» como Próximamente;
 * - severidad e impacto (control segmentado) y «Quién lo atiende», con la vía sugerida por la altura del ejemplar;
 * - si se elige otra vía que la sugerida, la severidad y el impacto quedan como insignias y se pide el motivo del
 *   cambio, con «Cancelar» para volver a la sugerida (389-7300);
 * - «Descartar» pide el motivo (394-8700) y «Solicitar inspección en campo» abre su propia tarjeta (394-8782).
 */
import { useState } from 'react'
import Boton from '@/components/ui/Boton'
import CampoFormulario, { AreaTexto } from '@/components/ui/CampoFormulario'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import Estado from '@/components/ui/Estado'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import Selector from '@/components/ui/Selector'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { clasificarIncidencia, descartarIncidencia, listarInspectores, solicitarInspeccion } from '@/services/api/incidencias'
import type { ImpactoIncidencia, IncidenciaDetalle, SeveridadIncidencia, ViaIncidencia } from '@/types/incidencias'
import { SEVERIDAD_INCIDENCIA } from './bandeja'
import { descripcionTercerizada, viaSugerida } from './detalleIncidencia'
import estilos from './Incidencias.module.css'

const SEVERIDADES: { valor: SeveridadIncidencia; texto: string }[] = [
  { valor: 'Alta', texto: 'Alta' },
  { valor: 'Media', texto: 'Media' },
  { valor: 'Baja', texto: 'Baja' },
]

const IMPACTOS: { valor: ImpactoIncidencia; texto: string }[] = [
  { valor: 'Alto', texto: 'Alto' },
  { valor: 'Medio', texto: 'Medio' },
  { valor: 'Bajo', texto: 'Bajo' },
]

/** El impacto se pinta con el mismo tono que la severidad equivalente. */
const TONO_IMPACTO = { Alto: SEVERIDAD_INCIDENCIA.Alta.tono, Medio: SEVERIDAD_INCIDENCIA.Media.tono, Bajo: SEVERIDAD_INCIDENCIA.Baja.tono }

export interface TarjetaClasificarProps {
  incidencia: IncidenciaDetalle
  onCambiada: (incidencia: IncidenciaDetalle, aviso: string) => void
  onAviso: (aviso: string) => void
}

function TarjetaInspeccion({ incidencia, onVolver, onSolicitada }: { incidencia: IncidenciaDetalle; onVolver: () => void; onSolicitada: (nombre: string) => void }) {
  const inspectores = useConsulta('incidencias-inspectores', listarInspectores)
  const [responsable, setResponsable] = useState('')
  const [queVerificar, setQueVerificar] = useState('')
  const [mostrarError, setMostrarError] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function solicitar() {
    setMostrarError(true)
    if (!responsable) return
    setEnviando(true)
    await solicitarInspeccion(incidencia.id, { responsable_id: Number(responsable), que_verificar: queVerificar.trim() || undefined })
    onSolicitada(inspectores.datos?.find((i) => String(i.id) === responsable)?.nombre ?? 'el responsable')
  }

  return (
    <Tarjeta titulo="Solicitar inspección" nivel={2}>
      <div className={estilos.accion}>
        <div className={estilos.camposAccion}>
          <Selector
            id="inspeccion-responsable"
            etiqueta="Responsable"
            obligatorio
            valor={responsable}
            opcionTodos="Elige quién inspecciona"
            opciones={(inspectores.datos ?? []).map((i) => ({ valor: String(i.id), texto: i.nombre }))}
            onCambiar={setResponsable}
            error={mostrarError && !responsable ? 'Elige el responsable.' : undefined}
          />
          <CampoFormulario id="inspeccion-que" etiqueta="Qué verificar" value={queVerificar} maxLength={300} onChange={(e) => setQueVerificar(e.target.value)} />
        </div>
        <div className={`${estilos.pieAccion} ${estilos.pieDerecha}`}>
          <Boton variante="secundario" onClick={onVolver}>
            Volver
          </Boton>
          <Boton cargando={enviando} onClick={() => void solicitar()}>
            Solicitar
          </Boton>
        </div>
      </div>
    </Tarjeta>
  )
}

export default function TarjetaClasificar({ incidencia, onCambiada, onAviso }: TarjetaClasificarProps) {
  const sugerida = viaSugerida(incidencia)
  const [severidad, setSeveridad] = useState<SeveridadIncidencia | null>(incidencia.severidad)
  const [impacto, setImpacto] = useState<ImpactoIncidencia | null>(incidencia.impacto)
  const [via, setVia] = useState<ViaIncidencia>(sugerida)
  const [motivo, setMotivo] = useState('')
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [descartando, setDescartando] = useState(false)
  const [motivoDescarte, setMotivoDescarte] = useState('')
  const [errorDescarte, setErrorDescarte] = useState<string | undefined>(undefined)
  const [inspeccion, setInspeccion] = useState(false)
  const cambiaVia = via !== sugerida
  // Con otra vía que la sugerida y la severidad y el impacto elegidos, quedan como insignias (Figma 389-7300).
  const resumen = cambiaVia && severidad && impacto

  if (inspeccion) {
    return (
      <TarjetaInspeccion
        incidencia={incidencia}
        onVolver={() => setInspeccion(false)}
        onSolicitada={(nombre) => {
          setInspeccion(false)
          onAviso(`Inspección solicitada a ${nombre}`)
        }}
      />
    )
  }

  async function clasificar() {
    setMostrarErrores(true)
    if (!severidad || !impacto || (cambiaVia && !motivo.trim())) return
    setEnviando(true)
    setError(null)
    try {
      const clasificada = await clasificarIncidencia(incidencia.id, { severidad, impacto, via, motivo_cambio_via: cambiaVia ? motivo.trim() : undefined })
      onCambiada(clasificada, `${incidencia.codigo} clasificada`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo clasificar.')
      setEnviando(false)
    }
  }

  async function descartar() {
    if (!motivoDescarte.trim()) {
      setErrorDescarte('Escribe el motivo.')
      return
    }
    setEnviando(true)
    const descartada = await descartarIncidencia(incidencia.id, motivoDescarte.trim())
    setDescartando(false)
    onCambiada(descartada, `${incidencia.codigo} descartada`)
  }

  return (
    <Tarjeta titulo="Clasificar" nivel={2}>
      <div className={estilos.accion}>
        <div className={estilos.camposAccion}>
          {resumen ? (
            <p className={estilos.insignias}>
              <Estado tono={SEVERIDAD_INCIDENCIA[severidad].tono} texto={`Severidad ${severidad.toLowerCase()}`} punto />
              <Estado tono={TONO_IMPACTO[impacto]} texto={`Impacto ${impacto.toLowerCase()}`} punto />
            </p>
          ) : (
            <>
              <p className={estilos.sugerenciaIa}>
                <span>Sugerencia de IA</span>
                <Estado tono="neutro" texto="Próximamente" punto={false} />
              </p>
              <GrupoOpciones
                etiqueta="Severidad"
                obligatorio
                segmentado
                opciones={SEVERIDADES}
                valor={severidad}
                onCambiar={setSeveridad}
                error={mostrarErrores && !severidad ? 'Elige la severidad.' : undefined}
              />
              <GrupoOpciones
                etiqueta="Impacto"
                obligatorio
                segmentado
                opciones={IMPACTOS}
                valor={impacto}
                onCambiar={setImpacto}
                error={mostrarErrores && !impacto ? 'Elige el impacto.' : undefined}
              />
            </>
          )}
          <GrupoOpciones
            etiqueta="Quién lo atiende"
            obligatorio
            opciones={[
              { valor: 'PersonalPropio', texto: 'Personal propio', descripcion: 'Encargo directo a un capataz' },
              { valor: 'Tercerizada', texto: 'Proveedor tercerizado', descripcion: descripcionTercerizada(incidencia) },
            ]}
            valor={via}
            onCambiar={setVia}
          />
          {cambiaVia ? (
            <AreaTexto
              id="clasificar-motivo"
              etiqueta="Motivo del cambio"
              obligatorio
              rows={2}
              value={motivo}
              maxLength={300}
              onChange={(e) => setMotivo(e.target.value)}
              error={mostrarErrores && !motivo.trim() ? 'Explica por qué cambias la vía sugerida.' : undefined}
            />
          ) : (
            <Boton variante="enlace" onClick={() => setInspeccion(true)}>
              Solicitar inspección en campo
            </Boton>
          )}
          {error && <p className={estilos.errorAccion}>{error}</p>}
        </div>
        <div className={`${estilos.pieAccion} ${cambiaVia ? estilos.pieDerecha : ''}`}>
          {cambiaVia ? (
            <Boton
              variante="secundario"
              onClick={() => {
                setVia(sugerida)
                setMotivo('')
              }}
            >
              Cancelar
            </Boton>
          ) : (
            <Boton variante="fantasma" onClick={() => setDescartando(true)}>
              Descartar
            </Boton>
          )}
          <Boton cargando={enviando && !descartando} onClick={() => void clasificar()}>
            Clasificar y derivar
          </Boton>
        </div>
      </div>

      <DialogoConfirmacion
        abierto={descartando}
        titulo={`Descartar ${incidencia.codigo}`}
        textoConfirmar="Descartar"
        variante="destructivo"
        cargando={enviando && descartando}
        onConfirmar={() => void descartar()}
        onCancelar={() => {
          setDescartando(false)
          setErrorDescarte(undefined)
        }}
      >
        <CampoFormulario
          id="descartar-motivo"
          etiqueta="Motivo"
          obligatorio
          value={motivoDescarte}
          maxLength={300}
          onChange={(e) => setMotivoDescarte(e.target.value)}
          error={errorDescarte}
        />
      </DialogoConfirmacion>
    </Tarjeta>
  )
}
