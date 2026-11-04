/**
 * Tarjeta «Plazo de incidencias sencillas» de la bandeja (AV-283, Figma 388-7027 y 394-9392; RN-019, AV-280): una fila
 * por alerta con su nivel, la incidencia, las horas y el capataz, y «Reasignar» y «Anotar causa».
 */
import { useState } from 'react'
import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import Estado from '@/components/ui/Estado'
import Selector from '@/components/ui/Selector'
import { useConsulta } from '@/hooks/useConsulta'
import { anotarCausaRetraso, listarCapatacesDisponibles, reasignarIncidencia } from '@/services/api/incidencias'
import type { IncidenciaResumen } from '@/types/incidencias'
import { NIVEL_PLAZO, textoAlertaPlazo, type AlertaPlazo } from './bandeja'
import estilos from './Incidencias.module.css'

const MAXIMO_CAUSA = 300

function DialogoCausa({ incidencia, onCerrar, onAnotada }: { incidencia: IncidenciaResumen; onCerrar: () => void; onAnotada: () => void }) {
  const [causa, setCausa] = useState('')
  const [mostrarError, setMostrarError] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)
  const errorCausa = causa.trim() ? undefined : 'Escribe la causa del retraso.'

  async function guardar() {
    setMostrarError(true)
    if (errorCausa) return
    setEnviando(true)
    setError(null)
    try {
      await anotarCausaRetraso(incidencia.id, causa.trim())
      onAnotada()
    } catch (causaError) {
      setError({ titulo: 'No se pudo anotar la causa', detalle: causaError instanceof Error ? causaError.message : 'Inténtalo de nuevo.' })
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto
      ancho="estrecho"
      titulo={`Anotar causa · ${incidencia.codigo}`}
      textoConfirmar="Guardar"
      textoCancelar="Volver"
      conObligatorios={false}
      hayCambios={Boolean(causa.trim())}
      enviando={enviando}
      error={error}
      onEnviar={() => void guardar()}
      onCerrar={onCerrar}
    >
      <CampoFormulario
        id="causa-retraso"
        etiqueta="Causa"
        obligatorio
        value={causa}
        maxLength={MAXIMO_CAUSA}
        onChange={(e) => setCausa(e.target.value)}
        error={mostrarError ? errorCausa : undefined}
      />
    </DialogoFormulario>
  )
}

function DialogoReasignar({ incidencia, onCerrar, onReasignada }: { incidencia: IncidenciaResumen; onCerrar: () => void; onReasignada: (actualizada: IncidenciaResumen) => void }) {
  const capataces = useConsulta(`capataces:${incidencia.id}`, (signal) => listarCapatacesDisponibles(incidencia.id, signal))
  const [capataz, setCapataz] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)

  async function reasignar() {
    if (!capataz) return
    setEnviando(true)
    setError(null)
    try {
      onReasignada(await reasignarIncidencia(incidencia.id, Number(capataz)))
    } catch (causa) {
      setError({ titulo: 'No se pudo reasignar', detalle: causa instanceof Error ? causa.message : 'Inténtalo de nuevo.' })
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto
      ancho="estrecho"
      titulo={`Reasignar · ${incidencia.codigo}`}
      descripcion={incidencia.responsable ? `Ahora la atiende ${incidencia.responsable}.` : undefined}
      textoConfirmar="Reasignar"
      textoCancelar="Volver"
      conObligatorios={false}
      hayCambios={Boolean(capataz)}
      envioDeshabilitado={!capataz}
      enviando={enviando}
      error={error}
      onEnviar={() => void reasignar()}
      onCerrar={onCerrar}
    >
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
    </DialogoFormulario>
  )
}

export interface AlertasPlazoProps {
  alertas: AlertaPlazo[]
  onAviso: (mensaje: string) => void
  onReasignada: (actualizada: IncidenciaResumen) => void
}

export default function AlertasPlazo({ alertas, onAviso, onReasignada }: AlertasPlazoProps) {
  const [dialogo, setDialogo] = useState<{ tipo: 'causa' | 'reasignar'; incidencia: IncidenciaResumen } | null>(null)
  if (alertas.length === 0) return null

  return (
    <section className={estilos.alertas} aria-labelledby="alertas-plazo">
      <h2 id="alertas-plazo" className={estilos.tituloAlertas}>
        Plazo de incidencias sencillas
      </h2>
      <ul className={estilos.listaAlertas}>
        {alertas.map((alerta) => {
          const nivel = NIVEL_PLAZO[alerta.nivel]
          return (
            <li key={alerta.incidencia.id} className={estilos.filaAlerta}>
              <Estado tono={nivel.tono} texto={nivel.texto} punto />
              <span className={estilos.textoAlerta}>{textoAlertaPlazo(alerta)}</span>
              <Boton variante="secundario" onClick={() => setDialogo({ tipo: 'reasignar', incidencia: alerta.incidencia })}>
                Reasignar
              </Boton>
              <Boton variante="secundario" onClick={() => setDialogo({ tipo: 'causa', incidencia: alerta.incidencia })}>
                Anotar causa
              </Boton>
            </li>
          )
        })}
      </ul>

      {dialogo?.tipo === 'causa' && (
        <DialogoCausa
          incidencia={dialogo.incidencia}
          onCerrar={() => setDialogo(null)}
          onAnotada={() => {
            onAviso(`Causa anotada en ${dialogo.incidencia.codigo}`)
            setDialogo(null)
          }}
        />
      )}
      {dialogo?.tipo === 'reasignar' && (
        <DialogoReasignar
          incidencia={dialogo.incidencia}
          onCerrar={() => setDialogo(null)}
          onReasignada={(actualizada) => {
            onReasignada(actualizada)
            onAviso(`${actualizada.codigo} reasignada a ${actualizada.responsable ?? 'otro capataz'}`)
            setDialogo(null)
          }}
        />
      )}
    </section>
  )
}
