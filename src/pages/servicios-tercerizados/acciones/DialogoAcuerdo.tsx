// RF-SER-011 · Acuerdo de la unidad solicitante con el trabajo realizado (solo jefe de sección)
/**
 * Solo para atenciones solicitadas por una unidad y después del fin. Registra si la unidad está de acuerdo,
 * en desacuerdo o aún no se pronuncia, con la fecha y los comentarios que comunicó.
 *
 * El acuerdo NO sustituye la conformidad del jefe de sección, no cierra la atención y no cambia su estado.
 * Un desacuerdo queda visible y auditado; no abre una subsanación (fuera de esta entrega).
 */
import { useState } from 'react'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import CampoFormulario, { AreaTexto } from '../../../components/ui/CampoFormulario'
import DialogoFormulario from '../../../components/ui/DialogoFormulario'
import Icono from '../../../components/ui/Icono'
import { registrarAcuerdoUnidad } from '../../../services/api/tercerizados'
import type { AcuerdoUnidadEntrada, Atencion } from '../../../types/tercerizados'
import { formatearFecha } from '../../../utils/formato'
import { fechaLimaDeInstante, hoyLima } from '../../../utils/instanteLima'
import {
  respuestaDeAcuerdo,
  validarAcuerdo,
  type ErroresAcuerdo,
  type RespuestaUnidad,
} from '../../../utils/validacionTercerizados'
import estilosNueva from '../nueva/NuevaAtencion.module.css'
import { useOperacionAtencion } from './useOperacionAtencion'

const ID_RESPUESTA = 'acuerdo-respuesta-pendiente'
const ID_FECHA = 'acuerdo-fecha'
const ID_COMENTARIOS = 'acuerdo-comentarios'

const OPCIONES: { valor: RespuestaUnidad; texto: string }[] = [
  { valor: 'acuerdo', texto: 'De acuerdo con el trabajo' },
  { valor: 'desacuerdo', texto: 'En desacuerdo' },
  { valor: 'pendiente', texto: 'Aún no se pronuncia' },
]

export interface DialogoAcuerdoProps {
  atencion: Atencion
  abierto: boolean
  onCerrar: () => void
  onActualizada: (atencion: Atencion) => void
  onExito: (mensaje: string) => void
}

function Formulario({ atencion, onCerrar, onActualizada, onExito }: Omit<DialogoAcuerdoProps, 'abierto'>) {
  const finLima = atencion.fecha_hora_fin ? fechaLimaDeInstante(atencion.fecha_hora_fin) : null
  const registrado = {
    acuerdo: atencion.acuerdo_unidad,
    fecha: atencion.fecha_acuerdo_unidad,
    comentarios: atencion.comentarios_acuerdo_unidad ?? '',
  }
  const [respuesta, setRespuesta] = useState<RespuestaUnidad>(() => respuestaDeAcuerdo(atencion.acuerdo_unidad))
  const [fecha, setFecha] = useState(() => atencion.fecha_acuerdo_unidad ?? hoyLima())
  const [comentarios, setComentarios] = useState(registrado.comentarios)
  const [intentado, setIntentado] = useState(false)
  const { enviando, error, enviar } = useOperacionAtencion(atencion.id, onActualizada)

  const valores = { respuesta, fecha, comentarios }
  const errores: ErroresAcuerdo = intentado ? validarAcuerdo(valores, finLima, registrado) : {}
  const hayCambios =
    respuesta !== respuestaDeAcuerdo(atencion.acuerdo_unidad) ||
    comentarios.trim() !== registrado.comentarios.trim() ||
    (respuesta !== 'pendiente' && fecha !== (registrado.fecha ?? hoyLima()))

  async function registrar() {
    setIntentado(true)
    const nuevos = validarAcuerdo(valores, finLima, registrado)
    if (nuevos.respuesta || nuevos.fecha || nuevos.comentarios) {
      document.getElementById(nuevos.fecha ? ID_FECHA : nuevos.comentarios ? ID_COMENTARIOS : ID_RESPUESTA)?.focus()
      return
    }
    const entrada: AcuerdoUnidadEntrada = {
      acuerdo_unidad: respuesta === 'pendiente' ? null : respuesta === 'acuerdo',
      fecha_acuerdo_unidad: respuesta === 'pendiente' ? null : fecha,
      comentarios_acuerdo_unidad: comentarios.trim(),
    }
    const ok = await enviar({
      ejecutar: () => registrarAcuerdoUnidad(atencion.id, entrada),
      aplicada: (a) =>
        a.acuerdo_unidad === entrada.acuerdo_unidad &&
        a.fecha_acuerdo_unidad === entrada.fecha_acuerdo_unidad &&
        (a.comentarios_acuerdo_unidad ?? '') === entrada.comentarios_acuerdo_unidad,
    })
    if (ok) onExito('Acuerdo de la unidad registrado. La atención mantiene su estado.')
  }

  return (
    <DialogoFormulario
      abierto
      titulo="Registrar acuerdo de la unidad"
      descripcion={`Lo que comunicó ${atencion.unidad_solicitante_nombre ?? 'la unidad solicitante'} sobre el trabajo realizado.`}
      textoConfirmar="Registrar acuerdo"
      enviando={enviando}
      hayCambios={hayCambios}
      error={error}
      onEnviar={registrar}
      onCerrar={onCerrar}
    >
      <AvisoEnLinea tono="info">
        El acuerdo de la unidad no sustituye la conformidad del jefe de sección, no cierra la atención y no cambia su
        estado.
      </AvisoEnLinea>
      <fieldset className={estilosNueva.opciones} disabled={enviando} aria-describedby={errores.respuesta ? 'acuerdo-respuesta-error' : undefined}>
        <legend className={estilosNueva.leyenda}>
          Respuesta de la unidad
          <span className={estilosNueva.asterisco} aria-hidden="true">
            {' '}
            *
          </span>
        </legend>
        {OPCIONES.map((opcion) => (
          <label key={opcion.valor} className={estilosNueva.radio}>
            <input
              id={`acuerdo-respuesta-${opcion.valor}`}
              type="radio"
              name="acuerdo-respuesta"
              checked={respuesta === opcion.valor}
              onChange={() => setRespuesta(opcion.valor)}
            />
            {opcion.texto}
          </label>
        ))}
        {errores.respuesta && (
          <p id="acuerdo-respuesta-error" className={estilosNueva.error}>
            <Icono nombre="aspa" tamano="sm" />
            <span>{errores.respuesta}</span>
          </p>
        )}
      </fieldset>
      {respuesta !== 'pendiente' && (
        <CampoFormulario
          id={ID_FECHA}
          etiqueta="Fecha en que la unidad respondió"
          type="date"
          obligatorio
          min={finLima ?? undefined}
          ayuda={finLima ? `No anterior al fin del servicio (${formatearFecha(finLima)})` : undefined}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          error={errores.fecha ?? (error?.campos.includes('fecha_acuerdo_unidad') ? 'Revisa la fecha' : undefined)}
          disabled={enviando}
        />
      )}
      <AreaTexto
        id={ID_COMENTARIOS}
        etiqueta={respuesta === 'desacuerdo' ? 'Qué observa la unidad' : 'Comentarios (opcional)'}
        obligatorio={respuesta === 'desacuerdo'}
        ayuda={respuesta === 'desacuerdo' ? 'El desacuerdo queda visible en la ficha; no abre una subsanación automática.' : undefined}
        value={comentarios}
        onChange={(e) => setComentarios(e.target.value)}
        error={errores.comentarios}
        disabled={enviando}
      />
    </DialogoFormulario>
  )
}

export default function DialogoAcuerdo({ abierto, ...props }: DialogoAcuerdoProps) {
  return abierto ? <Formulario {...props} /> : null
}
