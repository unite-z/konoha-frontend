/**
 * Decisión del jefe de sección sobre el informe (RF-SER-007, P-13). «Aprobar» da la conformidad y cierra la
 * atención; «Pedir foto u observar» la deja «Observado» con lo que debe corregir el proveedor. Misma operación
 * del back-end que el diálogo de conformidad actual (`POST atenciones/{id}/conformidad/`), con la decisión ya elegida.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import { AreaTexto } from '@/design-system/CampoFormulario'
import CampoFormulario from '@/design-system/CampoFormulario'
import DialogoFormulario from '@/design-system/DialogoFormulario'
import { useOperacionAtencion } from '@/pages/servicios-tercerizados/acciones/useOperacionAtencion'
import { registrarConformidad } from '@/services/api/tercerizados'
import type { Atencion, ConformidadEntrada, ResultadoConformidad } from '@/types/tercerizados'
import { formatearFecha } from '@/utils/formato'
import { fechaLimaDeInstante, hoyLima } from '@/utils/instanteLima'
import { validarConformidad } from '@/utils/validacionTercerizados'

export type ModoDecision = 'aprobar' | 'observar'

/** Texto que P-13 fija para «Pedir foto»: es una observación con esta explicación. */
export const TEXTO_PEDIR_FOTO = 'Falta evidencia fotográfica.'

const ID_FECHA = 'decision-fecha'
const ID_COMENTARIOS = 'decision-comentarios'

export interface DialogoDecisionProps {
  modo: ModoDecision
  atencion: Atencion
  abierto: boolean
  onCerrar: () => void
  onActualizada: (atencion: Atencion) => void
  onExito: (mensaje: string) => void
}

function Formulario({ modo, atencion, onCerrar, onActualizada, onExito }: Omit<DialogoDecisionProps, 'abierto'>) {
  const resultado: ResultadoConformidad = modo === 'aprobar' ? 'Conforme' : 'Observada'
  const finLima = atencion.fecha_hora_fin ? fechaLimaDeInstante(atencion.fecha_hora_fin) : null
  const [fecha, setFecha] = useState(() => hoyLima())
  const [comentarios, setComentarios] = useState(modo === 'observar' ? TEXTO_PEDIR_FOTO : '')
  const [intentado, setIntentado] = useState(false)
  const { enviando, error, enviar } = useOperacionAtencion(atencion.id, onActualizada)

  const errores = intentado ? validarConformidad({ resultado, fecha, comentarios }, finLima) : {}

  async function registrar() {
    setIntentado(true)
    const nuevos = validarConformidad({ resultado, fecha, comentarios }, finLima)
    if (nuevos.fecha || nuevos.comentarios) {
      document.getElementById(nuevos.fecha ? ID_FECHA : ID_COMENTARIOS)?.focus()
      return
    }
    const entrada: ConformidadEntrada = { resultado, fecha_conformidad: fecha, comentarios: comentarios.trim() }
    const previas = atencion.conformidades?.length ?? 0
    const ok = await enviar({
      ejecutar: () => registrarConformidad(atencion.id, entrada),
      aplicada: (a) => (a.conformidades?.length ?? 0) > previas,
    })
    if (ok) {
      onExito(
        modo === 'aprobar'
          ? 'Conformidad registrada. La atención quedó cerrada como conforme.'
          : 'Observación registrada. La atención quedó observada, a la espera de una nueva revisión.',
      )
    }
  }

  return (
    <DialogoFormulario
      abierto
      titulo={modo === 'aprobar' ? 'Aprobar el servicio' : 'Pedir foto u observar'}
      descripcion={
        modo === 'aprobar'
          ? 'El informe y el trabajo son correctos: la atención se cierra como conforme.'
          : 'La atención queda «Observado» hasta que el proveedor entregue una nueva revisión.'
      }
      textoConfirmar={modo === 'aprobar' ? 'Aprobar' : 'Registrar observación'}
      enviando={enviando}
      hayCambios={modo === 'aprobar' ? comentarios.trim() !== '' : comentarios !== TEXTO_PEDIR_FOTO}
      error={error}
      onEnviar={registrar}
      onCerrar={onCerrar}
    >
      {atencion.origen === 'SolicitudUnidad' && (
        <AvisoEnLinea tono="info">
          El acuerdo de la unidad solicitante se registra aparte; no reemplaza esta decisión.
        </AvisoEnLinea>
      )}
      <CampoFormulario
        id={ID_FECHA}
        etiqueta="Fecha de la decisión"
        type="date"
        obligatorio
        min={finLima ?? undefined}
        ayuda={finLima ? `No anterior al fin del servicio (${formatearFecha(finLima)})` : undefined}
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        error={errores.fecha ?? (error?.campos.includes('fecha_conformidad') ? 'Revisa la fecha' : undefined)}
        disabled={enviando}
      />
      <AreaTexto
        id={ID_COMENTARIOS}
        etiqueta={modo === 'observar' ? 'Qué debe corregir o aportar el proveedor' : 'Comentarios (opcional)'}
        obligatorio={modo === 'observar'}
        value={comentarios}
        onChange={(e) => setComentarios(e.target.value)}
        error={errores.comentarios}
        disabled={enviando}
      />
    </DialogoFormulario>
  )
}

export default function DialogoDecision({ abierto, ...props }: DialogoDecisionProps) {
  return abierto ? <Formulario {...props} /> : null
}
