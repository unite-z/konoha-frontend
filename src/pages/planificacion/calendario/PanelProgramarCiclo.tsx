/**
 * Panel «Programar ciclo» (AV-267, Figma 345-489 y 345-904). Entra con la propuesta del sistema para el servicio
 * (`GET servicios/{id}/propuesta/`) y recalcula los conflictos al cambiar las fechas con `GET restricciones`:
 * - aviso: pide justificación (máximo 300) y el botón pasa a «Programar con constancia»;
 * - prohibición: no deja guardar y ofrece la ventana libre que calcula el backend («Usar»);
 * - periodo inválido o duración excedida (máximo de servicio más limpieza): no deja guardar y lo dice bajo «Fin»;
 * - tercerizado: pide la ventana mensual («Ventana», contrato de AV-253) y las fechas tienen que caer en ese mes.
 *
 * El paso «Ruta» del corte llega con AV-270.
 */
import { useEffect, useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import Icono from '@/components/ui/Icono'
import CampoFormulario, { AreaTexto } from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import Estado from '@/components/ui/Estado'
import Pestanas from '@/components/ui/Pestanas'
import Selector from '@/components/ui/Selector'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import { obtenerRutaCorte } from '@/services/api/corte'
import { useConsulta } from '@/hooks/useConsulta'
import { cambiarEstadoCiclo, crearProgramacion, listarRestricciones, obtenerPropuesta } from '@/services/api/planificacion'
import { listarProveedores, listarTodo } from '@/services/api/tercerizados'
import type { Programacion, ServicioPeriodico } from '@/types/planificacion'
import { diaFigma, fechaCorta, fechaNumerica, periodoRestriccion, sumarDias } from '../resumen/resumenPlanificacion'
import {
  MAXIMO_JUSTIFICACION,
  conflictosDelPeriodo,
  diasDelPeriodo,
  franjaDeDias,
  mesesVentana,
  textoDuracion,
  textoVentana,
  validarProgramacion,
  ventanaLibre,
} from './programarCiclo'
import { esCorte } from '../ciclos/corte'
import PasoRutaCorte from './PasoRutaCorte'
import estilos from './Calendario.module.css'

const PERSONAL_PROPIO = 'propio'

export interface PanelProgramarCicloProps {
  servicios: ServicioPeriodico[]
  servicioInicial: number | null
  /** Día de inicio elegido en el calendario («Programar este día»): sustituye al inicio propuesto. */
  fechaInicial?: string | null
  /**
   * Ciclo programado que se reprograma («Reprogramar» del Calendario): el panel entra con su servicio, proveedor y
   * fechas y, al guardar, crea el ciclo nuevo y cancela este. Cuando llegue AV-362 será un solo `PATCH`.
   */
  reprogramar?: Programacion | null
  onCerrar: () => void
  onProgramada: (programacion: Programacion) => void
}

export default function PanelProgramarCiclo({ servicios, servicioInicial, fechaInicial = null, reprogramar = null, onCerrar, onProgramada }: PanelProgramarCicloProps) {
  const inicialServicio = reprogramar ? reprogramar.tipo_servicio_id : servicioInicial
  const [servicioId, setServicioId] = useState(inicialServicio ? String(inicialServicio) : '')
  const [proveedor, setProveedor] = useState(reprogramar ? (reprogramar.proveedor_id === null ? PERSONAL_PROPIO : String(reprogramar.proveedor_id)) : '')
  const [inicio, setInicio] = useState(reprogramar?.fecha_inicio_prevista ?? '')
  const [fin, setFin] = useState(reprogramar?.fecha_fin_prevista ?? '')
  const [ventanaMes, setVentanaMes] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<{ titulo: string; detalle: string } | null>(null)

  const servicio = servicios.find((s) => String(s.id) === servicioId)
  // Corte de césped (Figma 372-5523): un segundo paso «Ruta» con las zonas de MOD-02 (AV-259).
  const corte = servicio ? esCorte(servicio.nombre) : false
  const [paso, setPaso] = useState('fechas')
  const ruta = useConsulta(corte && servicio ? `programar-ruta:${servicio.id}` : null, (signal) => obtenerRutaCorte(Number(servicioId), signal))
  const [zonasElegidas, setZonasElegidas] = useState<string[] | null>(null)
  const zonasRuta = zonasElegidas ?? (ruta.datos?.zonas ?? []).filter((z) => z.en_ruta).map((z) => z.zona)
  function cambiarZona(zona: string, incluida: boolean) {
    setZonasElegidas(incluida ? [...zonasRuta, zona] : zonasRuta.filter((z) => z !== zona))
  }
  const proveedores = useConsulta('programar-proveedores', (signal) => listarTodo((page) => listarProveedores({ activo: true, page }, signal)))
  const propuesta = useConsulta(servicioId ? `programar-propuesta:${servicioId}` : null, (signal) => obtenerPropuesta(Number(servicioId), signal))
  const fechasValidas = /^\d{4}-\d{2}-\d{2}$/.test(inicio) && /^\d{4}-\d{2}-\d{2}$/.test(fin)
  const desde = fechasValidas ? sumarDias(inicio, -2) : ''
  const hasta = fechasValidas ? [fin, sumarDias(inicio, 7)].sort().at(-1) ?? fin : ''
  const restricciones = useConsulta(fechasValidas ? `programar-restricciones:${desde}:${hasta}` : null, (signal) => listarRestricciones(desde, hasta, signal))

  // Al elegir servicio, el panel entra con las fechas que propone el sistema; con un día elegido en el calendario,
  // empieza ese día y conserva la duración propuesta.
  useEffect(() => {
    if (!propuesta.datos || reprogramar) return
    if (fechaInicial) {
      setInicio(fechaInicial)
      setFin(sumarDias(fechaInicial, diasDelPeriodo(propuesta.datos.fecha_inicio, propuesta.datos.fecha_fin) - 1))
      return
    }
    setInicio(propuesta.datos.fecha_inicio)
    setFin(propuesta.datos.fecha_fin)
  }, [propuesta.datos, fechaInicial, reprogramar])

  const delPeriodo = restricciones.datos ?? []
  const conflictos = fechasValidas ? conflictosDelPeriodo(delPeriodo, inicio, fin, servicio?.es_ruidoso ?? true) : []
  const tercerizado = Boolean(proveedor) && proveedor !== PERSONAL_PROPIO
  // La ventana por defecto es el mes del inicio; se elige entre ese mes y los dos siguientes.
  const mesVentana = tercerizado ? ventanaMes || (fechasValidas ? inicio.slice(0, 7) : '') : ''
  const validacion = validarProgramacion(servicio, inicio, fin, conflictos, justificacion, mesVentana || null)
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
        ventana_mes: mesVentana || undefined,
        zonas: corte ? zonasRuta : undefined,
      })
      if (reprogramar) {
        try {
          await cambiarEstadoCiclo(reprogramar.id, 'cancelacion')
        } catch (causa) {
          setErrorEnvio({
            titulo: 'El ciclo nuevo quedó programado, pero no se pudo cancelar el anterior',
            detalle: causa instanceof Error ? causa.message : 'Cancélalo desde su detalle.',
          })
          setEnviando(false)
          return
        }
      }
      onProgramada(creada)
    } catch (causa) {
      setErrorEnvio({ titulo: reprogramar ? 'No se pudo reprogramar el ciclo' : 'No se pudo programar el ciclo', detalle: causa instanceof Error ? causa.message : 'Inténtalo de nuevo.' })
      setEnviando(false)
    }
  }

  const pasoFechas = (
    <>
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
        <div className={tercerizado ? estilos.proveedorVentana : undefined}>
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
          {tercerizado && (
            <Selector
              id="programar-ventana"
              etiqueta="Ventana"
              obligatorio
              valor={mesVentana}
              opcionTodos="Elige el mes"
              opciones={mesesVentana(fechasValidas ? inicio : (propuesta.datos?.fecha_inicio ?? new Date().toISOString().slice(0, 10)))}
              onCambiar={setVentanaMes}
              error={validacion.errorVentana ?? undefined}
            />
          )}
        </div>
  
        {propuesta.estado === 'error' && (
          <AvisoEnLinea tono="error" titulo="No hay propuesta para este servicio">
            {propuesta.error?.detalle}
          </AvisoEnLinea>
        )}
  
        {servicio && (
          <>
            <div className={estilos.fechasPanel}>
              <CampoFormulario id="programar-inicio" etiqueta="Inicio" obligatorio type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              <CampoFormulario
                id="programar-fin"
                etiqueta="Fin"
                obligatorio
                type="date"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                error={fechasValidas ? (validacion.errorPeriodo ?? undefined) : undefined}
              />
            </div>
            {esPropuesta && <p className={estilos.detalle}>Fechas propuestas por el sistema</p>}
  
            {fechasValidas && fin >= inicio && (
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
                {validacion.diasExcedidos ? (
                  <p className={estilos.diasExcedidos}>{validacion.diasExcedidos}</p>
                ) : (
                  textoDuracion(servicio) && <p className={estilos.detalle}>{textoDuracion(servicio)}</p>
                )}
              </div>
            )}
  
            {conflictos.length > 0 && (
              <div className={estilos.bloqueAgenda}>
                <p className={estilos.rotuloConflictos}>
                  Conflictos con restricciones <Estado tono={validacion.prohibiciones.length > 0 ? 'error' : 'aviso'} texto={String(conflictos.length)} punto={false} />
                </p>
                {[...validacion.avisos, ...validacion.prohibiciones]
                  .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.id - b.id)
                  .map((r) =>
                    r.efecto === 'Prohibicion' ? (
                      <AvisoEnLinea key={r.id} tono="error" titulo={`No se puede programar el ${textoVentana({ inicio: r.fecha_inicio, fin: r.fecha_fin })}`}>
                        {r.tipo} · prohibición
                      </AvisoEnLinea>
                    ) : (
                      <AvisoEnLinea
                        key={r.id}
                        tono="advertencia"
                        titulo={`${r.fecha_inicio === r.fecha_fin ? `${diaFigma(r.fecha_inicio).slice(0, 3)} ${fechaNumerica(r.fecha_inicio)}` : textoVentana({ inicio: r.fecha_inicio, fin: r.fecha_fin })} · ${r.tipo}`}
                      >
                        {r.descripcion || 'Todo el campus'}
                      </AvisoEnLinea>
                    ),
                  )}
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
  
            {validacion.requiereJustificacion && (
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
    </>
  )

  return (
    <DialogoFormulario
      abierto
      ancho="lateral"
      titulo={reprogramar ? 'Reprogramar ciclo' : 'Programar ciclo'}
      junto={corte && ruta.datos?.fuera_de_frecuencia ? <Estado tono="error" texto="Fuera de frecuencia" /> : undefined}
      descripcion={reprogramar ? `${reprogramar.servicio} · previsto del ${periodoRestriccion(reprogramar.fecha_inicio_prevista, reprogramar.fecha_fin_prevista)}` : undefined}
      textoConfirmar={validacion.requiereJustificacion ? 'Programar con constancia' : reprogramar ? 'Reprogramar' : 'Programar ciclo'}
      enviando={enviando}
      hayCambios={Boolean(servicioId || justificacion)}
      error={errorEnvio}
      conObligatorios={false}
      envioDeshabilitado={Boolean(servicio) && fechasValidas && Boolean(validacion.errorPeriodo || validacion.errorVentana || validacion.prohibiciones.length > 0)}
      onEnviar={() => void programar()}
      onCerrar={onCerrar}
    >
      {corte ? (
        <Pestanas
          etiqueta="Pasos para programar el corte"
          valor={paso}
          onCambiar={setPaso}
          pestanas={[
            { valor: 'fechas', texto: '1 · Fechas' },
            { valor: 'ruta', texto: '2 · Ruta' },
          ]}
          ancho="completo"
        >
          {paso === 'fechas' ? (
            <div className={estilos.pasoPanel}>{pasoFechas}</div>
          ) : (
            <div className={estilos.pasoPanel}>
              <AvisoDatosSimulados />
              <PasoRutaCorte ruta={ruta.datos ?? undefined} error={ruta.estado === 'error' ? (ruta.error?.detalle ?? 'Inténtalo de nuevo.') : null} zonas={zonasRuta} onCambiar={cambiarZona} />
            </div>
          )}
        </Pestanas>
      ) : (
        pasoFechas
      )}
    </DialogoFormulario>
  )
}
