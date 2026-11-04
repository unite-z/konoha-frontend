/**
 * «Registrar recursos sin IA» (RF-IA-004, E1 y A1): el mismo formulario de recursos, vacío. Se confirma igual que una
 * estimación, pero sin recomendación: el flujo nunca se bloquea aunque la IA falle o no haya antecedentes.
 */
import { useState } from 'react'
import DialogoFormulario from '../../../../components/ui/DialogoFormulario'
import { aErrorApi } from '../../../../services/api/cliente'
import { registrarRecursosManual } from '../../../../services/api/estimacionIa'
import type { SolicitudEstimacion, SugerenciaEstimacion } from '../../../../types/estimacionIa'
import {
  deRecursosEnEdicion,
  hayErrores,
  recursosVacios,
  unidadesSugeridas,
  validarConfirmados,
  type ErroresConfirmados,
  type RecursosEnEdicion,
} from '../../../../utils/estimacionIa'
import FormularioRecursos from './FormularioRecursos'

export interface DialogoRecursosManualProps {
  /** Actividad o descripción para la que se registran los recursos, y su texto para el diálogo. */
  contexto: { solicitud: SolicitudEstimacion; texto: string } | null
  onCerrar: () => void
  onRegistrado: (registro: SugerenciaEstimacion) => void
}

export default function DialogoRecursosManual({ contexto, onCerrar, onRegistrado }: DialogoRecursosManualProps) {
  const [valores, setValores] = useState<RecursosEnEdicion>(recursosVacios())
  const [errores, setErrores] = useState<ErroresConfirmados>({})
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)

  function cerrar() {
    setValores(recursosVacios())
    setErrores({})
    setErrorEnvio(null)
    onCerrar()
  }

  async function enviar() {
    if (!contexto || enviando) return
    const confirmado = deRecursosEnEdicion(valores)
    const nuevos = validarConfirmados(confirmado)
    if (confirmado.operarios === null) nuevos.operarios = 'Indica los operarios'
    if (confirmado.duracion === null) nuevos.duracion = 'Indica la duración'
    setErrores(nuevos)
    if (hayErrores(nuevos)) {
      document.getElementById(nuevos.operarios ? 'manual-operarios' : nuevos.duracion ? 'manual-duracion' : 'manual-insumos-nombre-0')?.focus()
      return
    }
    setEnviando(true)
    setErrorEnvio(null)
    try {
      onRegistrado(await registrarRecursosManual({ ...contexto.solicitud, confirmado }))
      setValores(recursosVacios())
    } catch (causa) {
      setErrorEnvio(aErrorApi(causa).detalle)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto={contexto !== null}
      titulo="Registrar recursos sin IA"
      descripcion={contexto ? `${contexto.texto}. Se registran tal como los indicas, sin recomendación de la IA.` : undefined}
      textoConfirmar="Registrar recursos"
      enviando={enviando}
      hayCambios={valores.operarios !== '' || valores.duracion !== '' || valores.insumos.length > 0}
      error={errorEnvio ? { titulo: 'No se pudieron registrar los recursos', detalle: errorEnvio } : null}
      ancho="amplio"
      conObligatorios
      onEnviar={() => void enviar()}
      onCerrar={cerrar}
    >
      <FormularioRecursos idBase="manual" valores={valores} onCambiar={setValores} errores={errores} unidades={unidadesSugeridas([])} />
    </DialogoFormulario>
  )
}
