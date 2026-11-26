import { useState } from 'react'
import Boton from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import type { ResultadoConsulta } from '@/hooks/useConsulta'
import { cajaFecha, EFECTO_RESTRICCION, ESTADO_PROGRAMACION, restriccionesAgrupadas } from '@/pages/planificacion/resumen/resumenPlanificacion'
import type { FechaIso } from '@/types/comun'
import type { Programacion, Restriccion } from '@/types/planificacion'
import { transicionar } from '../base/movimiento'
import { ciclosDeLaVentana, DIAS_AMPLIADOS, DIAS_SEMANA, restriccionesDeLaVentana } from './sectores'
import estilos from './Sectores.module.css'

export interface EstaSemanaProps {
  hoy: FechaIso
  programaciones: ResultadoConsulta<Programacion[]>
  restricciones: ResultadoConsulta<Restriccion[]>
}

/** «Esta semana» (7 días), ampliable a 14, con los ciclos que vienen y las restricciones próximas. */
export default function EstaSemana({ hoy, programaciones, restricciones }: EstaSemanaProps) {
  const [ampliada, setAmpliada] = useState(false)
  const dias = ampliada ? DIAS_AMPLIADOS : DIAS_SEMANA
  const fallida = [programaciones, restricciones].find((c) => c.estado === 'error' && !c.datos)

  let cuerpo
  if (fallida) {
    cuerpo =
      fallida.error?.estado === 403 ? (
        <EstadoSinAcceso nivel={3} titulo="No puedes ver el calendario" />
      ) : (
        <EstadoError nivel={3} titulo="No pudimos cargar lo que viene" descripcion={fallida.error?.detalle ?? ''} onReintentar={fallida.reintentar} />
      )
  } else if (!programaciones.datos || !restricciones.datos) {
    cuerpo = programaciones.cargaVisible || restricciones.cargaVisible ? <p role="status">Cargando lo que viene…</p> : null
  } else {
    const ciclos = ciclosDeLaVentana(hoy, dias, programaciones.datos)
    const proximas = restriccionesAgrupadas(hoy, restriccionesDeLaVentana(hoy, dias, restricciones.datos))
    cuerpo = (
      <>
        {ciclos.length === 0 ? (
          <EstadoVacio titulo="Sin ciclos en estos días" descripcion="Los ciclos programados aparecerán aquí." nivel={3} />
        ) : (
          <ul className={estilos.lista} aria-label="Ciclos">
            {ciclos.map((ciclo) => {
              const fecha = cajaFecha(ciclo.fecha_inicio_prevista)
              const estado = ESTADO_PROGRAMACION[ciclo.estado]
              return (
                <li key={ciclo.id} className={estilos.fila}>
                  <span className={`${estilos.marca} ${estilos.cajaFecha}`} aria-hidden="true">
                    <span className={estilos.cajaMes}>{fecha.mes}</span>
                    <span>{fecha.dia}</span>
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
        <h3 className={estilos.subtitulo}>Restricciones próximas</h3>
        {proximas.length === 0 ? (
          <p className={estilos.detalle}>Nada restringido en estos {dias} días.</p>
        ) : (
          <ul className={estilos.lista} aria-label="Restricciones">
            {proximas.map((restriccion) => {
              const efecto = EFECTO_RESTRICCION[restriccion.efecto]
              return (
                <li key={restriccion.clave} className={estilos.fila}>
                  <span className={`${estilos.marca} ${estilos.cajaFecha}`}>{restriccion.fechas}</span>
                  <span className={estilos.titulo}>{restriccion.tipo}</span>
                  <Estado tono={efecto.tono} texto={efecto.texto} punto />
                </li>
              )
            })}
          </ul>
        )}
      </>
    )
  }

  return (
    <section className={estilos.vidrio} aria-labelledby="titulo-semana">
      <div className={estilos.cabeceraPanel}>
        <h2 id="titulo-semana">{ampliada ? `Próximos ${DIAS_AMPLIADOS} días` : 'Esta semana'}</h2>
        <Boton variante="secundario" compacto aria-pressed={ampliada} onClick={() => transicionar(() => setAmpliada((valor) => !valor))}>
          {ampliada ? `Ver ${DIAS_SEMANA} días` : `Ampliar a ${DIAS_AMPLIADOS} días`}
        </Boton>
      </div>
      {cuerpo}
    </section>
  )
}
