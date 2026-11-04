/**
 * Panel «Editar servicio» (AV-268, Figma 348-1997): une en un panel lateral la frecuencia de las cuatro estaciones
 * (teórica, práctica y máxima) y la duración (días de servicio, de limpieza y franja horaria, RN-017).
 *
 * Solo envía lo que cambia: un `PUT servicios/{id}/frecuencias/{estacion}/` por estación y `PUT servicios/{id}/duracion/`.
 * Avisa de que la frecuencia nueva solo afecta a los ciclos que se programen y de si un ciclo en curso ya supera la
 * duración nueva. «Ver historial» llega con AV-256; «Usar valores iniciales», cuando el backend los exponga.
 */
import { useRef, useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import { useConsulta } from '@/hooks/useConsulta'
import { aErrorApi } from '@/services/api/cliente'
import { actualizarDuracion, actualizarFrecuencia, listarProgramaciones } from '@/services/api/planificacion'
import { ESTACIONES, type Estacion, type ServicioPeriodico } from '@/types/planificacion'
import { formatearFechaHora } from '@/utils/formato'
import { hoyLima } from '@/utils/instanteLima'
import type { BorradorDuracion, BorradorFrecuencia } from '@/utils/validacionPlanificacion'
import { diasDelPeriodo } from '../calendario/programarCiclo'
import { rangoCiclos } from '../ciclos/ciclos'
import { fechaCorta } from '../resumen/resumenPlanificacion'
import estilos from './Configuracion.module.css'
import { borradorInicial, ultimaModificacion, validarServicio, type ValidacionServicio } from './configuracionServicios'

export interface PanelEditarServicioProps {
  servicio: ServicioPeriodico
  onCerrar: () => void
  /** Cada guardado parcial o completo devuelve el servicio actualizado. */
  onActualizado: (servicio: ServicioPeriodico) => void
  onGuardado: (servicio: ServicioPeriodico) => void
}

const ETIQUETAS_FRECUENCIA: Record<keyof BorradorFrecuencia, string> = { teorica: 'Teórica', practica: 'Práctica', maxima: 'Máxima' }

export default function PanelEditarServicio({ servicio, onCerrar, onActualizado, onGuardado }: PanelEditarServicioProps) {
  const [inicial] = useState(() => borradorInicial(servicio))
  const [borrador, setBorrador] = useState(inicial)
  const [validacion, setValidacion] = useState<ValidacionServicio | null>(null)
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enCurso = useRef(false)
  const hoy = hoyLima()
  const { desde, hasta } = rangoCiclos(hoy)
  const ciclos = useConsulta(`ciclos:${desde}`, (signal) => listarProgramaciones(desde, hasta, signal))

  const previa = validarServicio(borrador, inicial)
  const nuevaDuracion = previa.duracion?.duracion_maxima_dias
  const cicloExcedido = nuevaDuracion
    ? (ciclos.datos ?? []).find(
        (c) => c.tipo_servicio_id === servicio.id && c.estado === 'EnCurso' && diasDelPeriodo(c.fecha_inicio_real ?? c.fecha_inicio_prevista, hoy) > nuevaDuracion,
      )
    : undefined
  const modificado = ultimaModificacion(servicio)

  async function guardar() {
    if (enCurso.current) return
    const resultado = validarServicio(borrador, inicial)
    setValidacion(resultado)
    setError(null)
    if (!resultado.valido) return
    if (resultado.frecuencias.length === 0 && !resultado.duracion) {
      onCerrar()
      return
    }
    enCurso.current = true
    setEnviando(true)
    let actualizado = servicio
    try {
      for (const { estacion, entrada } of resultado.frecuencias) {
        actualizado = await actualizarFrecuencia(servicio.id, estacion, entrada)
        onActualizado(actualizado)
      }
      if (resultado.duracion) actualizado = await actualizarDuracion(servicio.id, resultado.duracion)
      onGuardado(actualizado)
    } catch (causa) {
      const fallo = aErrorApi(causa)
      setError({ titulo: fallo.estado === 403 ? 'Sin permiso' : 'No se pudo guardar todo', detalle: fallo.detalle })
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  const cambiarFrecuencia = (estacion: Estacion, clave: keyof BorradorFrecuencia, valor: string) =>
    setBorrador((b) => ({ ...b, frecuencias: { ...b.frecuencias, [estacion]: { ...b.frecuencias[estacion], [clave]: valor } } }))
  const cambiarDuracion = (clave: keyof BorradorDuracion, valor: string) => setBorrador((b) => ({ ...b, duracion: { ...b.duracion, [clave]: valor } }))
  const errorDuracion = (clave: keyof BorradorDuracion) => validacion?.erroresDuracion[clave]

  return (
    <DialogoFormulario
      abierto
      ancho="lateral"
      titulo={servicio.nombre}
      descripcion={servicio.es_ruidoso ? 'Servicio ruidoso' : undefined}
      textoConfirmar="Guardar cambios"
      enviando={enviando}
      hayCambios={JSON.stringify(borrador) !== JSON.stringify(inicial)}
      error={error}
      onEnviar={() => void guardar()}
      onCerrar={onCerrar}
    >
      <h3 className={estilos.apartado}>Frecuencia por estación (días)</h3>
      {ESTACIONES.map((estacion) => (
        <fieldset key={estacion} className={estilos.estacion}>
          <legend className={estilos.leyenda}>{estacion}</legend>
          {(Object.keys(ETIQUETAS_FRECUENCIA) as (keyof BorradorFrecuencia)[]).map((clave) => (
            <CampoFormulario
              key={clave}
              id={`frecuencia-${estacion}-${clave}`}
              etiqueta={ETIQUETAS_FRECUENCIA[clave]}
              obligatorio={clave === 'teorica'}
              formato="entero"
              compacto
              value={borrador.frecuencias[estacion][clave]}
              onChange={(e) => cambiarFrecuencia(estacion, clave, e.target.value)}
              error={validacion?.erroresFrecuencia[estacion]?.[clave]}
              disabled={enviando}
            />
          ))}
        </fieldset>
      ))}
      {previa.frecuencias.length > 0 && (
        <AvisoEnLinea tono="info">La nueva frecuencia solo afecta a los ciclos que se programen a partir de ahora.</AvisoEnLinea>
      )}

      <h3 className={estilos.apartado}>Duración del ciclo</h3>
      <div className={estilos.pareja}>
        <CampoFormulario id="duracion-duracion" etiqueta="Días de servicio" obligatorio formato="entero" value={borrador.duracion.duracion} onChange={(e) => cambiarDuracion('duracion', e.target.value)} error={errorDuracion('duracion')} disabled={enviando} />
        <CampoFormulario id="duracion-limpieza" etiqueta="Días de limpieza" formato="entero" value={borrador.duracion.limpieza} onChange={(e) => cambiarDuracion('limpieza', e.target.value)} error={errorDuracion('limpieza')} disabled={enviando} />
        <CampoFormulario id="duracion-inicio" etiqueta="Hora de inicio" type="time" value={borrador.duracion.inicio} onChange={(e) => cambiarDuracion('inicio', e.target.value)} error={errorDuracion('inicio')} disabled={enviando} />
        <CampoFormulario id="duracion-fin" etiqueta="Hora de fin" type="time" value={borrador.duracion.fin} onChange={(e) => cambiarDuracion('fin', e.target.value)} error={errorDuracion('fin')} disabled={enviando} />
      </div>
      {cicloExcedido && (
        <AvisoEnLinea tono="advertencia" titulo="Un ciclo en curso ya supera la nueva duración">
          Empezó el {fechaCorta(cicloExcedido.fecha_inicio_real ?? cicloExcedido.fecha_inicio_prevista)}: se generará una alerta de duración excedida.
        </AvisoEnLinea>
      )}

      {modificado && (
        <p className={estilos.modificado}>
          Última modificación: {formatearFechaHora(modificado.fecha)} · {modificado.autor}
        </p>
      )}
    </DialogoFormulario>
  )
}
