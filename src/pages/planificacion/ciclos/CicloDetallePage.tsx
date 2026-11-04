// CU-004 y CU-007 · Detalle de ciclo sin ruta (AV-269, Figma «Detalle de ciclo sin ruta» 380-7171 y 370-3811)
/**
 * Título con el código y el estado al lado, proveedor, fechas y franja debajo, tres indicadores (fechas previstas
 * o inicio real, duración con el máximo y restricciones) y el historial. El jefe inicia, finaliza o cancela.
 *
 * No hay `GET programaciones/{id}/`: el ciclo se busca en `GET programaciones/` del mismo rango que la lista.
 * El código (AV-364) y el historial (AV-253) se simulan hasta que lleguen (D9). Faltan el requerimiento asociado
 * (AV-263) y «confirmado por» de los avisos (AV-253). La ruta del corte la añade AV-270.
 */
import { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import { useEsMovil } from '@/components/reportes-indicadores/useEsMovil'
import BarraAvance from '@/components/ui/BarraAvance'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
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
import JuntoTitulo from '@/layouts/LayoutOficina/JuntoTitulo'
import { MIGAS_PLANIFICACION, RUTAS_PLANIFICACION } from '@/router/rutasApp'
import { obtenerCicloCorte } from '@/services/api/corte'
import { listarProgramaciones, listarRestricciones, listarServiciosPeriodicos, type CambioEstadoCiclo } from '@/services/api/planificacion'
import { useRolTercerizados } from '@/sesion/ContextoSesion'
import type { FechaIso } from '@/types/comun'
import type { CicloCorte, InterrupcionCorte } from '@/types/corte'
import type { Programacion, ServicioPeriodico } from '@/types/planificacion'
import { ahoraLimaLocal, hoyLima } from '@/utils/instanteLima'
import { conflictosDelPeriodo } from '../calendario/programarCiclo'
import { ESTADO_PROGRAMACION, dias } from '../resumen/resumenPlanificacion'
import estilos from './Ciclos.module.css'
import DialogoCambioCiclo from './DialogoCambioCiclo'
import { rangoCiclos } from './ciclos'
import { avanceRuta, esCorte, indicadorAvanceProgramado, indicadoresCorte, jardines, rutaCompleta } from './corte'
import DialogoInterrupcion from './DialogoInterrupcion'
import PestanasCorte from './PestanasCorte'
import { accionesCiclo, historialCiclo, indicadoresCiclo, periodoCiclo, subtituloCiclo, type IndicadorCiclo } from './detalleCiclo'

function FichaCiclo({
  ciclo,
  hoy,
  servicio,
  corte: corteServidor,
  onAccion,
}: {
  ciclo: Programacion
  hoy: FechaIso
  servicio: ServicioPeriodico | undefined
  /** Ruta, interrupciones y limpiezas si el ciclo es de corte (AV-270). */
  corte: CicloCorte | null
  onAccion: ((cambio: CambioEstadoCiclo) => void) | null
}) {
  const [interrumpiendo, setInterrumpiendo] = useState(false)
  const [nuevas, setNuevas] = useState<InterrupcionCorte[]>([])
  const [avisoCorte, setAvisoCorte] = useState<string | null>(null)
  // En móvil (Figma 353-2242), las acciones van a todo el ancho bajo los indicadores y el corte en curso se resume en
  // el avance con su barra, la duración y las interrupciones; la ruta, sus pestañas y el historial son de escritorio.
  const esMovil = useEsMovil()
  // Las interrupciones registradas aquí se suman a las del servidor hasta la siguiente consulta.
  const corte = corteServidor && { ...corteServidor, interrupciones: [...corteServidor.interrupciones, ...nuevas] }
  const { desde, hasta } = periodoCiclo(ciclo, hoy)
  const restricciones = useConsulta(`ciclo-restricciones:${desde}:${hasta}`, (signal) => listarRestricciones(desde, hasta, signal))
  const conflictos = conflictosDelPeriodo(restricciones.datos ?? [], desde, hasta, servicio?.es_ruidoso ?? true)
  const base = indicadoresCiclo(ciclo, servicio, conflictos, hoy)
  const ahora = ahoraLimaLocal()
  // Corte (Figma 370-3811 y 346-1334): sin empezar, avance, fechas y restricciones; empezado, avance, duración
  // «Día N de 4» e interrupciones.
  const indicadores: (IndicadorCiclo & { notaAviso?: boolean; notaError?: boolean })[] = !corte
    ? base
    : ciclo.estado === 'Programada' || ciclo.estado === 'Cancelada'
      ? [{ ...indicadorAvanceProgramado(corte), exceso: 0 }, base[0], base[2]]
      : // En el corte, el exceso se dice en la nota de la duración («Supera el máximo en 1 día»), sin insignia.
        indicadoresCorte(ciclo, servicio, corte, hoy, ahora).map((indicador) => ({ ...indicador, exceso: 0 }))
  const historial = historialCiclo(ciclo)
  const estado = ESTADO_PROGRAMACION[ciclo.estado]
  // Con la ruta del corte completa, «Finalizar ciclo» pasa a «Cerrar ciclo» (Figma 371-4838).
  const acciones = (onAccion ? accionesCiclo(ciclo.estado) : []).map((accion) =>
    corte && rutaCompleta(corte) && accion.cambio === 'fin' ? { ...accion, texto: 'Cerrar ciclo' } : accion,
  )

  const botones = acciones.length > 0 && onAccion && (
    <>
      {/* Corte en curso (Figma 346-1334): «Registrar interrupción» y la acción principal con icono. */}
      {corte && ciclo.estado === 'EnCurso' && (
        <Boton variante="secundario" icono="arrow-right-left" onClick={() => setInterrumpiendo(true)}>
          Registrar interrupción
        </Boton>
      )}
      {acciones.map((accion) => (
        <Boton
          key={accion.cambio}
          variante={accion.variante}
          // En móvil, «Finalizar ciclo» va sin icono, como en Figma 353-2242.
          icono={corte && accion.cambio === 'fin' && !rutaCompleta(corte) && !esMovil ? 'circle-check' : undefined}
          onClick={() => onAccion(accion.cambio)}
        >
          {accion.texto}
        </Boton>
      ))}
    </>
  )
  const resumenMovil = esMovil && corte && (ciclo.estado === 'EnCurso' || ciclo.estado === 'Completada')
  const avance = corte ? avanceRuta(corte.jardines) : null

  return (
    <>
      <JuntoTitulo>
        {/* Como en Figma, «En curso» va relleno y sin punto. */}
        <Estado tono={estado.tono} texto={estado.texto} punto={ciclo.estado !== 'EnCurso'} />
      </JuntoTitulo>
      {botones && !esMovil && <AccionesPagina>{botones}</AccionesPagina>}
      {corte && interrumpiendo && (
        <DialogoInterrupcion
          ciclo={ciclo}
          corte={corte}
          ahora={ahora}
          onCerrar={() => setInterrumpiendo(false)}
          onRegistrada={(interrupcion) => {
            setNuevas((previas) => [...previas, interrupcion])
            setInterrumpiendo(false)
            setAvisoCorte(`Corte detenido en ${interrupcion.zona_afectada} y trasladado a ${interrupcion.zona_alternativa ?? 'otra zona'}.`)
          }}
        />
      )}
      <AvisoTemporal mensaje={avisoCorte} onCerrar={() => setAvisoCorte(null)} />
      <AvisoDatosSimulados />

      {resumenMovil && avance ? (
        <div className={estilos.resumenMovil}>
          <Tarjeta relleno="amplio">
            <div>
              <p className={estilos.cifraAvance}>
                <span className={estilos.porcentajeAvance}>{indicadores[0].valor}</span>
                <span>{indicadores[0].contexto}</span>
              </p>
              <BarraAvance valor={avance.cortados} maximo={avance.total} etiqueta="Avance de la ruta" textoValor={indicadores[0].contexto} />
              <p className={indicadores[0].notaAviso ? estilos.notaAviso : estilos.notaAvance}>{indicadores[0].nota}</p>
            </div>
          </Tarjeta>
          <div className={estilos.datosMovil}>
            {indicadores.slice(1).map((indicador) => (
              <Tarjeta key={indicador.etiqueta} relleno="amplio">
                <div>
                  <p className={estilos.etiquetaDato}>{indicador.etiqueta}</p>
                  <p className={estilos.valorDato}>{indicador.valor}</p>
                </div>
              </Tarjeta>
            ))}
          </div>
        </div>
      ) : (
        <FilaTarjetas etiqueta="Indicadores del ciclo">
          {indicadores.map((indicador) => (
            <TarjetaIndicador
              key={indicador.etiqueta}
              etiqueta={indicador.etiqueta}
              valor={indicador.valor}
              contexto={indicador.contexto}
              nota={indicador.notaAviso || indicador.notaError ? <span className={indicador.notaError ? estilos.notaError : estilos.notaAviso}>{indicador.nota}</span> : indicador.nota}
              estado={indicador.etiqueta === 'Restricciones' && !restricciones.datos ? 'cargando' : indicador.exceso > 0 ? 'alerta' : 'normal'}
              insignia={indicador.exceso > 0 ? { tono: 'error', texto: `Excede en ${dias(indicador.exceso)}` } : undefined}
            />
          ))}
        </FilaTarjetas>
      )}

      {botones && esMovil && <div className={estilos.accionesMovil}>{botones}</div>}

      {corte && !esMovil && <PestanasCorte ciclo={ciclo} corte={corte} servicio={servicio} hoy={hoy} ahora={ahora} />}

      {!corte && !esMovil && historial.length > 0 && (
        <Tarjeta titulo="Historial">
          <ul className={estilos.historial}>
            {historial.map((evento) => (
              <li key={evento.clave} className={estilos.evento}>
                <span>{evento.texto}</span>
                <span className={estilos.detalleEvento}>{evento.detalle}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </>
  )
}

export default function CicloDetallePage() {
  const { id: idRuta } = useParams()
  const id = Number(idRuta)
  const hoy = hoyLima()
  const puedeEditar = puedeEditarPlanificacion(useRolTercerizados())
  const { desde, hasta } = rangoCiclos(hoy)
  const consulta = useConsulta(`ciclos:${desde}`, (signal) => listarProgramaciones(desde, hasta, signal))
  const servicios = useConsulta('ciclo-servicios', (signal) => listarServiciosPeriodicos(signal))
  const [local, setLocal] = useState<Programacion | null>(null)
  const [cambio, setCambio] = useState<CambioEstadoCiclo | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const cerrarAviso = useCallback(() => setAviso(null), [])

  const ciclo = local?.id === id ? local : consulta.datos?.find((c) => c.id === id)
  const servicio = servicios.datos?.find((s) => s.id === ciclo?.tipo_servicio_id)
  const conRuta = ciclo && esCorte(ciclo.servicio) ? ciclo : null
  const corte = useConsulta(conRuta ? `ciclo-corte:${conRuta.id}:${conRuta.estado}` : null, (signal) =>
    conRuta ? obtenerCicloCorte(conRuta, signal) : Promise.reject(new Error('Sin ciclo de corte')),
  )
  // Como en Figma 380-7171: «Control fitosanitario · FIT-2026-T5», migas «Ciclos > FIT-2026-T5» y, debajo, proveedor,
  // fechas y franja.
  usePaginaActual(
    ciclo ? [ciclo.servicio, ciclo.codigo].filter(Boolean).join(' · ') : 'Ciclo',
    [MIGAS_PLANIFICACION.ciclos, { texto: ciclo ? (ciclo.codigo ?? ciclo.servicio) : 'Ciclo' }],
    ciclo ? [subtituloCiclo(ciclo, servicio), corte.datos && `ruta de ${jardines(corte.datos.jardines.length)}`].filter(Boolean).join(' · ') : undefined,
    // En móvil (Figma 353-2242): el código en la barra con la flecha a Ciclos, y el servicio como encabezado.
    {
      movil: ciclo
        ? {
            titulo: ciclo.codigo ?? ciclo.servicio,
            encabezado: ciclo.codigo ? ciclo.servicio : undefined,
            subtitulo: subtituloCiclo(ciclo, servicio),
            volver: MIGAS_PLANIFICACION.ciclos,
          }
        : { volver: MIGAS_PLANIFICACION.ciclos },
    },
  )

  let contenido
  if (consulta.estado === 'error' && !consulta.datos) {
    contenido = <EstadoError titulo="No pudimos cargar el ciclo" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  } else if (!consulta.datos) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  } else if (!ciclo) {
    contenido = (
      <EstadoVacio
        titulo="No existe este ciclo"
        descripcion="Revisa el enlace o búscalo en la lista de ciclos."
        accion={
          <BotonEnlace to={RUTAS_PLANIFICACION.ciclos} variante="secundario">
            Ir a Ciclos
          </BotonEnlace>
        }
      />
    )
  } else {
    contenido = <FichaCiclo ciclo={ciclo} hoy={hoy} servicio={servicio} corte={corte.datos ?? null} onAccion={puedeEditar ? setCambio : null} />
  }

  return (
    <div className={estilos.pagina}>
      {contenido}
      {ciclo && cambio && (
        <DialogoCambioCiclo
          ciclo={ciclo}
          cambio={cambio}
          hoy={hoy}
          onCerrar={() => setCambio(null)}
          onCambiado={(actualizado, mensaje) => {
            setLocal(actualizado)
            setCambio(null)
            setAviso(mensaje)
          }}
        />
      )}
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </div>
  )
}
