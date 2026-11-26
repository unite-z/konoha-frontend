import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { useConsulta } from '@/hooks/useConsulta'
import HistorialEjemplar from '@/pages/inventario/HistorialEjemplar'
import { listarHistorialActividadesEjemplar, listarHistorialSituacionEjemplar } from '@/services/api/ejemplares'
import { formatearFecha } from '@/utils/formato'
import { estadoLegible, nombreSituacionSingular } from '../PanelArea/formato'
import estilos from './FichaEjemplar.module.css'

/** Historial del ejemplar: actividades, intervenciones (poda, fitosanitario, incidencias) y cambios de situación. */
export default function PestanaHistorialEjemplar({ ejemplarId }: { ejemplarId: number }) {
  return (
    <div className={estilos.seccion}>
      <Actividades ejemplarId={ejemplarId} />
      <HistorialEjemplar ejemplarId={ejemplarId} />
      <CambiosDeSituacion ejemplarId={ejemplarId} />
    </div>
  )
}

function Actividades({ ejemplarId }: { ejemplarId: number }) {
  const consulta = useConsulta(`rd-ficha-actividades:${ejemplarId}`, (signal) =>
    listarHistorialActividadesEjemplar(ejemplarId, signal),
  )
  return (
    <section className={estilos.seccion} aria-labelledby="ficha-actividades">
      <h3 id="ficha-actividades" className={estilos.subtitulo}>
        Actividades
      </h3>
      {consulta.error?.estado === 403 ? (
        <EstadoSinAcceso nivel={3} />
      ) : consulta.error?.estado === 404 ? (
        // Mientras el servidor no publique el endpoint, la ficha sigue sirviendo el resto del historial.
        <EstadoVacio
          nivel={3}
          titulo="Actividades no disponibles"
          descripcion="El servidor aún no entrega las actividades del ejemplar."
        />
      ) : consulta.estado === 'error' ? (
        <EstadoError
          nivel={3}
          titulo="No pudimos cargar las actividades"
          descripcion={consulta.error?.detalle ?? 'Revisa tu conexión e inténtalo de nuevo.'}
          onReintentar={consulta.reintentar}
        />
      ) : !consulta.datos ? (
        <EstadoCarga forma="tabla" texto="Cargando actividades…" />
      ) : consulta.datos.length === 0 ? (
        <EstadoVacio
          nivel={3}
          titulo="Sin actividades"
          descripcion="Las actividades sobre este ejemplar aparecerán aquí."
        />
      ) : (
        <ol className={estilos.lista} aria-label="Actividades del ejemplar">
          {consulta.datos.map((actividad) => (
            <li key={actividad.id} className={estilos.entrada}>
              <strong>{actividad.tipo}</strong>
              <span className={estilos.secundario}>
                {[
                  formatearFecha(actividad.fecha),
                  actividad.detalle,
                  actividad.estado ? estadoLegible(actividad.estado) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function CambiosDeSituacion({ ejemplarId }: { ejemplarId: number }) {
  // Misma clave que usa la pestaña Situación: el listado se comparte.
  const consulta = useConsulta(`situacion-ejemplar:${ejemplarId}`, (signal) =>
    listarHistorialSituacionEjemplar(ejemplarId, signal),
  )
  return (
    <section className={estilos.seccion} aria-labelledby="ficha-cambios-situacion">
      <h3 id="ficha-cambios-situacion" className={estilos.subtitulo}>
        Cambios de situación
      </h3>
      {consulta.error?.estado === 403 ? (
        <EstadoSinAcceso nivel={3} />
      ) : consulta.estado === 'error' ? (
        <EstadoError
          nivel={3}
          titulo="No pudimos cargar los cambios de situación"
          descripcion={consulta.error?.detalle ?? 'Revisa tu conexión e inténtalo de nuevo.'}
          onReintentar={consulta.reintentar}
        />
      ) : !consulta.datos ? (
        <EstadoCarga forma="tabla" texto="Cargando cambios de situación…" />
      ) : consulta.datos.length === 0 ? (
        <EstadoVacio
          nivel={3}
          titulo="Sin cambios de situación"
          descripcion="El ejemplar conserva la situación con la que se registró."
        />
      ) : (
        <ol className={estilos.lista} aria-label="Cambios de situación del ejemplar">
          {consulta.datos.map((cambio) => (
            <li key={cambio.id} className={estilos.entrada}>
              <strong>
                {nombreSituacionSingular(cambio.situacion_anterior)} → {nombreSituacionSingular(cambio.situacion_nueva)}
              </strong>
              <span className={estilos.secundario}>
                {formatearFecha(cambio.fecha)} · {cambio.autor} · {cambio.motivo}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
