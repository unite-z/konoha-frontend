/** HU-MOD03-001: edición de la frecuencia de un servicio en una estación (solo jefe de sección). */
import { useRef, useState } from 'react'
import CampoFormulario from '../../components/ui/CampoFormulario'
import DialogoFormulario from '../../components/ui/DialogoFormulario'
import { aErrorApi } from '../../services/api/cliente'
import { actualizarFrecuencia } from '../../services/api/planificacion'
import type { Estacion, FrecuenciaEstacion, ServicioPeriodico } from '../../types/planificacion'
import { validarFrecuencia, type BorradorFrecuencia, type ErroresFrecuencia } from '../../utils/validacionPlanificacion'

export interface DialogoFrecuenciaProps {
  servicio: ServicioPeriodico
  estacion: Estacion
  /** `null` si la estación aún no tiene frecuencia: el diálogo la crea. */
  frecuencia: FrecuenciaEstacion | null
  onCerrar: () => void
  onGuardado: (servicio: ServicioPeriodico) => void
}

const CAMPOS = { teorica: 'frecuencia_teorica_dias', practica: 'frecuencia_practica_dias', maxima: 'frecuencia_maxima_dias' } as const

export default function DialogoFrecuencia({ servicio, estacion, frecuencia, onCerrar, onGuardado }: DialogoFrecuenciaProps) {
  const inicial: BorradorFrecuencia = {
    teorica: frecuencia?.frecuencia_teorica_dias.toString() ?? '',
    practica: frecuencia?.frecuencia_practica_dias?.toString() ?? '',
    maxima: frecuencia?.frecuencia_maxima_dias?.toString() ?? '',
  }
  const [borrador, setBorrador] = useState(inicial)
  const [errores, setErrores] = useState<ErroresFrecuencia>({})
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enCurso = useRef(false)

  async function guardar() {
    if (enCurso.current) return
    const { errores: locales, entrada } = validarFrecuencia(borrador)
    setErrores(locales)
    setError(null)
    if (!entrada) {
      const primero = (Object.keys(locales) as (keyof BorradorFrecuencia)[])[0]
      document.getElementById(`frecuencia-${primero}`)?.focus()
      return
    }
    enCurso.current = true
    setEnviando(true)
    try {
      onGuardado(await actualizarFrecuencia(servicio.id, estacion, entrada))
    } catch (causa) {
      const fallo = aErrorApi(causa)
      const delServidor: ErroresFrecuencia = {}
      for (const [clave, campo] of Object.entries(CAMPOS)) {
        const mensajes = fallo.errores_campo[campo]
        if (mensajes?.length) delServidor[clave as keyof BorradorFrecuencia] = mensajes.join('. ')
      }
      if (fallo.codigo === 'frecuencia-maxima-menor') delServidor.maxima = fallo.detalle
      setErrores(delServidor)
      if (Object.keys(delServidor).length === 0) {
        setError({ titulo: fallo.estado === 403 ? 'Sin permiso' : 'No se pudo guardar', detalle: fallo.detalle })
      }
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  const campo = (clave: keyof BorradorFrecuencia, etiqueta: string, obligatorio = false) => (
    <CampoFormulario
      id={`frecuencia-${clave}`}
      etiqueta={etiqueta}
      obligatorio={obligatorio}
      inputMode="numeric"
      value={borrador[clave]}
      onChange={(e) => setBorrador({ ...borrador, [clave]: e.target.value })}
      error={errores[clave]}
      disabled={enviando}
    />
  )

  return (
    <DialogoFormulario
      abierto
      titulo={`Frecuencia de ${servicio.nombre} en ${estacion}`}
      descripcion="Días entre dos atenciones. La máxima no puede ser menor que la habitual (la práctica o, si no hay, la teórica)."
      textoConfirmar="Guardar frecuencia"
      enviando={enviando}
      hayCambios={JSON.stringify(borrador) !== JSON.stringify(inicial)}
      error={error}
      onEnviar={guardar}
      onCerrar={onCerrar}
    >
      {campo('teorica', 'Frecuencia teórica (días)', true)}
      {campo('practica', 'Frecuencia práctica (días)')}
      {campo('maxima', 'Frecuencia máxima (días)')}
    </DialogoFormulario>
  )
}
