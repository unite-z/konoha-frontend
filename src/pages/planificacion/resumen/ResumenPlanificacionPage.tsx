// RF-PLA-008 y RF-PLA-009 · Resumen de planificación (AV-265, Figma «Propuesta · Resumen de planificación» 344-3)
import { BotonEnlace } from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Tarjeta from '@/components/ui/Tarjeta'
import TarjetaIndicador, { FilaTarjetas } from '@/components/ui/TarjetaIndicador'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_PLANIFICACION, RUTAS_PLANIFICACION } from '@/router/rutasApp'
import { listarAlertas, listarProgramaciones, listarRestricciones, listarServiciosPeriodicos } from '@/services/api/planificacion'
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
  periodoRestriccion,
  proximosCiclos,
  restriccionesProximas,
  sumarDias,
} from './resumenPlanificacion'
import estilos from './ResumenPlanificacion.module.css'

export default function ResumenPlanificacionPage() {
  usePaginaActual('Planificación', [MIGAS_PLANIFICACION.planificacion, { texto: 'Resumen' }])
  const hoy = hoyLima()
  const mes = limitesMes(hoy)
  const hastaCiclos = [mes.hasta, sumarDias(hoy, DIAS_PROXIMOS)].sort().at(-1) ?? mes.hasta
  const hastaRestricciones = [mes.hasta, sumarDias(hoy, DIAS_RESTRICCIONES)].sort().at(-1) ?? mes.hasta
  const alertas = useConsulta('planificacion-alertas', listarAlertas)
  const servicios = useConsulta('planificacion-servicios', listarServiciosPeriodicos)
  const programaciones = useConsulta(`planificacion-ciclos:${mes.desde}:${hastaCiclos}`, (signal) =>
    listarProgramaciones(mes.desde, hastaCiclos, signal),
  )
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
  const proximas = restriccionesProximas(hoy, restricciones.datos)

  return (
    <div className={estilos.pagina}>
      <AccionesPagina>
        <BotonEnlace to={RUTAS_PLANIFICACION.calendario} variante="secundario" icono="calendar">
          Ver calendario
        </BotonEnlace>
      </AccionesPagina>
      <p className={estilos.mes}>{nombreMes(hoy)}</p>

      <FilaTarjetas etiqueta="Indicadores del mes">
        {indicadores.map((indicador) => (
          <TarjetaIndicador
            key={indicador.etiqueta}
            etiqueta={indicador.etiqueta}
            valor={indicador.valor}
            contexto={
              <>
                {indicador.nota}
                <span className={estilos.detalle}>{indicador.detalle}</span>
              </>
            }
          />
        ))}
      </FilaTarjetas>

      <div className={estilos.columnas}>
        <div className={estilos.principal}>
          <NecesitaAtencion alertas={alertas.datos} servicios={servicios.datos} />

          <Tarjeta titulo={`Próximos ${DIAS_PROXIMOS} días`} relleno="amplio">
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
                        <span className={estilos.detalle}>{ciclo.proveedor ?? 'Personal propio'}</span>
                      </span>
                      <Estado tono={estado.tono} texto={estado.texto} punto />
                    </li>
                  )
                })}
              </ul>
            )}
          </Tarjeta>
        </div>

        <Tarjeta titulo="Restricciones próximas" relleno="amplio">
          {proximas.length === 0 ? (
            <EstadoVacio titulo="Sin restricciones próximas" descripcion={`Nada restringido en los próximos ${DIAS_RESTRICCIONES} días.`} nivel={3} />
          ) : (
            <ul className={estilos.lista}>
              {proximas.map((restriccion) => {
                const efecto = EFECTO_RESTRICCION[restriccion.efecto]
                return (
                  <li key={restriccion.id} className={estilos.fila}>
                    <span className={estilos.periodo}>{periodoRestriccion(restriccion.fecha_inicio, restriccion.fecha_fin)}</span>
                    <span className={estilos.textos}>
                      <span className={estilos.titulo}>{restriccion.descripcion || restriccion.tipo}</span>
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
  )
}
