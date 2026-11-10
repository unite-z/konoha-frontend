// RF-SER-007 · Conformidad u observación del informe del proveedor (solo jefe de sección)
/**
 * Con el reporte adjunto, el jefe de sección da la conformidad o observa el informe, con fecha y comentarios.
 * Conforme cierra el ciclo de la atención; observar la deja «Observado» hasta que el proveedor entregue una
 * nueva revisión (RF-SER-012). No es el acuerdo de la unidad solicitante, que se registra aparte.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import CampoFormulario, { AreaTexto } from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import { registrarConformidad } from '@/services/api/tercerizados'
import type { Atencion, ConformidadEntrada, ResultadoConformidad } from '@/types/tercerizados'
import { formatearFecha } from '@/utils/formato'
import { fechaLimaDeInstante, hoyLima } from '@/utils/instanteLima'
import { validarConformidad } from '@/utils/validacionTercerizados'
import { useOperacionAtencion } from './useOperacionAtencion'

const ID_RESULTADO = 'conformidad-resultado-conforme'
const ID_FECHA = 'conformidad-fecha'
const ID_COMENTARIOS = 'conformidad-comentarios'

const OPCIONES: { valor: ResultadoConformidad; texto: string; descripcion: string }[] = [
  { valor: 'Conforme', texto: 'Dar la conformidad', descripcion: 'El informe y el trabajo son correctos.' },
  { valor: 'Observada', texto: 'Observar el informe', descripcion: 'El proveedor debe corregirlo (subsanación).' },
]

export interface DialogoConformidadProps {
  atencion: Atencion
  abierto: boolean
  onCerrar: () => void
  onActualizada: (atencion: Atencion) => void
  onExito: (mensaje: string) => void
}

function Formulario({ atencion, onCerrar, onActualizada, onExito }: Omit<DialogoConformidadProps, 'abierto'>) {
  const finLima = atencion.fecha_hora_fin ? fechaLimaDeInstante(atencion.fecha_hora_fin) : null
  const [resultado, setResultado] = useState<ResultadoConformidad | null>(null)
  const [fecha, setFecha] = useState(() => hoyLima())
  const [comentarios, setComentarios] = useState('')
  const [intentado, setIntentado] = useState(false)
  const { enviando, error, enviar } = useOperacionAtencion(atencion.id, onActualizada)

  const errores = intentado ? validarConformidad({ resultado, fecha, comentarios }, finLima) : {}
  const observando = resultado === 'Observada'

  async function registrar() {
    setIntentado(true)
    const nuevos = validarConformidad({ resultado, fecha, comentarios }, finLima)
    if (!resultado || nuevos.resultado || nuevos.fecha || nuevos.comentarios) {
      document.getElementById(nuevos.resultado ? ID_RESULTADO : nuevos.fecha ? ID_FECHA : ID_COMENTARIOS)?.focus()
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
        resultado === 'Conforme'
          ? 'Conformidad registrada. La atención quedó cerrada como conforme.'
          : 'Observación registrada. La atención quedó observada, a la espera de una nueva revisión.',
      )
    }
  }

  return (
    <DialogoFormulario
      abierto
      titulo="Conformidad del servicio"
      descripcion="Tu decisión sobre el informe que entregó el proveedor."
      textoConfirmar="Registrar decisión"
      enviando={enviando}
      hayCambios={resultado !== null || comentarios.trim() !== ''}
      error={error}
      onEnviar={registrar}
      onCerrar={onCerrar}
    >
      {atencion.origen === 'SolicitudUnidad' && (
        <AvisoEnLinea tono="info">El acuerdo de la unidad solicitante se registra aparte; no reemplaza esta decisión.</AvisoEnLinea>
      )}
      <GrupoOpciones
        etiqueta="Decisión"
        idBase="conformidad-resultado"
        opciones={OPCIONES}
        valor={resultado}
        onCambiar={setResultado}
        obligatorio
        error={errores.resultado}
        deshabilitado={enviando}
      />
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
        etiqueta={observando ? 'Qué debe corregir el proveedor' : 'Comentarios (opcional)'}
        obligatorio={observando}
        ayuda={observando ? 'La atención queda «Observado» hasta que el proveedor suba una nueva revisión.' : undefined}
        value={comentarios}
        onChange={(e) => setComentarios(e.target.value)}
        error={errores.comentarios}
        disabled={enviando}
      />
    </DialogoFormulario>
  )
}

export default function DialogoConformidad({ abierto, ...props }: DialogoConformidadProps) {
  return abierto ? <Formulario {...props} /> : null
}
