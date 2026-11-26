// RF-PLA-007 · Semana de la cuadrilla del capataz, solo lectura (RD-69, V13)
/**
 * La semana de su cuadrilla con la tira de días y la agenda (`VistaMovil` del calendario de Planificación), sin acciones:
 * «Cuadrilla B · solo lectura». Fondo liso.
 */
import { useState } from 'react'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import { PERMISOS } from '@/config/permisosCore'
import { tiene } from '@/config/permisosSesion'
import { useConsulta } from '@/hooks/useConsulta'
import { diasDeSemana, eventosDeCapas } from '@/pages/planificacion/calendario/calendarioCapas'
import VistaMovil from '@/pages/planificacion/calendario/VistaMovil'
import { obtenerCalendarioCuadrilla } from '@/services/api/corte'
import { usePermisos } from '@/sesion/ContextoSesion'
import { hoyLima } from '@/utils/instanteLima'
import { estiloTransicion, nombresTransicion, useFocoConLaVista } from '../base/movimiento'
import estilos from './Campo.module.css'

export default function Semana() {
  const permisos = usePermisos()
  const puede = tiene(permisos, PERMISOS.registrarCorte)
  const encabezado = useFocoConLaVista<HTMLHeadingElement>()
  const hoy = hoyLima()
  const [fecha, setFecha] = useState(hoy)
  const dias = diasDeSemana(fecha)
  const consulta = useConsulta(puede ? `calendario-cuadrilla:${dias[0]}` : null, (signal) =>
    obtenerCalendarioCuadrilla(dias[0], dias[6], signal),
  )

  if (!puede || (consulta.estado === 'error' && consulta.error?.estado === 403 && !consulta.datos)) {
    return (
      <div className={estilos.pagina}>
        <EstadoSinAcceso
          titulo="No tienes acceso a la semana de tu cuadrilla"
          descripcion="Pide el permiso al jefe de sección."
        />
      </div>
    )
  }

  let contenido
  if (consulta.estado === 'error' && !consulta.datos) {
    contenido = (
      <EstadoError
        titulo="No pudimos cargar la semana"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (!consulta.datos) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="tarjetas" texto="Cargando la semana…" /> : null
  } else {
    contenido = (
      <>
        <p className={estilos.ciclo}>
          {consulta.datos.cuadrilla
            ? `${consulta.datos.cuadrilla} · solo lectura`
            : 'Sin cuadrilla asignada · solo lectura'}
        </p>
        <VistaMovil
          fecha={fecha}
          hoy={hoy}
          eventos={eventosDeCapas(consulta.datos.restricciones, consulta.datos.programaciones)}
          onCambiarFecha={setFecha}
        />
      </>
    )
  }

  return (
    <div className={estilos.pagina}>
      <header
        className={estilos.encabezado}
        style={estiloTransicion(nombresTransicion.encabezado)} /* estilo-calculado */
      >
        <h1 ref={encabezado} tabIndex={-1} className={estilos.titulo}>
          Semana
        </h1>
      </header>
      <AvisoDatosSimulados />
      {contenido}
    </div>
  )
}
