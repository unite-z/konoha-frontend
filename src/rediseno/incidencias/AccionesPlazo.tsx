/** Ventanas de «Anotar causa» y «Reasignar» de las alertas de plazo (RD-42, AV-280). Solo las abre quien gestiona. */
import { useState, type FormEvent } from 'react'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import CampoFormulario from '@/design-system/CampoFormulario'
import Selector from '@/design-system/Selector'
import { useConsulta } from '@/hooks/useConsulta'
import { anotarCausaRetraso, listarCapatacesDisponibles, reasignarIncidencia } from '@/services/api/incidencias'
import type { IncidenciaResumen } from '@/types/incidencias'
import VentanaFlotante from '../base/VentanaFlotante/VentanaFlotante'
import estilos from './Incidencias.module.css'

const MAXIMO_CAUSA = 300

export type AccionPlazo = { tipo: 'causa' | 'reasignar'; incidencia: IncidenciaResumen }

function detalleDe(causa: unknown): string {
  return causa instanceof Error ? causa.message : 'Inténtalo de nuevo.'
}

function Acciones({
  enviando,
  deshabilitado,
  texto,
  onCerrar,
}: {
  enviando: boolean
  deshabilitado?: boolean
  texto: string
  onCerrar: () => void
}) {
  return (
    <div className={estilos.accionesVentana}>
      <Boton variante="fantasma" onClick={onCerrar} deshabilitado={enviando}>
        Volver
      </Boton>
      <Boton type="submit" variante="primario" cargando={enviando} deshabilitado={deshabilitado}>
        {texto}
      </Boton>
    </div>
  )
}

function FormularioCausa({
  incidencia,
  onCerrar,
  onHecho,
}: {
  incidencia: IncidenciaResumen
  onCerrar: () => void
  onHecho: () => void
}) {
  const [causa, setCausa] = useState('')
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const error = causa.trim() ? undefined : 'Escribe la causa del retraso.'

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    setIntentado(true)
    if (error) return
    setEnviando(true)
    setFallo(null)
    try {
      await anotarCausaRetraso(incidencia.id, causa.trim())
      onHecho()
    } catch (causaError) {
      setFallo(detalleDe(causaError))
      setEnviando(false)
    }
  }

  return (
    <form className={estilos.formulario} onSubmit={(e) => void guardar(e)} noValidate>
      {fallo && (
        <AvisoEnLinea tono="error" titulo="No se pudo anotar la causa">
          {fallo}
        </AvisoEnLinea>
      )}
      <CampoFormulario
        id="causa-retraso"
        etiqueta="Causa"
        obligatorio
        value={causa}
        maxLength={MAXIMO_CAUSA}
        onChange={(e) => setCausa(e.target.value)}
        error={intentado ? error : undefined}
      />
      <Acciones enviando={enviando} texto="Guardar causa" onCerrar={onCerrar} />
    </form>
  )
}

function FormularioReasignar({
  incidencia,
  onCerrar,
  onHecho,
}: {
  incidencia: IncidenciaResumen
  onCerrar: () => void
  onHecho: (actualizada: IncidenciaResumen) => void
}) {
  const capataces = useConsulta(`rd-capataces:${incidencia.id}`, (signal) =>
    listarCapatacesDisponibles(incidencia.id, signal),
  )
  const [capataz, setCapataz] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  async function reasignar(evento: FormEvent) {
    evento.preventDefault()
    if (!capataz) return
    setEnviando(true)
    setFallo(null)
    try {
      onHecho(await reasignarIncidencia(incidencia.id, Number(capataz)))
    } catch (causa) {
      setFallo(detalleDe(causa))
      setEnviando(false)
    }
  }

  return (
    <form className={estilos.formulario} onSubmit={(e) => void reasignar(e)} noValidate>
      {(fallo || capataces.estado === 'error') && (
        <AvisoEnLinea tono="error" titulo={fallo ? 'No se pudo reasignar' : 'No pudimos cargar los capataces'}>
          {fallo ?? capataces.error?.detalle}
        </AvisoEnLinea>
      )}
      <Selector
        id="reasignar-capataz"
        etiqueta="Capataz"
        obligatorio
        valor={capataz}
        opcionTodos={capataces.datos ? 'Elige el capataz' : 'Cargando capataces…'}
        opciones={(capataces.datos ?? [])
          .filter((c) => c.nombre !== incidencia.responsable)
          .map((c) => ({ valor: String(c.id), texto: `${c.nombre} · ${c.cuadrilla}` }))}
        onCambiar={setCapataz}
      />
      <Acciones enviando={enviando} deshabilitado={!capataz} texto="Reasignar" onCerrar={onCerrar} />
    </form>
  )
}

export interface AccionesPlazoProps {
  accion: AccionPlazo | null
  onCerrar: () => void
  onCausa: (incidencia: IncidenciaResumen) => void
  onReasignada: (actualizada: IncidenciaResumen) => void
}

export default function AccionesPlazo({ accion, onCerrar, onCausa, onReasignada }: AccionesPlazoProps) {
  if (!accion) return null
  const { incidencia } = accion
  return (
    <VentanaFlotante
      abierto
      titulo={`${accion.tipo === 'causa' ? 'Anotar causa' : 'Reasignar'} · ${incidencia.codigo}`}
      descripcion={
        accion.tipo === 'reasignar' && incidencia.responsable
          ? `Ahora la atiende ${incidencia.responsable}.`
          : undefined
      }
      onCerrar={onCerrar}
    >
      {accion.tipo === 'causa' ? (
        <FormularioCausa incidencia={incidencia} onCerrar={onCerrar} onHecho={() => onCausa(incidencia)} />
      ) : (
        <FormularioReasignar incidencia={incidencia} onCerrar={onCerrar} onHecho={onReasignada} />
      )}
    </VentanaFlotante>
  )
}
