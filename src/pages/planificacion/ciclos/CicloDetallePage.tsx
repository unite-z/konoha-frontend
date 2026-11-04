// CU-004 y CU-007 · Detalle de ciclo sin ruta (AV-269, Figma «Detalle» 370-3811)
/**
 * Cabecera con el estado, indicadores (fechas previstas, inicio y fin reales, duración y restricciones) y las
 * restricciones que coinciden con el periodo. El jefe inicia, finaliza o cancela desde aquí.
 *
 * No hay `GET programaciones/{id}/`: el ciclo se busca en `GET programaciones/` del mismo rango que la lista.
 * Faltan en el contrato el código del ciclo, el historial, el requerimiento asociado y «confirmado por» de los
 * avisos (AV-253), y «Registrar motivo» de la duración excedida (AV-255). La ruta del corte la añade AV-270.
 */
import { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import Tarjeta from '@/components/ui/Tarjeta'
import TarjetaIndicador, { FilaTarjetas } from '@/components/ui/TarjetaIndicador'
import { puedeEditarPlanificacion } from '@/config/permisosPlanificacion'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_PLANIFICACION, RUTAS_PLANIFICACION } from '@/router/rutasApp'
import { listarProgramaciones, listarRestricciones, listarServiciosPeriodicos, type CambioEstadoCiclo } from '@/services/api/planificacion'
import { useRolTercerizados } from '@/sesion/ContextoSesion'
import type { FechaIso } from '@/types/comun'
import type { Programacion, Restriccion } from '@/types/planificacion'
import { hoyLima } from '@/utils/instanteLima'
import { conflictosDelPeriodo } from '../calendario/programarCiclo'
import { EFECTO_RESTRICCION, ESTADO_PROGRAMACION, fechaCorta, periodoRestriccion } from '../resumen/resumenPlanificacion'
import estilos from './Ciclos.module.css'
import DialogoCambioCiclo from './DialogoCambioCiclo'
import { rangoCiclos } from './ciclos'
import { accionesCiclo, duracionCiclo, periodoCiclo } from './detalleCiclo'

const COLUMNAS_RESTRICCIONES: ColumnaTabla<Restriccion>[] = [
  { clave: 'fechas', titulo: 'Fechas', render: (r) => periodoRestriccion(r.fecha_inicio, r.fecha_fin) },
  { clave: 'tipo', titulo: 'Tipo', multilinea: true, render: (r) => r.tipo },
  {
    clave: 'efecto',
    titulo: 'Efecto',
    render: (r) => {
      const efecto = EFECTO_RESTRICCION[r.efecto]
      return <Estado tono={efecto.tono} texto={efecto.texto} />
    },
  },
  { clave: 'descripcion', titulo: 'Descripción', multilinea: true, render: (r) => r.descripcion },
]

function textoRestricciones(conflictos: Restriccion[]): { valor: string; contexto: string } {
  if (conflictos.length === 0) return { valor: 'Ninguna', contexto: 'Sin avisos ni prohibiciones en el periodo' }
  const prohibiciones = conflictos.filter((r) => r.efecto === 'Prohibicion').length
  const avisos = conflictos.length - prohibiciones
  const partes = [avisos && `${avisos} ${avisos === 1 ? 'aviso' : 'avisos'}`, prohibiciones && `${prohibiciones} ${prohibiciones === 1 ? 'prohibición' : 'prohibiciones'}`]
  return { valor: String(conflictos.length), contexto: partes.filter(Boolean).join(' y ') }
}

function FichaCiclo({ ciclo, hoy, onAccion }: { ciclo: Programacion; hoy: FechaIso; onAccion: ((cambio: CambioEstadoCiclo) => void) | null }) {
  const { desde, hasta } = periodoCiclo(ciclo, hoy)
  const servicios = useConsulta('ciclo-servicios', (signal) => listarServiciosPeriodicos(signal))
  const restricciones = useConsulta(`ciclo-restricciones:${desde}:${hasta}`, (signal) => listarRestricciones(desde, hasta, signal))
  const ruidoso = servicios.datos?.find((s) => s.id === ciclo.tipo_servicio_id)?.es_ruidoso ?? true
  const conflictos = conflictosDelPeriodo(restricciones.datos ?? [], desde, hasta, ruidoso)
  const resumenRestricciones = textoRestricciones(conflictos)
  const duracion = duracionCiclo(ciclo, hoy)
  const estado = ESTADO_PROGRAMACION[ciclo.estado]
  const acciones = onAccion ? accionesCiclo(ciclo.estado) : []

  return (
    <>
      {acciones.length > 0 && onAccion && (
        <AccionesPagina>
          {acciones.map((accion) => (
            <Boton key={accion.cambio} variante={accion.variante} onClick={() => onAccion(accion.cambio)}>
              {accion.texto}
            </Boton>
          ))}
        </AccionesPagina>
      )}
      <div className={estilos.cabecera}>
        <h2 className={estilos.titulo}>{ciclo.servicio}</h2>
        <Estado tono={estado.tono} texto={estado.texto} punto />
        <p className={estilos.subtitulo}>
          {ciclo.proveedor ?? 'Personal propio'} · {ciclo.estacion}
        </p>
      </div>

      <FilaTarjetas etiqueta="Indicadores del ciclo">
        <TarjetaIndicador
          etiqueta="Fechas previstas"
          valor={periodoRestriccion(ciclo.fecha_inicio_prevista, ciclo.fecha_fin_prevista)}
          contexto={ciclo.estado === 'Programada' ? 'Sin iniciar' : undefined}
        />
        <TarjetaIndicador
          etiqueta="Inicio real"
          valor={ciclo.fecha_inicio_real ? fechaCorta(ciclo.fecha_inicio_real) : 'Sin iniciar'}
          contexto={ciclo.fecha_fin_real ? `Fin real: ${fechaCorta(ciclo.fecha_fin_real)}` : ciclo.estado === 'EnCurso' ? 'Fin real pendiente' : undefined}
        />
        <TarjetaIndicador
          etiqueta="Duración"
          valor={duracion.valor}
          contexto={duracion.contexto}
          estado={duracion.exceso > 0 ? 'alerta' : 'normal'}
          insignia={duracion.exceso > 0 ? { tono: 'error', texto: `Excede en ${duracion.exceso} ${duracion.exceso === 1 ? 'día' : 'días'}` } : undefined}
        />
        <TarjetaIndicador
          etiqueta="Restricciones"
          estado={restricciones.datos ? 'normal' : 'cargando'}
          valor={resumenRestricciones.valor}
          contexto={resumenRestricciones.contexto}
        />
      </FilaTarjetas>

      <Tarjeta titulo="Restricciones del periodo" relleno="amplio">
        {restricciones.estado === 'error' && !restricciones.datos ? (
          <EstadoError titulo="No pudimos cargar las restricciones" descripcion={restricciones.error?.detalle ?? ''} onReintentar={restricciones.reintentar} />
        ) : (
          <TablaDatos
            titulo="Restricciones del periodo"
            columnas={COLUMNAS_RESTRICCIONES}
            filas={conflictos}
            claveFila={(r) => String(r.id)}
            estado={restricciones.datos ? 'exito' : 'cargando'}
            vacio={{ titulo: 'Sin restricciones', descripcion: 'Ningún aviso ni prohibición coincide con el ciclo.' }}
          />
        )}
      </Tarjeta>
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
  const [local, setLocal] = useState<Programacion | null>(null)
  const [cambio, setCambio] = useState<CambioEstadoCiclo | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const cerrarAviso = useCallback(() => setAviso(null), [])

  const ciclo = local?.id === id ? local : consulta.datos?.find((c) => c.id === id)
  usePaginaActual(ciclo?.servicio ?? 'Ciclo', [MIGAS_PLANIFICACION.planificacion, MIGAS_PLANIFICACION.ciclos, { texto: ciclo?.servicio ?? 'Ciclo' }])

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
    contenido = <FichaCiclo ciclo={ciclo} hoy={hoy} onAccion={puedeEditar ? setCambio : null} />
  }

  return (
    <div className={estilos.pagina}>
      <BotonEnlace to={RUTAS_PLANIFICACION.ciclos} variante="fantasma" icono="chevron-left" className={estilos.volver}>
        Volver a Ciclos
      </BotonEnlace>
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
