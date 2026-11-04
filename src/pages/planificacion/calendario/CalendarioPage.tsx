// RF-PLA-003 y RF-PLA-007 · Calendario con capas, vista Mes (AV-266, Figma «Calendario con capas» 344-436)
import { useState } from 'react'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import Boton from '@/components/ui/Boton'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EventoCalendario from '@/components/ui/EventoCalendario'
import { puedeEditarPlanificacion } from '@/config/permisosPlanificacion'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_PLANIFICACION } from '@/router/rutasApp'
import { listarProgramaciones, listarRestricciones } from '@/services/api/planificacion'
import { useRolTercerizados } from '@/sesion/ContextoSesion'
import type { FechaIso } from '@/types/comun'
import { desplazarMes, mesDeFecha, type Mes } from '@/utils/calendarioRestricciones'
import { hoyLima } from '@/utils/instanteLima'
import DialogoRestriccion from '../DialogoRestriccion'
import { nombreMes } from '../resumen/resumenPlanificacion'
import AgendaDia from './AgendaDia'
import { eventosDeCapas, semanasDelMes } from './calendarioCapas'
import VistaMes from './VistaMes'
import estilos from './Calendario.module.css'

function aTexto({ anio, mes }: Mes): string {
  return `${anio}-${String(mes).padStart(2, '0')}`
}

export default function CalendarioPage() {
  usePaginaActual('Calendario', [MIGAS_PLANIFICACION.planificacion, { texto: 'Calendario' }])
  const hoy = hoyLima()
  const puedeEditar = puedeEditarPlanificacion(useRolTercerizados())
  const [mes, setMes] = useState(() => mesDeFecha(hoy))
  const [seleccionado, setSeleccionado] = useState<FechaIso | null>(hoy)
  const [registrando, setRegistrando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const semanas = semanasDelMes(mes)
  const desde = semanas[0][0]
  const hasta = semanas[semanas.length - 1][6]
  const restricciones = useConsulta(`calendario-restricciones:${desde}`, (signal) => listarRestricciones(desde, hasta, signal))
  const programaciones = useConsulta(`calendario-programaciones:${desde}`, (signal) => listarProgramaciones(desde, hasta, signal))
  const conError = [restricciones, programaciones].find((consulta) => consulta.estado === 'error' && !consulta.datos)

  function irAMes(nuevo: Mes) {
    setMes(nuevo)
    const delMes = aTexto(nuevo) === hoy.slice(0, 7) ? hoy : `${aTexto(nuevo)}-01`
    setSeleccionado(delMes)
  }

  let contenido
  if (conError) {
    contenido = <EstadoError titulo="No pudimos cargar el calendario" descripcion={conError.error?.detalle ?? ''} onReintentar={conError.reintentar} />
  } else if (!restricciones.datos || !programaciones.datos) {
    contenido = restricciones.cargaVisible || programaciones.cargaVisible ? <EstadoCarga forma="tabla" texto="Cargando el calendario…" /> : null
  } else {
    const eventos = eventosDeCapas(restricciones.datos, programaciones.datos)
    contenido = (
      <div className={`${estilos.calendarioYAgenda} ${seleccionado ? '' : estilos.sinAgenda}`}>
        <VistaMes
          semanas={semanas}
          eventos={eventos}
          mes={aTexto(mes)}
          hoy={hoy}
          seleccionado={seleccionado}
          onSeleccionar={setSeleccionado}
        />
        {seleccionado && <AgendaDia dia={seleccionado} eventos={eventos} onCerrar={() => setSeleccionado(null)} />}
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
        </AccionesPagina>
      )}

      <div className={estilos.barra}>
        <Boton variante="secundario" compacto icono="chevron-left" onClick={() => irAMes(desplazarMes(mes, -1))}>
          <span className="sr-only">Mes anterior</span>
        </Boton>
        <Boton variante="secundario" compacto icono="chevron-right" onClick={() => irAMes(desplazarMes(mes, 1))}>
          <span className="sr-only">Mes siguiente</span>
        </Boton>
        <h2 className={estilos.tituloMes} aria-live="polite">
          {nombreMes(`${aTexto(mes)}-01`)}
        </h2>
        <Boton variante="fantasma" compacto onClick={() => irAMes(mesDeFecha(hoy))}>
          Hoy
        </Boton>
      </div>

      {contenido}

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
          fechaInicial={seleccionado ?? hoy}
          onCerrar={() => setRegistrando(false)}
          onCreadas={(creadas) => {
            setRegistrando(false)
            setAviso(creadas.length === 1 ? 'Restricción registrada.' : `${creadas.length} restricciones registradas.`)
            restricciones.reintentar()
          }}
        />
      )}
      <AvisoTemporal mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
