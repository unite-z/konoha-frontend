// RF-PLA-003 y RF-PLA-007 · Calendario con capas, vistas Mes, Semana y Lista (AV-266, Figma 344-436, 361-2252 y 361-2782)
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import Boton from '@/components/ui/Boton'
import { ChipsFiltrosActivos } from '@/components/ui/ChipsFiltro'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import EventoCalendario from '@/components/ui/EventoCalendario'
import Pestanas from '@/components/ui/Pestanas'
import { puedeEditarPlanificacion } from '@/config/permisosPlanificacion'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_PLANIFICACION } from '@/router/rutasApp'
import { listarProgramaciones, listarRestricciones, listarServiciosPeriodicos } from '@/services/api/planificacion'
import { useRolTercerizados } from '@/sesion/ContextoSesion'
import type { FechaIso } from '@/types/comun'
import type { Restriccion } from '@/types/planificacion'
import { desplazarMes, mesDeFecha, rangoDelMes } from '@/utils/calendarioRestricciones'
import { hoyLima } from '@/utils/instanteLima'
import DialogoRestriccion from '../DialogoRestriccion'
import { nombreMes, sumarDias } from '../resumen/resumenPlanificacion'
import AgendaDia from './AgendaDia'
import {
  SIN_FILTROS,
  actividadesDelPeriodo,
  chipsFiltros,
  diasDeSemana,
  eventosDeCapas,
  filtrarEventos,
  opcionesProveedor,
  semanasDelMes,
  tituloSemana,
  type FiltrosCalendario,
} from './calendarioCapas'
import DetalleActividad from './DetalleActividad'
import DialogoBajaRestriccion from './DialogoBajaRestriccion'
import PanelProgramarCiclo from './PanelProgramarCiclo'
import PanelFiltros from './PanelFiltros'
import VistaLista from './VistaLista'
import VistaMes from './VistaMes'
import VistaSemana from './VistaSemana'
import estilos from './Calendario.module.css'

type Vista = 'mes' | 'semana' | 'lista'

const VISTAS = [
  { valor: 'mes', texto: 'Mes' },
  { valor: 'semana', texto: 'Semana' },
  { valor: 'lista', texto: 'Lista' },
]

export default function CalendarioPage() {
  usePaginaActual('Calendario', [MIGAS_PLANIFICACION.planificacion, { texto: 'Calendario' }])
  const hoy = hoyLima()
  const puedeEditar = puedeEditarPlanificacion(useRolTercerizados())
  const [vista, setVista] = useState<Vista>('mes')
  /** Día de referencia: el seleccionado en el mes y el que fija la semana. */
  const [fecha, setFecha] = useState<FechaIso>(hoy)
  const [agendaAbierta, setAgendaAbierta] = useState(true)
  const [actividad, setActividad] = useState<string | null>(null)
  const [filtros, setFiltros] = useState<FiltrosCalendario>(SIN_FILTROS)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [baja, setBaja] = useState<Restriccion | null>(null)
  // `?programar=<servicio>` (desde el Resumen) abre el panel con ese servicio; `?programar=` lo abre vacío.
  const [parametros, setParametros] = useSearchParams()
  const programar = parametros.get('programar')
  const servicioAProgramar = programar && /^\d+$/.test(programar) ? Number(programar) : null

  function cerrarPanel() {
    const siguientes = new URLSearchParams(parametros)
    siguientes.delete('programar')
    setParametros(siguientes, { replace: true })
  }
  const [aviso, setAviso] = useState<string | null>(null)

  const mes = mesDeFecha(fecha)
  const semanas = semanasDelMes(mes)
  const dias = diasDeSemana(fecha)
  const rangoMes = rangoDelMes(mes)
  const { desde, hasta } =
    vista === 'mes' ? { desde: semanas[0][0], hasta: semanas[semanas.length - 1][6] }
    : vista === 'semana' ? { desde: dias[0], hasta: dias[6] }
    : rangoMes
  const restricciones = useConsulta(`calendario-restricciones:${desde}:${hasta}`, (signal) => listarRestricciones(desde, hasta, signal))
  const programaciones = useConsulta(`calendario-programaciones:${desde}:${hasta}`, (signal) => listarProgramaciones(desde, hasta, signal))
  const servicios = useConsulta('calendario-servicios', listarServiciosPeriodicos)
  const tipos = (servicios.datos ?? []).map((servicio) => ({ valor: String(servicio.id), texto: servicio.nombre }))
  const todos = restricciones.datos && programaciones.datos ? eventosDeCapas(restricciones.datos, programaciones.datos) : []
  const proveedores = opcionesProveedor(todos)
  const chips = chipsFiltros(filtros, tipos, proveedores)
  const conError = [restricciones, programaciones].find((consulta) => consulta.estado === 'error' && !consulta.datos)

  /** Mes o semana anterior o siguiente; en el mes, el día pasa al primero del mes nuevo (o a hoy). */
  function desplazar(sentido: -1 | 1) {
    setActividad(null)
    if (vista === 'semana') {
      setFecha(sumarDias(fecha, 7 * sentido))
      return
    }
    const nuevo = desplazarMes(mes, sentido)
    const texto = `${nuevo.anio}-${String(nuevo.mes).padStart(2, '0')}`
    setFecha(texto === hoy.slice(0, 7) ? hoy : `${texto}-01`)
  }

  let contenido
  if (conError) {
    contenido = <EstadoError titulo="No pudimos cargar el calendario" descripcion={conError.error?.detalle ?? ''} onReintentar={conError.reintentar} />
  } else if (!restricciones.datos || !programaciones.datos) {
    contenido = restricciones.cargaVisible || programaciones.cargaVisible ? <EstadoCarga forma="tabla" texto="Cargando el calendario…" /> : null
  } else {
    const eventos = filtrarEventos(todos, filtros)
    const visibles = vista === 'semana' ? { desde: dias[0], hasta: dias[6] } : rangoMes
    const elegida = actividad ? eventos.find((evento) => evento.clave === actividad) : undefined
    const lateral =
      vista === 'mes'
        ? agendaAbierta && (
            <AgendaDia dia={fecha} eventos={eventos} onCerrar={() => setAgendaAbierta(false)} onDarDeBaja={puedeEditar ? setBaja : undefined} />
          )
        : elegida && <DetalleActividad actividad={elegida} eventos={eventos} onCerrar={() => setActividad(null)} />
    contenido = chips.length > 0 && actividadesDelPeriodo(visibles.desde, visibles.hasta, eventos).length === 0 ? (
      <div className={estilos.sinResultados}>
        <EstadoVacio
          icono="filter"
          titulo="No hay actividades con estos filtros"
          accion={
            <Boton variante="secundario" onClick={() => setFiltros(SIN_FILTROS)}>
              Limpiar filtros
            </Boton>
          }
        />
      </div>
    ) : (
      <div className={`${estilos.calendarioYAgenda} ${lateral ? '' : estilos.sinAgenda}`}>
        {vista === 'lista' ? (
          <VistaLista eventos={eventos} desde={rangoMes.desde} hasta={rangoMes.hasta} />
        ) : vista === 'mes' ? (
          <VistaMes
            semanas={semanas}
            eventos={eventos}
            mes={fecha.slice(0, 7)}
            hoy={hoy}
            seleccionado={agendaAbierta ? fecha : null}
            onSeleccionar={(dia) => {
              setFecha(dia)
              setAgendaAbierta(true)
            }}
          />
        ) : (
          <VistaSemana dias={dias} eventos={eventos} hoy={hoy} seleccionada={actividad} onSeleccionar={setActividad} />
        )}
        {lateral}
      </div>
    )
  }

  return (
    <div className={estilos.pagina}>
      {puedeEditar && (
        <AccionesPagina>
          <Boton variante="secundario" icono="plus" onClick={() => setRegistrando(true)}>
            Nueva restricción
          </Boton>
          <Boton icono="plus-circle" onClick={() => setParametros({ programar: '' })}>
            Programar ciclo
          </Boton>
        </AccionesPagina>
      )}

      <Pestanas etiqueta="Vista del calendario" pestanas={VISTAS} valor={vista} onCambiar={(valor) => setVista(valor as Vista)}>
        <div className={estilos.pagina}>
          <div className={estilos.barra}>
            <Boton variante="secundario" compacto icono="chevron-left" onClick={() => desplazar(-1)}>
              <span className="sr-only">{vista === 'semana' ? 'Semana anterior' : 'Mes anterior'}</span>
            </Boton>
            <Boton variante="secundario" compacto icono="chevron-right" onClick={() => desplazar(1)}>
              <span className="sr-only">{vista === 'semana' ? 'Semana siguiente' : 'Mes siguiente'}</span>
            </Boton>
            <h2 className={estilos.tituloMes} aria-live="polite">
              {vista === 'semana' ? tituloSemana(dias) : nombreMes(fecha)}
            </h2>
            <Boton
              variante="fantasma"
              compacto
              onClick={() => {
                setFecha(hoy)
                setActividad(null)
              }}
            >
              Hoy
            </Boton>
            <span className={estilos.espacio} />
            <Boton
              variante="secundario"
              compacto
              icono="filter"
              aria-expanded={filtrosAbiertos}
              aria-controls="panel-filtros-calendario"
              onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
            >
              {chips.length > 0 ? `Filtros · ${chips.length}` : 'Filtros'}
            </Boton>
          </div>

          {filtrosAbiertos && (
            <PanelFiltros id="panel-filtros-calendario" filtros={filtros} tipos={tipos} proveedores={proveedores} onCambiar={setFiltros} />
          )}
          <ChipsFiltrosActivos
            filtros={chips}
            onQuitar={(clave) => setFiltros({ ...filtros, [clave]: '' })}
            onLimpiar={() => setFiltros(SIN_FILTROS)}
          />

          {contenido}
        </div>
      </Pestanas>

      <div className={estilos.leyenda} aria-label="Leyenda del calendario" role="group">
        <span className={estilos.rotuloLeyenda}>Actividades</span>
        <EventoCalendario tipo="programada" texto="Programada" />
        <EventoCalendario tipo="enCurso" texto="En curso" />
        <EventoCalendario tipo="completada" texto="Completada" />
        <span className={estilos.separador} aria-hidden="true" />
        <span className={estilos.rotuloLeyenda}>Restricciones</span>
        <EventoCalendario tipo="prohibicion" texto="Prohibición" />
        <EventoCalendario tipo="aviso" texto="Aviso" />
        <EventoCalendario tipo="favorable" texto="Favorable" />
      </div>

      {registrando && (
        <DialogoRestriccion
          fechaInicial={fecha}
          onCerrar={() => setRegistrando(false)}
          onCreadas={(creadas) => {
            setRegistrando(false)
            setAviso(creadas.length === 1 ? 'Restricción registrada.' : `${creadas.length} restricciones registradas.`)
            restricciones.reintentar()
          }}
        />
      )}
      {puedeEditar && programar !== null && servicios.datos && (
        <PanelProgramarCiclo
          servicios={servicios.datos}
          servicioInicial={servicioAProgramar}
          onCerrar={cerrarPanel}
          onProgramada={(programada) => {
            cerrarPanel()
            setAviso(`${programada.servicio} programado del ${programada.fecha_inicio_prevista.slice(8, 10)} al ${programada.fecha_fin_prevista.slice(8, 10)}.`)
            programaciones.reintentar()
          }}
        />
      )}
      {baja && (
        <DialogoBajaRestriccion
          restriccion={baja}
          onCerrar={() => setBaja(null)}
          onBaja={(serie) => {
            setBaja(null)
            setAviso(serie ? 'Serie de restricciones dada de baja.' : 'Restricción dada de baja.')
            restricciones.reintentar()
          }}
        />
      )}
      <AvisoTemporal mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
