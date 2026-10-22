/** HU-MOD03-002: edición de la duración máxima de un servicio (solo jefe de sección). */
import { useRef, useState } from 'react'
import CampoFormulario from '../../components/ui/CampoFormulario'
import DialogoFormulario from '../../components/ui/DialogoFormulario'
import { aErrorApi } from '../../services/api/cliente'
import { actualizarDuracion } from '../../services/api/planificacion'
import type { ServicioPeriodico } from '../../types/planificacion'
import { validarDuracion, type BorradorDuracion, type ErroresDuracion } from '../../utils/validacionPlanificacion'

export interface DialogoDuracionProps {
  servicio: ServicioPeriodico
  onCerrar: () => void
  onGuardado: (servicio: ServicioPeriodico) => void
}

const CAMPOS = {
  duracion: 'duracion_maxima_dias',
  limpieza: 'dias_limpieza',
  inicio: 'hora_inicio',
  fin: 'hora_fin',
} as const

export default function DialogoDuracion({ servicio, onCerrar, onGuardado }: DialogoDuracionProps) {
  const actual = servicio.duracion
  const inicial: BorradorDuracion = {
    duracion: actual?.duracion_maxima_dias.toString() ?? '',
    limpieza: actual?.dias_limpieza?.toString() ?? '',
    inicio: actual?.hora_inicio ?? '',
    fin: actual?.hora_fin ?? '',
  }
  const [borrador, setBorrador] = useState(inicial)
  const [errores, setErrores] = useState<ErroresDuracion>({})
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enCurso = useRef(false)

  async function guardar() {
    if (enCurso.current) return
    const { errores: locales, entrada } = validarDuracion(borrador)
    setErrores(locales)
    setError(null)
    if (!entrada) {
      document.getElementById(`duracion-${Object.keys(locales)[0]}`)?.focus()
      return
    }
    enCurso.current = true
    setEnviando(true)
    try {
      onGuardado(await actualizarDuracion(servicio.id, entrada))
    } catch (causa) {
      const fallo = aErrorApi(causa)
      const delServidor: ErroresDuracion = {}
      for (const [clave, campo] of Object.entries(CAMPOS)) {
        const mensajes = fallo.errores_campo[campo]
        if (mensajes?.length) delServidor[clave as keyof BorradorDuracion] = mensajes.join('. ')
      }
      if (fallo.codigo === 'horario-invalido') delServidor.fin = fallo.detalle
      setErrores(delServidor)
      if (Object.keys(delServidor).length === 0) {
        setError({ titulo: fallo.estado === 403 ? 'Sin permiso' : 'No se pudo guardar', detalle: fallo.detalle })
      }
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  const campo = (clave: keyof BorradorDuracion, etiqueta: string, tipo: 'text' | 'time', obligatorio = false) => (
    <CampoFormulario
      id={`duracion-${clave}`}
      etiqueta={etiqueta}
      obligatorio={obligatorio}
      type={tipo}
      inputMode={tipo === 'text' ? 'numeric' : undefined}
      value={borrador[clave]}
      onChange={(e) => setBorrador({ ...borrador, [clave]: e.target.value })}
      error={errores[clave]}
      disabled={enviando}
    />
  )

  return (
    <DialogoFormulario
      abierto
      titulo={`Duración de ${servicio.nombre}`}
      descripcion="Días que puede durar una atención y, si procede, su horario."
      textoConfirmar="Guardar duración"
      enviando={enviando}
      hayCambios={JSON.stringify(borrador) !== JSON.stringify(inicial)}
      error={error}
      onEnviar={guardar}
      onCerrar={onCerrar}
    >
      {campo('duracion', 'Duración máxima (días)', 'text', true)}
      {campo('limpieza', 'Días de limpieza', 'text')}
      {campo('inicio', 'Hora de inicio', 'time')}
      {campo('fin', 'Hora de fin', 'time')}
    </DialogoFormulario>
  )
}
