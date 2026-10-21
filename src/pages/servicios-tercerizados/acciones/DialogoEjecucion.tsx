// RF-SER-005 · Registrar el inicio o el fin del servicio
/**
 * Un solo componente para el inicio y el fin. La fecha y la hora se escriben en hora de Lima (el campo
 * `datetime-local` no lleva zona) y se envían con `-05:00`, sin depender de la zona del navegador.
 *
 * - Inicio: requiere OC referenciada; el back-end bloquea las atenciones de riesgo.
 * - Fin: no puede ser anterior al inicio.
 * - Una fecha futura se advierte, pero no se bloquea (el back-end la admite).
 */
import { useState } from 'react'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import CampoFormulario from '../../../components/ui/CampoFormulario'
import DialogoFormulario from '../../../components/ui/DialogoFormulario'
import { registrarFin, registrarInicio } from '../../../services/api/tercerizados'
import type { Atencion } from '../../../types/tercerizados'
import { formatearFechaHora } from '../../../utils/formato'
import { aInstanteLima, ahoraLimaLocal, milisegundos } from '../../../utils/instanteLima'
import { validarEjecucion, type ModoEjecucion } from '../../../utils/validacionTercerizados'
import { useOperacionAtencion } from './useOperacionAtencion'

const ID_FECHA = 'ejecucion-fecha'

export interface DialogoEjecucionProps {
  modo: ModoEjecucion
  atencion: Atencion
  abierto: boolean
  onCerrar: () => void
  onActualizada: (atencion: Atencion) => void
  onExito: (mensaje: string) => void
}

const TEXTOS: Record<ModoEjecucion, { titulo: string; etiqueta: string; exito: string; descripcion: string }> = {
  inicio: {
    titulo: 'Registrar inicio del servicio',
    etiqueta: 'Fecha y hora de inicio',
    exito: 'Inicio registrado: la atención está en ejecución',
    descripcion: 'Indica cuándo comenzó el proveedor. La atención pasará a «En ejecución».',
  },
  fin: {
    titulo: 'Registrar fin del servicio',
    etiqueta: 'Fecha y hora de fin',
    exito: 'Fin registrado: la atención queda pendiente del reporte del proveedor',
    descripcion: 'Indica cuándo terminó el proveedor. La atención pasará a «Ejecutado pendiente de reporte».',
  },
}

function Formulario({ modo, atencion, onCerrar, onActualizada, onExito }: Omit<DialogoEjecucionProps, 'abierto'>) {
  const textos = TEXTOS[modo]
  const [inicial] = useState(ahoraLimaLocal)
  const [valor, setValor] = useState(inicial)
  const [error, setErrorCampo] = useState<string | undefined>()
  const { enviando, error: errorEnvio, enviar } = useOperacionAtencion(atencion.id, onActualizada)

  const { advertencia } = validarEjecucion(modo, valor, atencion.fecha_hora_inicio)
  const errorServidor = errorEnvio?.campos.length ? 'Revisa la fecha y la hora' : undefined

  async function registrar() {
    const resultado = validarEjecucion(modo, valor, atencion.fecha_hora_inicio)
    setErrorCampo(resultado.error)
    if (resultado.error) {
      document.getElementById(ID_FECHA)?.focus()
      return
    }
    const instante = aInstanteLima(valor)
    const ok = await enviar({
      ejecutar: () => (modo === 'inicio' ? registrarInicio(atencion.id, instante) : registrarFin(atencion.id, instante)),
      aplicada: (actual) => {
        const registrado = modo === 'inicio' ? actual.fecha_hora_inicio : actual.fecha_hora_fin
        return registrado !== null && milisegundos(registrado) === milisegundos(instante)
      },
    })
    if (ok) onExito(textos.exito)
  }

  return (
    <DialogoFormulario
      abierto
      titulo={textos.titulo}
      descripcion={textos.descripcion}
      textoConfirmar={modo === 'inicio' ? 'Registrar inicio' : 'Registrar fin'}
      enviando={enviando}
      hayCambios={valor !== inicial}
      error={errorEnvio}
      onEnviar={registrar}
      onCerrar={onCerrar}
    >
      {modo === 'fin' && atencion.fecha_hora_inicio && (
        <p>
          Inicio registrado: <strong className="cifra">{formatearFechaHora(atencion.fecha_hora_inicio)}</strong>
        </p>
      )}
      <CampoFormulario
        id={ID_FECHA}
        etiqueta={textos.etiqueta}
        type="datetime-local"
        obligatorio
        ayuda="Hora de Lima"
        value={valor}
        onChange={(e) => {
          setValor(e.target.value)
          if (error) setErrorCampo(undefined)
        }}
        onBlur={() => setErrorCampo(validarEjecucion(modo, valor, atencion.fecha_hora_inicio).error)}
        error={error ?? errorServidor}
        disabled={enviando}
      />
      {advertencia && !error && <AvisoEnLinea tono="advertencia">{advertencia}</AvisoEnLinea>}
    </DialogoFormulario>
  )
}

/** El formulario se monta al abrir: cada apertura propone la hora actual de Lima. */
export default function DialogoEjecucion({ abierto, ...props }: DialogoEjecucionProps) {
  return abierto ? <Formulario {...props} /> : null
}
