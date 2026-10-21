// RF-SER-011 · Corregir el origen de la atención (solo jefe de sección, antes del inicio)
/**
 * Permite cambiar el origen y la unidad solicitante con un motivo, que queda en la auditoría. El back-end
 * solo lo admite antes del inicio (409 en otro caso). TODO urgente: mostrar en la ficha el historial de
 * correcciones con su motivo cuando la API exponga la auditoría.
 */
import { useState } from 'react'
import { AreaTexto } from '../../../components/ui/CampoFormulario'
import DialogoFormulario from '../../../components/ui/DialogoFormulario'
import { corregirOrigen } from '../../../services/api/tercerizados'
import type { Atencion, CorregirOrigenEntrada, UnidadInstitucional } from '../../../types/tercerizados'
import { textoOrigen } from '../../../utils/estadosTercerizados'
import { validarOrigen, type ErroresOrigen } from '../../../utils/validacionTercerizados'
import CamposOrigen, { type ValorCamposOrigen } from '../CamposOrigen'
import { useOperacionAtencion } from './useOperacionAtencion'

const PREFIJO = 'origen'
const ID_MOTIVO = 'origen-motivo'
const IDS: Record<keyof ErroresOrigen, string> = {
  origen: `${PREFIJO}-origen-Demanda`,
  unidad: `${PREFIJO}-unidad`,
  unidadProvisional: `${PREFIJO}-unidad-provisional`,
  motivo: ID_MOTIVO,
}

export interface DialogoOrigenProps {
  atencion: Atencion
  abierto: boolean
  onCerrar: () => void
  onActualizada: (atencion: Atencion) => void
  onExito: (mensaje: string) => void
}

function unidadActual(a: Atencion): UnidadInstitucional | null {
  if (!a.unidad_solicitante_id) return null
  return {
    id: a.unidad_solicitante_id,
    nombre: a.unidad_solicitante_nombre ?? `Unidad n.º ${a.unidad_solicitante_id}`,
    provisional: Boolean(a.unidad_solicitante_provisional),
    activo: true,
  }
}

function Formulario({ atencion, onCerrar, onActualizada, onExito }: Omit<DialogoOrigenProps, 'abierto'>) {
  const [campos, setCampos] = useState<ValorCamposOrigen>(() => ({
    origen: atencion.origen,
    unidadModo: 'existente',
    unidad: unidadActual(atencion),
    unidadProvisional: '',
  }))
  const [motivo, setMotivo] = useState('')
  const [intentado, setIntentado] = useState(false)
  const { enviando, error, enviar } = useOperacionAtencion(atencion.id, onActualizada)

  const valores = {
    origen: campos.origen,
    unidadModo: campos.unidadModo,
    unidadId: campos.unidad?.id ?? null,
    unidadProvisional: campos.unidadProvisional,
    motivo,
  }
  const actual = { origen: atencion.origen, unidadId: atencion.unidad_solicitante_id }
  const errores: ErroresOrigen = intentado ? validarOrigen(valores, actual) : {}
  const servidor = error?.campos.length ? 'Revisa este dato' : undefined
  const hayCambios =
    campos.origen !== atencion.origen ||
    (campos.unidad?.id ?? null) !== atencion.unidad_solicitante_id ||
    campos.unidadProvisional.trim() !== '' ||
    motivo.trim() !== ''

  async function registrar() {
    setIntentado(true)
    const nuevos = validarOrigen(valores, actual)
    const primero = (Object.keys(IDS) as (keyof ErroresOrigen)[]).find((k) => nuevos[k])
    if (primero) {
      document.getElementById(IDS[primero])?.focus()
      return
    }
    if (!campos.origen) return
    const entrada: CorregirOrigenEntrada = { origen: campos.origen, motivo: motivo.trim() }
    if (campos.origen === 'SolicitudUnidad') {
      if (campos.unidadModo === 'existente' && campos.unidad) entrada.unidad_solicitante_id = campos.unidad.id
      else entrada.unidad_provisional = campos.unidadProvisional.trim()
    }
    const ok = await enviar({
      ejecutar: () => corregirOrigen(atencion.id, entrada),
      aplicada: (a) =>
        a.origen === entrada.origen &&
        (entrada.unidad_solicitante_id !== undefined
          ? a.unidad_solicitante_id === entrada.unidad_solicitante_id
          : entrada.unidad_provisional !== undefined
            ? a.unidad_solicitante_nombre === entrada.unidad_provisional
            : a.unidad_solicitante_id === null),
    })
    if (ok) onExito('Origen corregido')
  }

  return (
    <DialogoFormulario
      abierto
      titulo="Corregir origen de la atención"
      descripcion={`Registrado: ${textoOrigen(atencion.origen)}${atencion.unidad_solicitante_nombre ? ` · ${atencion.unidad_solicitante_nombre}` : ''}. Solo se puede corregir antes del inicio del servicio.`}
      textoConfirmar="Corregir origen"
      enviando={enviando}
      hayCambios={hayCambios}
      error={error}
      onEnviar={registrar}
      onCerrar={onCerrar}
    >
      <CamposOrigen
        prefijo={PREFIJO}
        {...campos}
        errores={{
          origen: errores.origen ?? (error?.campos.includes('origen') ? servidor : undefined),
          unidad: errores.unidad,
          unidadProvisional: errores.unidadProvisional,
        }}
        deshabilitado={enviando}
        onCambiar={(cambios) => setCampos((c) => ({ ...c, ...cambios }))}
      />
      <AreaTexto
        id={ID_MOTIVO}
        etiqueta="Motivo de la corrección"
        obligatorio
        ayuda="Queda en la auditoría de la atención"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        error={errores.motivo ?? (error?.campos.includes('motivo') ? servidor : undefined)}
        disabled={enviando}
      />
    </DialogoFormulario>
  )
}

export default function DialogoOrigen({ abierto, ...props }: DialogoOrigenProps) {
  return abierto ? <Formulario {...props} /> : null
}
