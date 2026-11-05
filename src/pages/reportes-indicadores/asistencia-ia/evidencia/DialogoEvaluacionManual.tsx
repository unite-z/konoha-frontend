/**
 * «Registrar evaluación manual» (RF-IA-006, E1 y A1): la categoría de afectación o «No es posible concluir», sin IA.
 * Funciona aunque la IA no esté disponible o las fotografías no sirvan. No indica ningún tratamiento.
 */
import { useState } from 'react'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import { aErrorApi } from '@/services/api/cliente'
import { registrarEvaluacionManual } from '@/services/api/evidenciaFitosanitariaIa'
import type { SugerenciaEvidencia } from '@/types/evidenciaFitosanitariaIa'
import { cuerpoValidacion, FORMULARIO_VACIO, type ErroresValidacion, type FormularioValidacion } from '@/utils/evidenciaFitosanitariaIa'
import ValidacionTecnica from './ValidacionTecnica'

/** Planta que se evalúa y su texto para el diálogo. */
export interface ContextoManual {
  ejemplar_id: number | null
  atencion_id: number | null
  texto: string
}

export interface DialogoEvaluacionManualProps {
  contexto: ContextoManual | null
  onCerrar: () => void
  onRegistrada: (registro: SugerenciaEvidencia) => void
}

export default function DialogoEvaluacionManual({ contexto, onCerrar, onRegistrada }: DialogoEvaluacionManualProps) {
  const [formulario, setFormulario] = useState<FormularioValidacion>(FORMULARIO_VACIO)
  const [errores, setErrores] = useState<ErroresValidacion>({})
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)

  function cerrar() {
    setFormulario(FORMULARIO_VACIO)
    setErrores({})
    setErrorEnvio(null)
    onCerrar()
  }

  async function enviar() {
    if (!contexto || enviando) return
    const { cuerpo, errores: nuevos } = cuerpoValidacion(formulario, [])
    setErrores(nuevos)
    if (!cuerpo || cuerpo.resultado === 'Confirmada') {
      document.getElementById(nuevos.categoria ? 'manual-categoria' : 'manual-opcion-otra')?.focus()
      return
    }
    setEnviando(true)
    setErrorEnvio(null)
    try {
      const { hipotesis_clave: _clave, resultado, ...resto } = cuerpo
      onRegistrada(await registrarEvaluacionManual({ ...resto, resultado, ejemplar_id: contexto.ejemplar_id, atencion_id: contexto.atencion_id }))
      setFormulario(FORMULARIO_VACIO)
    } catch (causa) {
      setErrorEnvio(aErrorApi(causa).detalle)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto={contexto !== null}
      titulo="Registrar evaluación manual"
      descripcion={contexto ? `${contexto.texto}. Se registra sin IA. No se indica ningún tratamiento.` : undefined}
      textoConfirmar="Registrar evaluación"
      enviando={enviando}
      hayCambios={formulario.opcion !== null || formulario.comentario !== ''}
      error={errorEnvio ? { titulo: 'No se pudo registrar la evaluación', detalle: errorEnvio } : null}
      conObligatorios
      onEnviar={() => void enviar()}
      onCerrar={cerrar}
    >
      <ValidacionTecnica idBase="manual" hipotesis={[]} formulario={formulario} onCambiar={(c) => setFormulario((f) => ({ ...f, ...c }))} errores={errores} />
    </DialogoFormulario>
  )
}
