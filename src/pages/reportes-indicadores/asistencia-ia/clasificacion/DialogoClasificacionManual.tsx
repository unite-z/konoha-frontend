/**
 * «Clasificar manualmente» (RF-IA-005, E1 y A1): los mismos campos, vacíos. Se registra sin sugerencia de la IA, así el
 * flujo no se bloquea aunque la IA falle o la evidencia sea insuficiente. No deriva la incidencia.
 */
import { useState } from 'react'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import { aErrorApi } from '@/services/api/cliente'
import { clasificarManual } from '@/services/api/clasificacionIncidenciaIa'
import type { CampoClasificacion, SugerenciaClasificacion, ValoresClasificacion } from '@/types/clasificacionIncidenciaIa'
import { CAMPOS, CAMPOS_OBLIGATORIOS, validarManual, VALORES_VACIOS } from '@/utils/clasificacionIncidenciaIa'
import estilos from './Clasificacion.module.css'
import ControlCampo from './ControlCampo'

export interface DialogoClasificacionManualProps {
  /** Incidencia que se clasifica (id y código), o `null` con el diálogo cerrado. */
  incidencia: { id: number; codigo: string } | null
  onCerrar: () => void
  onRegistrada: (registro: SugerenciaClasificacion) => void
}

export default function DialogoClasificacionManual({ incidencia, onCerrar, onRegistrada }: DialogoClasificacionManualProps) {
  const [valores, setValores] = useState<ValoresClasificacion>(VALORES_VACIOS)
  const [errores, setErrores] = useState<Partial<Record<CampoClasificacion, string>>>({})
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)

  function cerrar() {
    setValores(VALORES_VACIOS)
    setErrores({})
    setErrorEnvio(null)
    onCerrar()
  }

  async function enviar() {
    if (!incidencia || enviando) return
    const nuevos = validarManual(valores)
    setErrores(nuevos)
    const primero = CAMPOS.find((c) => nuevos[c])
    if (primero) {
      document.getElementById(`manual-${primero}`)?.focus()
      return
    }
    setEnviando(true)
    setErrorEnvio(null)
    try {
      onRegistrada(await clasificarManual({ incidencia_id: incidencia.id, valores }))
      setValores(VALORES_VACIOS)
    } catch (causa) {
      setErrorEnvio(aErrorApi(causa).detalle)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto={incidencia !== null}
      titulo="Clasificar manualmente"
      descripcion={incidencia ? `${incidencia.codigo}. Se registra tal como la indicas, sin sugerencia de la IA. No se deriva la incidencia.` : undefined}
      textoConfirmar="Registrar clasificación"
      enviando={enviando}
      hayCambios={CAMPOS.some((c) => valores[c] !== null)}
      error={errorEnvio ? { titulo: 'No se pudo registrar la clasificación', detalle: errorEnvio } : null}
      conObligatorios
      onEnviar={() => void enviar()}
      onCerrar={cerrar}
    >
      <div className={estilos.pila}>
        {CAMPOS.map((campo) => (
          <ControlCampo
            key={campo}
            campo={campo}
            idBase="manual"
            obligatorio={CAMPOS_OBLIGATORIOS.includes(campo)}
            valor={valores[campo]}
            error={errores[campo]}
            onCambiar={(v) => setValores((actual) => ({ ...actual, [campo]: v }))}
          />
        ))}
      </div>
    </DialogoFormulario>
  )
}
