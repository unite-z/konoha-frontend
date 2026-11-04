/**
 * Panel «Editar servicio» (AV-268, Figma 348-1997): une en un panel lateral la frecuencia de las cuatro estaciones
 * (tabla con teórica, práctica y máxima) y la duración del ciclo (días de servicio, de limpieza y franja horaria,
 * RN-017). Valida en línea, con los errores de la tabla debajo de ella, y «Guardar cambios» se desactiva si hay
 * errores o nada cambia.
 *
 * Solo envía lo que cambia: un `PUT servicios/{id}/frecuencias/{estacion}/` por estación y `PUT servicios/{id}/duracion/`.
 * Avisa de que la frecuencia nueva solo afecta a los ciclos que se programen y de si un ciclo en curso ya supera la
 * duración nueva. «Usar valores iniciales» espera a que el backend los exponga; «Ver historial», a AV-256. El
 * subtítulo de Figma con la vía y el proveedor no llega en `GET servicios/`.
 */
import { useRef, useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
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
import { borradorInicial, estadoServicio, ultimaModificacion, validarServicio } from './configuracionServicios'

export interface PanelEditarServicioProps {
  servicio: ServicioPeriodico
  onCerrar: () => void
  /** Cada guardado parcial o completo devuelve el servicio actualizado. */
  onActualizado: (servicio: ServicioPeriodico) => void
  onGuardado: (servicio: ServicioPeriodico) => void
}

const CAMPOS: { clave: keyof BorradorFrecuencia; titulo: string; nombre: string }[] = [
  { clave: 'teorica', titulo: 'Teórica *', nombre: 'teórica' },
  { clave: 'practica', titulo: 'Práctica', nombre: 'práctica' },
  { clave: 'maxima', titulo: 'Máxima', nombre: 'máxima' },
]
const ID_ERRORES_TABLA = 'frecuencias-errores'

export default function PanelEditarServicio({ servicio, onCerrar, onActualizado, onGuardado }: PanelEditarServicioProps) {
  const [inicial] = useState(() => borradorInicial(servicio))
  const [borrador, setBorrador] = useState(inicial)
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enCurso = useRef(false)
  const hoy = hoyLima()
  const { desde, hasta } = rangoCiclos(hoy)
  const ciclos = useConsulta(`ciclos:${desde}`, (signal) => listarProgramaciones(desde, hasta, signal))

  // Validación en línea: solo de lo que cambia (una estación sin configurar puede quedarse vacía).
  const validacion = validarServicio(borrador, inicial)
  const hayCambios = JSON.stringify(borrador) !== JSON.stringify(inicial)
  const nuevaDuracion = validacion.duracion?.duracion_maxima_dias
  const cicloExcedido = nuevaDuracion
    ? (ciclos.datos ?? []).find(
        (c) => c.tipo_servicio_id === servicio.id && c.estado === 'EnCurso' && diasDelPeriodo(c.fecha_inicio_real ?? c.fecha_inicio_prevista, hoy) > nuevaDuracion,
      )
    : undefined
  const modificado = ultimaModificacion(servicio)
  const sinConfigurar = estadoServicio(servicio).texto !== 'Configurado'
  const erroresTabla = ESTACIONES.flatMap((estacion) => Object.values(validacion.erroresFrecuencia[estacion] ?? {}))

  async function guardar() {
    if (enCurso.current || !validacion.valido) return
    if (validacion.frecuencias.length === 0 && !validacion.duracion) {
      onCerrar()
      return
    }
    enCurso.current = true
    setEnviando(true)
    setError(null)
    let actualizado = servicio
    try {
      for (const { estacion, entrada } of validacion.frecuencias) {
        actualizado = await actualizarFrecuencia(servicio.id, estacion, entrada)
        onActualizado(actualizado)
      }
      if (validacion.duracion) actualizado = await actualizarDuracion(servicio.id, validacion.duracion)
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
  const errorDuracion = (clave: keyof BorradorDuracion) => validacion.erroresDuracion[clave]

  const columnas: ColumnaTabla<Estacion>[] = [
    { clave: 'estacion', titulo: 'Estación', render: (estacion) => estacion },
    ...CAMPOS.map(
      ({ clave, titulo, nombre }): ColumnaTabla<Estacion> => ({
        clave,
        titulo,
        render: (estacion) => (
          <CampoFormulario
            id={`frecuencia-${estacion}-${clave}`}
            etiqueta={`Frecuencia ${nombre} en ${estacion} (días)`}
            etiquetaOculta
            obligatorio={clave === 'teorica'}
            formato="entero"
            compacto
            value={borrador.frecuencias[estacion][clave]}
            onChange={(e) => cambiarFrecuencia(estacion, clave, e.target.value)}
            error={validacion.erroresFrecuencia[estacion]?.[clave]}
            idErrorExterno={ID_ERRORES_TABLA}
            disabled={enviando}
          />
        ),
      }),
    ),
  ]

  return (
    <DialogoFormulario
      abierto
      ancho="lateral"
      titulo={servicio.nombre}
      descripcion={servicio.es_ruidoso ? 'Servicio ruidoso' : undefined}
      textoConfirmar="Guardar cambios"
      enviando={enviando}
      hayCambios={hayCambios}
      envioDeshabilitado={!hayCambios || !validacion.valido}
      error={error}
      conObligatorios={false}
      onEnviar={() => void guardar()}
      onCerrar={onCerrar}
    >
      {sinConfigurar && (
        <>
          <AvisoEnLinea tono="info" titulo="Sin configurar">
            Puedes partir de los valores iniciales de la sección.
          </AvisoEnLinea>
          <div>
            <Boton variante="fantasma" compacto deshabilitado ayudaDeshabilitado="Aún no disponible.">
              Usar valores iniciales
            </Boton>
          </div>
        </>
      )}

      <div className={estilos.bloque}>
        <p className={estilos.apartado}>Frecuencia por estación (días)</p>
        <TablaDatos titulo="Frecuencia por estación (días)" columnas={columnas} filas={[...ESTACIONES]} claveFila={(e) => e} compacta />
        {erroresTabla.length > 0 && (
          <ul id={ID_ERRORES_TABLA} className={estilos.erroresTabla}>
            {erroresTabla.map((mensaje) => (
              <li key={mensaje}>{mensaje}</li>
            ))}
          </ul>
        )}
      </div>
      {validacion.frecuencias.length > 0 && (
        <AvisoEnLinea tono="info">La nueva frecuencia solo afecta a los ciclos que se programen a partir de ahora.</AvisoEnLinea>
      )}

      <div className={estilos.bloque}>
        <p className={estilos.apartado}>Duración del ciclo</p>
        <div className={estilos.pareja}>
          <CampoFormulario id="duracion-duracion" etiqueta="Días de servicio" obligatorio formato="entero" value={borrador.duracion.duracion} onChange={(e) => cambiarDuracion('duracion', e.target.value)} error={errorDuracion('duracion')} disabled={enviando} />
          <CampoFormulario id="duracion-limpieza" etiqueta="Días de limpieza" formato="entero" value={borrador.duracion.limpieza} onChange={(e) => cambiarDuracion('limpieza', e.target.value)} error={errorDuracion('limpieza')} disabled={enviando} />
          <CampoFormulario id="duracion-inicio" etiqueta="Hora de inicio" type="time" value={borrador.duracion.inicio} onChange={(e) => cambiarDuracion('inicio', e.target.value)} error={errorDuracion('inicio')} disabled={enviando} />
          <CampoFormulario id="duracion-fin" etiqueta="Hora de fin" type="time" value={borrador.duracion.fin} onChange={(e) => cambiarDuracion('fin', e.target.value)} error={errorDuracion('fin')} disabled={enviando} />
        </div>
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
