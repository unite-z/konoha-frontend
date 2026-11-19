import { Link } from 'react-router'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import { API_CORE_URL } from '@/services/api/clienteCore'
import { API_TERCERIZADOS_URL } from '@/services/api/clienteTercerizados'
import { useConsulta } from '@/hooks/useConsulta'
import { listarHistorialEjemplar, type FuenteHistorialEjemplar } from '@/services/api/ejemplares'
import { rutaDetalleAtencion } from '@/router/rutasApp'
import { formatearFecha } from '@/utils/formato'
import estilos from './Catalogos.module.css'

export default function HistorialEjemplar({ ejemplarId }: { ejemplarId: number }) {
  const fuentes = [
    { titulo: 'Podas', consulta: useFuenteHistorial(ejemplarId, 'podas') },
    { titulo: 'Aplicaciones fitosanitarias', consulta: useFuenteHistorial(ejemplarId, 'fitosanitario') },
    { titulo: 'Incidencias', consulta: useFuenteHistorial(ejemplarId, 'incidencias') },
  ]
  const eventos = fuentes
    .flatMap(({ consulta }) => (consulta.estado === 'exito' ? (consulta.datos ?? []) : []))
    .sort(
      (a, b) =>
        Date.parse(b.momento ?? b.fecha) - Date.parse(a.momento ?? a.fecha) ||
        a.origen.localeCompare(b.origen) ||
        b.id - a.id,
    )

  return (
    <section className={estilos.seccionFicha} aria-labelledby="intervenciones-del-ejemplar">
      <h3 id="intervenciones-del-ejemplar">Historial de intervenciones</h3>
      {fuentes.some(({ consulta }) => consulta.estado === 'cargando') && (
        <EstadoCarga forma="tabla" texto="Cargando historial…" />
      )}
      {fuentes
        .filter(({ consulta }) => consulta.estado === 'error')
        .map(({ titulo, consulta }) => (
          <section key={titulo} aria-label={titulo}>
            <h4>{titulo}</h4>
            {consulta.error?.estado === 403 ? (
              <EstadoSinAcceso nivel={3} />
            ) : (
              <EstadoError
                titulo="Fuente no disponible"
                descripcion={consulta.error?.detalle ?? ''}
                onReintentar={consulta.reintentar}
                nivel={3}
              />
            )}
          </section>
        ))}
      {eventos.length > 0 && (
        <ol className={estilos.lista} aria-label="Cronología de intervenciones">
          {eventos.map((evento) => (
            <li className={estilos.fila} key={`${evento.origen}:${evento.id}`}>
              <div>
                <div className={estilos.accionesFila}>
                  <strong>{evento.tipo}</strong>
                  <Estado tono="neutro" texto={evento.origen} punto={false} />
                </div>
                <p>{formatearFecha(evento.fecha)}</p>
                {evento.ejecutor && <p>Ejecutor · {evento.ejecutor}</p>}
                {evento.detalle && <p>{evento.detalle}</p>}
                {evento.evidencia_id && (
                  <a href={`${API_CORE_URL}/adjuntos/${evento.evidencia_id}/contenido/`}>Ver evidencia</a>
                )}
                {evento.reporte_id && evento.documento_id && (
                  <p>
                    <a
                      href={`${API_TERCERIZADOS_URL}/atenciones/${evento.id}/reportes/${evento.reporte_id}/documentos/${evento.documento_id}/descarga/`}
                    >
                      Descargar documento del proveedor
                    </a>
                  </p>
                )}
                {evento.entidad === 'atencion' && (
                  <p>
                    <Link to={rutaDetalleAtencion(evento.id)}>Ver productos, dosis y plagas de la atención</Link>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {eventos.length === 0 &&
        fuentes.some(({ consulta }) => consulta.estado === 'exito') &&
        !fuentes.some(({ consulta }) => consulta.estado === 'cargando') && (
          <p className={estilos.descripcion}>Sin registros en las fuentes disponibles.</p>
        )}
    </section>
  )
}

function useFuenteHistorial(ejemplarId: number, fuente: FuenteHistorialEjemplar) {
  return useConsulta(`historial-ejemplar:${ejemplarId}:${fuente}`, (signal) =>
    listarHistorialEjemplar(ejemplarId, fuente, signal),
  )
}
