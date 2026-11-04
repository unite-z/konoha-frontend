/**
 * «Generar propuesta» (RF-IA-003, CU-MOD06-005 pasos 1 y 2): periodo (por defecto, el mes siguiente), servicio y
 * modalidad. La IA solo propone: nada se programa hasta confirmar. Si la IA no está disponible (503, E1),
 * «Planificar de forma manual» lleva a Planificación, que sigue habilitada.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import Selector, { OPCION_TODOS } from '@/components/ui/Selector'
import { validarPeriodo, type ErroresPeriodo } from '@/components/ui/validacionPeriodo'
import { MOTIVO_CATALOGO_NO_DISPONIBLE } from '@/components/reportes-indicadores/useCatalogosFiltros'
import { useConsulta } from '@/hooks/useConsulta'
import { RUTAS_PLANIFICACION } from '@/router/rutasApp'
import { aErrorApi, type ErrorApi } from '@/services/api/cliente'
import { solicitarCronograma } from '@/services/api/cronogramaIa'
import { obtenerCatalogoComparacion } from '@/services/api/reportesGestion'
import type { SugerenciaCronograma } from '@/types/cronogramaIa'
import { mesSiguiente } from '@/utils/cronogramaIa'
import { OPCIONES_MODALIDAD } from '@/utils/estados'
import { enteroPositivo } from '@/utils/reportesGestion'
import estilos from './Cronograma.module.css'

export interface DialogoGenerarCronogramaProps {
  abierto: boolean
  onCerrar: () => void
  onCreada: (propuesta: SugerenciaCronograma) => void
}

export default function DialogoGenerarCronograma({ abierto, onCerrar, onCreada }: DialogoGenerarCronogramaProps) {
  const navigate = useNavigate()
  const predeterminado = useMemo(() => mesSiguiente(), [])
  const [desde, setDesde] = useState(predeterminado.desde)
  const [hasta, setHasta] = useState(predeterminado.hasta)
  const [servicio, setServicio] = useState('')
  const [modalidad, setModalidad] = useState('')
  const [errores, setErrores] = useState<ErroresPeriodo>({})
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<ErrorApi | null>(null)
  const catalogo = useConsulta(abierto ? 'catalogo-comparacion' : null, obtenerCatalogoComparacion)
  const opcionesServicio = (catalogo.datos?.tipos_servicio ?? [])
    .map((t) => ({ valor: String(t.id), texto: t.nombre }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es'))
  const iaNoDisponible = error?.estado === 503

  function cerrar() {
    setError(null)
    setErrores({})
    onCerrar()
  }

  async function enviar() {
    if (enviando) return
    const nuevos = validarPeriodo(desde, hasta)
    setErrores(nuevos)
    if (nuevos.desde || nuevos.hasta) {
      document.getElementById(nuevos.desde ? 'cronograma-desde' : 'cronograma-hasta')?.focus()
      return
    }
    setEnviando(true)
    setError(null)
    const idServicio = enteroPositivo(servicio)
    const modalidadValida = OPCIONES_MODALIDAD.find((o) => o.valor === modalidad)?.valor
    try {
      const propuesta = await solicitarCronograma({
        desde,
        hasta,
        ...(idServicio ? { tipo_servicio_ids: [idServicio] } : {}),
        ...(modalidadValida ? { modalidad: modalidadValida } : {}),
      })
      onCreada(propuesta)
    } catch (causa) {
      setError(aErrorApi(causa))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto={abierto}
      titulo="Generar propuesta"
      descripcion="La IA solo propone un cronograma. Nada se programa hasta que lo confirmes."
      textoConfirmar="Generar propuesta"
      enviando={enviando}
      error={error && !iaNoDisponible ? { titulo: 'No se pudo generar la propuesta', detalle: error.detalle } : null}
      onEnviar={() => void enviar()}
      onCerrar={cerrar}
    >
      {iaNoDisponible && (
        <AvisoEnLinea
          tono="error"
          titulo="La IA no está disponible"
          accion={{ texto: 'Planificar de forma manual', onClick: () => navigate(RUTAS_PLANIFICACION.resumen) }}
        >
          {error?.detalle}
        </AvisoEnLinea>
      )}
      <div className={estilos.periodo}>
        <CampoFormulario id="cronograma-desde" etiqueta="Desde" type="date" obligatorio value={desde} error={errores.desde} onChange={(e) => setDesde(e.target.value)} />
        <CampoFormulario id="cronograma-hasta" etiqueta="Hasta" type="date" obligatorio value={hasta} error={errores.hasta} onChange={(e) => setHasta(e.target.value)} />
      </div>
      <Selector
        id="cronograma-servicio"
        etiqueta="Servicio"
        valor={servicio}
        opciones={opcionesServicio}
        opcionTodos={`${OPCION_TODOS} los servicios`}
        bloqueadoMotivo={catalogo.estado === 'error' ? MOTIVO_CATALOGO_NO_DISPONIBLE : undefined}
        onCambiar={setServicio}
      />
      <Selector id="cronograma-modalidad" etiqueta="Modalidad" valor={modalidad} opciones={OPCIONES_MODALIDAD} opcionTodos={OPCION_TODOS} onCambiar={setModalidad} />
    </DialogoFormulario>
  )
}
