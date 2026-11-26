/**
 * Seguimiento de una incidencia propia (RD-70, V14, HU-024; `GET incidencias/mias/{id}`): el tipo y el estado, el
 * tiempo de cierre si ya se cerró, los estados por los que pasó con su hora (el actual arriba) y la evidencia de la
 * atención. Es el `PanelLateral` (hoja inferior en móvil) y su apertura vive en la URL (`?incidencia=<id>`): la fila
 * de la lista crece hasta ella.
 */
import Boton from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import Icono from '@/design-system/Icono'
import { useConsulta } from '@/hooks/useConsulta'
import { ESTADO_INCIDENCIA } from '@/pages/incidencias/bandeja'
import { horasHistorial, textoTiempoCierre } from '@/pages/incidencias/detalleIncidencia'
import { obtenerMiIncidencia } from '@/services/api/incidencias'
import { hoyLima } from '@/utils/instanteLima'
import { panel } from '../../base/movimiento'
import PanelLateral from '../../base/PanelLateral/PanelLateral'
import estilos from './Incidencias.module.css'

export interface HojaSeguimientoProps {
  id: number
  onCerrar: () => void
}

export default function HojaSeguimiento({ id, onCerrar }: HojaSeguimientoProps) {
  const consulta = useConsulta(`mi-incidencia:${id}`, (signal) => obtenerMiIncidencia(id, signal))
  const incidencia = consulta.datos
  const titulo = incidencia?.codigo ?? 'Incidencia'

  let cuerpo
  if (consulta.estado === 'error' && !incidencia) {
    const estado = consulta.error?.estado
    if (estado === 403) {
      cuerpo = <EstadoSinAcceso nivel={3} titulo="No tienes acceso a esta incidencia" />
    } else if (estado === 404) {
      cuerpo = (
        <EstadoVacio
          nivel={3}
          titulo="No existe esta incidencia"
          descripcion="Revisa el enlace o búscala en tus incidencias."
          accion={
            <Boton variante="secundario" onClick={onCerrar}>
              Volver a mis incidencias
            </Boton>
          }
        />
      )
    } else {
      cuerpo = (
        <EstadoError
          nivel={3}
          titulo="No pudimos cargar la incidencia"
          descripcion={consulta.error?.detalle ?? ''}
          onReintentar={consulta.reintentar}
        />
      )
    }
  } else if (!incidencia) {
    cuerpo = consulta.cargaVisible ? <EstadoCarga forma="pagina" texto="Cargando el seguimiento…" /> : null
  } else {
    const estado = ESTADO_INCIDENCIA[incidencia.estado]
    const horas = horasHistorial(
      incidencia.pasos.map((paso) => ({ texto: paso.estado, fecha_hora: paso.fecha_hora })),
      hoyLima(),
    )
    // El estado actual, arriba: verde si se cerró y de acento mientras sigue abierta.
    const claseActual = incidencia.estado === 'Cerrada' ? estilos.pasoHecho : estilos.pasoEnCurso
    cuerpo = (
      <div className={estilos.seguimiento}>
        <div className={estilos.cabeceraSeguimiento}>
          <h3 className={estilos.tipoSeguimiento}>{incidencia.tipo}</h3>
          <Estado tono={estado.tono} texto={estado.texto} punto={incidencia.estado !== 'EnAtencion'} />
        </div>
        {incidencia.minutos_cierre !== null && (
          <p className={estilos.tiempoCierre}>
            <span className={estilos.cifraCierre}>{textoTiempoCierre(incidencia.minutos_cierre)}</span>
            <span>tiempo de cierre</span>
          </p>
        )}
        <ol className={estilos.pasos} aria-label="Seguimiento">
          {incidencia.pasos.map((paso, indice) => (
            <li key={`${paso.estado}-${paso.fecha_hora}`} className={`${estilos.paso} ${indice === 0 ? claseActual : ''}`}>
              <span className={estilos.puntoPaso} aria-hidden="true" />
              <span className={estilos.nombrePaso}>
                {ESTADO_INCIDENCIA[paso.estado].texto}
                {indice === 0 && <span className="sr-only">, estado actual</span>}
              </span>
              <span className={estilos.fechaPaso}>{horas[indice]}</span>
            </li>
          ))}
        </ol>
        {incidencia.evidencia && (
          <div>
            <h4 className={estilos.rotulo}>Evidencia</h4>
            <div
              className={estilos.evidencia}
              role={incidencia.evidencia.url ? undefined : 'img'}
              aria-label={incidencia.evidencia.url ? undefined : 'Evidencia sin foto'}
            >
              {incidencia.evidencia.url ? (
                <img src={incidencia.evidencia.url} alt="Evidencia de la atención" />
              ) : (
                <Icono nombre="image" tamano="md" />
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <PanelLateral abierto onCerrar={onCerrar} titulo={titulo} subtitulo="Seguimiento" viewTransitionName={panel(id)}>
      {cuerpo}
    </PanelLateral>
  )
}
