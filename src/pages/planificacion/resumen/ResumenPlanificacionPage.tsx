// RF-PLA-008 y RF-PLA-009 · Resumen de planificación (AV-265, Figma «Propuesta · Resumen de planificación» 344-3)
import { BotonEnlace } from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Tarjeta from '@/components/ui/Tarjeta'
import TarjetaIndicador, { FilaTarjetas } from '@/components/ui/TarjetaIndicador'
import { puedeEditarPlanificacion } from '@/config/permisosPlanificacion'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_PLANIFICACION, RUTAS_PLANIFICACION } from '@/router/rutasApp'
import { listarAlertas, listarProgramaciones, listarRestricciones, listarServiciosPeriodicos } from '@/services/api/planificacion'
import { useRolTercerizados } from '@/sesion/ContextoSesion'
import { hoyLima } from '@/utils/instanteLima'
import NecesitaAtencion from './NecesitaAtencion'
import {
  DIAS_PROXIMOS,
  DIAS_RESTRICCIONES,
  EFECTO_RESTRICCION,
  ESTADO_PROGRAMACION,
  cajaFecha,
  indicadoresMes,
  limitesMes,
  nombreMes,
  proximosCiclos,
  restriccionesAgrupadas,
  sumarDias,
} from './resumenPlanificacion'
import { rangoCiclos } from '../ciclos/ciclos'
import { textoHorario } from '@/utils/planificacion'
import type { ServicioPeriodico } from '@/types/planificacion'
import estilos from './ResumenPlanificacion.module.css'

/** «Fumigaciones Demo S.A. · 06:00 a 18:00»: quién lo hace y, si el servicio la tiene, su franja horaria. */
function detalleCiclo(proveedor: string | null, servicio: ServicioPeriodico | undefined): string {
  const quien = proveedor ?? 'Personal propio'
  const franja = servicio?.duracion?.hora_inicio || servicio?.duracion?.hora_fin ? textoHorario(servicio.duracion.hora_inicio, servicio.duracion.hora_fin) : null
  return franja ? `${quien} · ${franja}` : quien
}

export default function ResumenPlanificacionPage() {
  const hoy = hoyLima()
  // Ingeniería y practicantes ven el Resumen en solo lectura, como en Figma 374-7476.
  const puedeEditar = puedeEditarPlanificacion(useRolTercerizados())
  usePaginaActual('Planificación', [MIGAS_PLANIFICACION.planificacion, { texto: 'Resumen' }], nombreMes(hoy))
  const mes = limitesMes(hoy)
  // Seis meses atrás y adelante (la misma consulta que Ciclos): da el mes, los próximos 14 días y el último ciclo.
  const rango = rangoCiclos(hoy)
  const hastaRestricciones = [mes.hasta, sumarDias(hoy, DIAS_RESTRICCIONES)].sort().at(-1) ?? mes.hasta
  const alertas = useConsulta('planificacion-alertas', listarAlertas)
  const servicios = useConsulta('planificacion-servicios', listarServiciosPeriodicos)
  const programaciones = useConsulta(`ciclos:${rango.desde}`, (signal) => listarProgramaciones(rango.desde, rango.hasta, signal))
  const restricciones = useConsulta(`planificacion-restricciones:${mes.desde}:${hastaRestricciones}`, (signal) =>
    listarRestricciones(mes.desde, hastaRestricciones, signal),
  )
  const consultas = [alertas, servicios, programaciones, restricciones]
  const conError = consultas.find((consulta) => consulta.estado === 'error' && !consulta.datos)

  if (conError) {
    return <EstadoError titulo="No pudimos cargar el resumen de planificación" descripcion={conError.error?.detalle ?? ''} onReintentar={conError.reintentar} />
  }
  if (!alertas.datos || !servicios.datos || !programaciones.datos || !restricciones.datos) {
    return consultas.some((consulta) => consulta.cargaVisible) ? <EstadoCarga forma="tarjetas" texto="Cargando el resumen…" /> : null
  }

  const indicadores = indicadoresMes(hoy, programaciones.datos, alertas.datos, restricciones.datos)
  const ciclos = proximosCiclos(hoy, programaciones.datos)
  const proximas = restriccionesAgrupadas(hoy, restricciones.datos)
  const servicioDe = (id: number) => servicios.datos?.find((s) => s.id === id)

  return (
    <div className={estilos.pagina}>
      {/* En móvil (Figma 352-2038) el Resumen solo lleva «Necesita atención» y los próximos ciclos. */}
      <AccionesPagina>
        <span className={estilos.accionesEscritorio}>
          <BotonEnlace to={RUTAS_PLANIFICACION.calendario} variante="secundario" icono="calendar">
            Ver calendario
          </BotonEnlace>
          {puedeEditar && (
            <BotonEnlace to={`${RUTAS_PLANIFICACION.calendario}?programar=`} variante="primario" icono="plus-circle">
              Programar ciclo
            </BotonEnlace>
          )}
        </span>
      </AccionesPagina>

      <div className={estilos.soloEscritorio}>
      <FilaTarjetas etiqueta="Indicadores del mes">
        {indicadores.map((indicador) => (
          <TarjetaIndicador
            key={indicador.etiqueta}
            etiqueta={indicador.etiqueta}
            valor={indicador.valor}
            contexto={indicador.nota}
            nota={indicador.detalle}
          />
        ))}
      </FilaTarjetas>
      </div>

      <div className={estilos.columnas}>
        <div className={estilos.principal}>
          <NecesitaAtencion alertas={alertas.datos} servicios={servicios.datos} programaciones={programaciones.datos} soloLectura={!puedeEditar} />

          <Tarjeta
            titulo={
              <>
                <span className={estilos.soloEscritorio}>Próximos {DIAS_PROXIMOS} días</span>
                <span className={estilos.soloMovil}>Próximos ciclos</span>
              </>
            }
            relleno="amplio"
          >
            {ciclos.length === 0 ? (
              <EstadoVacio titulo="Sin ciclos en los próximos días" descripcion="Los ciclos programados aparecerán aquí." nivel={3} />
            ) : (
              <ul className={estilos.lista}>
                {ciclos.map((ciclo) => {
                  const fecha = cajaFecha(ciclo.fecha_inicio_prevista)
                  const estado = ESTADO_PROGRAMACION[ciclo.estado]
                  return (
                    <li key={ciclo.id} className={estilos.fila}>
                      <span className={estilos.cajaFecha} aria-hidden="true">
                        <span className={estilos.cajaMes}>{fecha.mes}</span>
                        <span className={estilos.cajaDia}>{fecha.dia}</span>
                      </span>
                      <span className={estilos.textos}>
                        <span className={estilos.titulo}>{ciclo.servicio}</span>
                        <span className={estilos.detalle}>{detalleCiclo(ciclo.proveedor, servicioDe(ciclo.tipo_servicio_id))}</span>
                      </span>
                      <span className={estilos.soloEscritorio}>
                        <Estado tono={estado.tono} texto={estado.texto} punto />
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Tarjeta>
        </div>

        <div className={estilos.soloEscritorio}>
        <Tarjeta titulo="Restricciones próximas" relleno="amplio">
          {proximas.length === 0 ? (
            <EstadoVacio titulo="Sin restricciones próximas" descripcion={`Nada restringido en los próximos ${DIAS_RESTRICCIONES} días.`} nivel={3} />
          ) : (
            <ul className={estilos.lista}>
              {proximas.map((restriccion) => {
                const efecto = EFECTO_RESTRICCION[restriccion.efecto]
                return (
                  <li key={restriccion.clave} className={estilos.fila}>
                    <span className={estilos.periodo}>{restriccion.fechas}</span>
                    <span className={estilos.textos}>
                      <span className={estilos.titulo}>{restriccion.tipo}</span>
                    </span>
                    <Estado tono={efecto.tono} texto={efecto.texto} punto />
                  </li>
                )
              })}
            </ul>
          )}
        </Tarjeta>
        </div>
      </div>
    </div>
  )
}
