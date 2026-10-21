// RF-SER-004 · Registrar o corregir la referencia de la orden de compra
/**
 * El sistema solo registra el número de la OC emitida por Logística; no la emite ni la aprueba.
 * La corrección (ya hay OC) exige motivo y solo se permite antes del inicio (lo valida el back-end).
 */
import { useState } from 'react'
import { AreaTexto } from '../../../components/ui/CampoFormulario'
import CampoFormulario from '../../../components/ui/CampoFormulario'
import DialogoFormulario from '../../../components/ui/DialogoFormulario'
import { registrarOrdenCompra } from '../../../services/api/tercerizados'
import type { Atencion } from '../../../types/tercerizados'
import { LARGO_MAXIMO_OC, validarOrdenCompra, type ErroresOrdenCompra } from '../../../utils/validacionTercerizados'
import { useOperacionAtencion } from './useOperacionAtencion'

const ID_NUMERO = 'oc-numero'
const ID_MOTIVO = 'oc-motivo'

export interface DialogoOrdenCompraProps {
  atencion: Atencion
  abierto: boolean
  onCerrar: () => void
  onActualizada: (atencion: Atencion) => void
  onExito: (mensaje: string) => void
}

/** Mensajes propios para los campos que rechace el servidor. */
function erroresServidor(campos: string[]): ErroresOrdenCompra {
  return {
    numero: campos.includes('numero_orden_compra') ? `Revisa el número: obligatorio y de hasta ${LARGO_MAXIMO_OC} caracteres` : undefined,
    motivo: campos.includes('motivo') ? 'Revisa el motivo de la corrección' : undefined,
  }
}

function Formulario({ atencion, onCerrar, onActualizada, onExito }: Omit<DialogoOrdenCompraProps, 'abierto'>) {
  const tieneOc = Boolean(atencion.numero_orden_compra)
  const [numero, setNumero] = useState(tieneOc ? atencion.numero_orden_compra : '')
  const [motivo, setMotivo] = useState('')
  const [errores, setErrores] = useState<ErroresOrdenCompra>({})
  const { enviando, error, enviar } = useOperacionAtencion(atencion.id, onActualizada)

  const hayCambios = numero.trim() !== (tieneOc ? atencion.numero_orden_compra : '') || motivo.trim() !== ''
  const servidor = erroresServidor(error?.campos ?? [])

  async function registrar() {
    const nuevos = validarOrdenCompra({ numero, motivo }, tieneOc, atencion.numero_orden_compra)
    setErrores(nuevos)
    if (nuevos.numero || nuevos.motivo) {
      document.getElementById(nuevos.numero ? ID_NUMERO : ID_MOTIVO)?.focus()
      return
    }
    const valor = numero.trim()
    const ok = await enviar({
      ejecutar: () =>
        registrarOrdenCompra(atencion.id, tieneOc ? { numero_orden_compra: valor, motivo: motivo.trim() } : { numero_orden_compra: valor }),
      aplicada: (actual) => actual.numero_orden_compra === valor,
    })
    if (ok) onExito(tieneOc ? 'Orden de compra corregida' : 'Orden de compra registrada')
  }

  return (
    <DialogoFormulario
      abierto
      titulo={tieneOc ? 'Corregir orden de compra' : 'Registrar orden de compra'}
      descripcion="Registra el número de la orden emitida por Logística. El sistema no emite ni aprueba órdenes."
      textoConfirmar={tieneOc ? 'Corregir orden de compra' : 'Registrar orden de compra'}
      enviando={enviando}
      hayCambios={hayCambios}
      error={error}
      onEnviar={registrar}
      onCerrar={onCerrar}
    >
      <CampoFormulario
        id={ID_NUMERO}
        etiqueta="Número de la orden de compra"
        obligatorio
        ayuda={tieneOc ? `Registrada: ${atencion.numero_orden_compra}` : 'Por ejemplo, OC-2026-001'}
        maxLength={LARGO_MAXIMO_OC}
        autoComplete="off"
        value={numero}
        onChange={(e) => setNumero(e.target.value)}
        onBlur={() => {
          if (numero.trim().length > LARGO_MAXIMO_OC) setErrores((a) => ({ ...a, numero: `Usa como máximo ${LARGO_MAXIMO_OC} caracteres` }))
        }}
        error={errores.numero ?? servidor.numero}
        disabled={enviando}
      />
      {tieneOc && (
        <AreaTexto
          id={ID_MOTIVO}
          etiqueta="Motivo de la corrección"
          obligatorio
          ayuda="Queda en la auditoría de la atención"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          error={errores.motivo ?? servidor.motivo}
          disabled={enviando}
        />
      )}
    </DialogoFormulario>
  )
}

/** El formulario se monta al abrir: cada apertura empieza con los datos actuales de la atención. */
export default function DialogoOrdenCompra({ abierto, ...props }: DialogoOrdenCompraProps) {
  return abierto ? <Formulario {...props} /> : null
}
