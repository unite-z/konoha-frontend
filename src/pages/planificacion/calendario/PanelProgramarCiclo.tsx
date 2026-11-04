/**
 * Panel «Programar ciclo» (AV-267, Figma 345-489 y 345-904). Entra con la propuesta del sistema para el servicio
 * (`GET servicios/{id}/propuesta/`) y recalcula los conflictos al cambiar las fechas con `GET restricciones`:
 * - aviso: pide justificación (máximo 300) y el botón pasa a «Programar con constancia»;
 * - prohibición: no deja guardar y ofrece la ventana libre que calcula el backend («Usar»);
 * - periodo inválido o duración excedida (máximo de servicio más limpieza): no deja guardar.
 *
 * La ventana mensual de los tercerizados llega con AV-253; el paso «Ruta» del corte, con AV-270.
 */
import { useEffect, useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import Icono from '@/components/ui/Icono'
import CampoFormulario, { AreaTexto } from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import Estado from '@/components/ui/Estado'
import Selector from '@/components/ui/Selector'
import { useConsulta } from '@/hooks/useConsulta'
import { crearProgramacion, listarRestricciones, obtenerPropuesta } from '@/services/api/planificacion'
import { listarProveedores, listarTodo } from '@/services/api/tercerizados'
import type { Programacion, ServicioPeriodico } from '@/types/planificacion'
import { fechaCorta, periodoRestriccion, sumarDias } from '../resumen/resumenPlanificacion'
import {
  MAXIMO_JUSTIFICACION,
  conflictosDelPeriodo,
  diasDelPeriodo,
  franjaDeDias,
  textoDuracion,
  textoVentana,
  validarProgramacion,
  ventanaLibre,
} from './programarCiclo'
import estilos from './Calendario.module.css'

const PERSONAL_PROPIO = 'propio'

export interface PanelProgramarCicloProps {
  servicios: ServicioPeriodico[]
  servicioInicial: number | null
  /** Día de inicio elegido en el calendario («Programar este día»): sustituye al inicio propuesto. */
  fechaInicial?: string | null
  onCerrar: () => void
  onProgramada: (programacion: Programacion) => void
}

export default function PanelProgramarCiclo({ servicios, servicioInicial, fechaInicial = null, onCerrar, onProgramada }: PanelProgramarCicloProps) {
  const [servicioId, setServicioId] = useState(servicioInicial ? String(servicioInicial) : '')
  const [proveedor, setProveedor] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<{ titulo: string; detalle: string } | null>(null)

  const servicio = servicios.find((s) => String(s.id) === servicioId)
  const proveedores = useConsulta('programar-proveedores', (signal) => listarTodo((page) => listarProveedores({ activo: true, page }, signal)))
  const propuesta = useConsulta(servicioId ? `programar-propuesta:${servicioId}` : null, (signal) => obtenerPropuesta(Number(servicioId), signal))
  const fechasValidas = /^\d{4}-\d{2}-\d{2}$/.test(inicio) && /^\d{4}-\d{2}-\d{2}$/.test(fin)
  const desde = fechasValidas ? sumarDias(inicio, -2) : ''
  const hasta = fechasValidas ? [fin, sumarDias(inicio, 7)].sort().at(-1) ?? fin : ''
  const restricciones = useConsulta(fechasValidas ? `programar-restricciones:${desde}:${hasta}` : null, (signal) => listarRestricciones(desde, hasta, signal))

  // Al elegir servicio, el panel entra con las fechas que propone el sistema; con un día elegido en el calendario,
  // empieza ese día y conserva la duración propuesta.
  useEffect(() => {
    if (!propuesta.datos) return
    if (fechaInicial) {
      setInicio(fechaInicial)
      setFin(sumarDias(fechaInicial, diasDelPeriodo(propuesta.datos.fecha_inicio, propuesta.datos.fecha_fin) - 1))
      return
    }
    setInicio(propuesta.datos.fecha_inicio)
    setFin(propuesta.datos.fecha_fin)
  }, [propuesta.datos, fechaInicial])

  const delPeriodo = restricciones.datos ?? []
  const conflictos = fechasValidas ? conflictosDelPeriodo(delPeriodo, inicio, fin, servicio?.es_ruidoso ?? true) : []
  const validacion = validarProgramacion(servicio, inicio, fin, conflictos, justificacion)
  const ventana = ventanaLibre(propuesta.datos?.ventana_libre_inicio ?? null, servicio)
  const esPropuesta = propuesta.datos?.fecha_inicio === inicio && propuesta.datos?.fecha_fin === fin
  const errorServicio = mostrarErrores && !servicioId ? 'Elige el servicio.' : undefined
  const errorProveedor = mostrarErrores && !proveedor ? 'Elige quién lo hace.' : undefined

  async function programar() {
    setMostrarErrores(true)
    if (!servicio || !proveedor || !validacion.puedeGuardar) return
    setEnviando(true)
    setErrorEnvio(null)
    try {
      const creada = await crearProgramacion({
        tipo_servicio_id: servicio.id,
        proveedor_id: proveedor === PERSONAL_PROPIO ? null : Number(proveedor),
        fecha_inicio_prevista: inicio,
        fecha_fin_prevista: fin,
        justificacion: justificacion.trim() || undefined,
      })
      onProgramada(creada)
    } catch (causa) {
      setErrorEnvio({ titulo: 'No se pudo programar el ciclo', detalle: causa instanceof Error ? causa.message : 'Inténtalo de nuevo.' })
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto
      ancho="lateral"
      titulo="Programar ciclo"
      textoConfirmar={validacion.requiereJustificacion ? 'Programar con constancia' : 'Programar ciclo'}
      enviando={enviando}
      hayCambios={Boolean(servicioId || justificacion)}
      error={errorEnvio}
      conObligatorios
      onEnviar={() => void programar()}
      onCerrar={onCerrar}
    >
      <Selector
        id="programar-servicio"
        etiqueta="Servicio"
        obligatorio
        valor={servicioId}
        opcionTodos="Elige un servicio"
        opciones={servicios.map((s) => ({ valor: String(s.id), texto: s.nombre }))}
        onCambiar={(valor) => {
          setServicioId(valor)
          setInicio('')
          setFin('')
        }}
        error={errorServicio}
      />
      <Selector
        id="programar-proveedor"
        etiqueta="Proveedor"
        obligatorio
        valor={proveedor}
        opcionTodos="Elige quién lo hace"
        opciones={[
          { valor: PERSONAL_PROPIO, texto: 'Personal propio' },
          ...(proveedores.datos?.resultados ?? []).map((p) => ({ valor: String(p.id), texto: p.razon_social })),
        ]}
        onCambiar={setProveedor}
        error={errorProveedor}
      />

      {propuesta.estado === 'error' && (
        <AvisoEnLinea tono="error" titulo="No hay propuesta para este servicio">
          {propuesta.error?.detalle}
        </AvisoEnLinea>
      )}

      {servicio && (
        <>
          <div className={estilos.fechasPanel}>
            <CampoFormulario id="programar-inicio" etiqueta="Inicio" obligatorio type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            <CampoFormulario id="programar-fin" etiqueta="Fin" obligatorio type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
          </div>
          {esPropuesta && <p className={estilos.detalle}>Fechas propuestas por el sistema</p>}

          {fechasValidas && (
            <div className={estilos.bloqueAgenda}>
              <ul className={estilos.franja} aria-label="Días alrededor del periodo">
                {franjaDeDias(inicio, fin, delPeriodo).map((dia) => (
                  <li
                    key={dia.fecha}
                    className={[estilos.diaFranja, dia.seleccionado ? estilos.diaElegido : '', dia.restriccion ? estilos[dia.restriccion] : ''].filter(Boolean).join(' ')}
                    aria-label={`${fechaCorta(dia.fecha)}${dia.seleccionado ? ', en el periodo' : ''}${dia.restriccion === 'prohibicion' ? ', prohibido' : dia.restriccion === 'aviso' ? ', con aviso' : ''}`}
                  >
                    <span className={estilos.letraFranja} aria-hidden="true">
                      {dia.letra}
                    </span>
                    <span aria-hidden="true">{dia.dia}</span>
                  </li>
                ))}
              </ul>
              {textoDuracion(servicio) && <p className={estilos.detalle}>{textoDuracion(servicio)}</p>}
            </div>
          )}

          {validacion.errorPeriodo && fechasValidas && <AvisoEnLinea tono="error">{validacion.errorPeriodo}</AvisoEnLinea>}

          {conflictos.length > 0 && (
            <div className={estilos.bloqueAgenda}>
              <p className={estilos.rotuloConflictos}>
                Conflictos con restricciones <Estado tono={validacion.prohibiciones.length > 0 ? 'error' : 'aviso'} texto={String(conflictos.length)} />
              </p>
              {validacion.prohibiciones.map((r) => (
                <AvisoEnLinea key={r.id} tono="error" titulo={`No se puede programar el ${periodoRestriccion(r.fecha_inicio, r.fecha_fin)}`}>
                  {r.tipo} · prohibición
                </AvisoEnLinea>
              ))}
              {validacion.avisos.map((r) => (
                <AvisoEnLinea key={r.id} tono="advertencia" titulo={`${periodoRestriccion(r.fecha_inicio, r.fecha_fin)} · ${r.tipo}`}>
                  {r.descripcion}
                </AvisoEnLinea>
              ))}
              {ventana && !(ventana.inicio === inicio && ventana.fin === fin) && (
                <div className={estilos.ventanaLibre}>
                  <Icono nombre="calendar" tamano="base" />
                  <span>Ventana libre: {textoVentana(ventana)}</span>
                  <Boton
                    variante="secundario"
                    compacto
                    onClick={() => {
                      setInicio(ventana.inicio)
                      setFin(ventana.fin)
                    }}
                  >
                    Usar
                  </Boton>
                </div>
              )}
            </div>
          )}

          {validacion.requiereJustificacion && validacion.prohibiciones.length === 0 && (
            <AreaTexto
              id="programar-justificacion"
              etiqueta="Justificación"
              obligatorio
              value={justificacion}
              maxLength={MAXIMO_JUSTIFICACION}
              onChange={(e) => setJustificacion(e.target.value)}
              ayuda={`${justificacion.length}/${MAXIMO_JUSTIFICACION}`}
              error={mostrarErrores ? (validacion.errorJustificacion ?? undefined) : undefined}
            />
          )}
        </>
      )}
    </DialogoFormulario>
  )
}
