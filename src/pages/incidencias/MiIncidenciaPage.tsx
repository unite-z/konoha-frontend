// HU-024 · Seguimiento de una incidencia propia en el móvil (AV-282, Figma 391-8560)
/**
 * El tipo y el estado, el tiempo de cierre si ya se cerró, los estados por los que pasó con su hora (el actual
 * arriba, con su punto de color) y la evidencia de la atención. Se llega desde «Mis incidencias».
 * Datos simulados hasta el backend (AV-274 y AV-279), con `AvisoDatosSimulados` (D9).
 */
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import { BotonEnlace } from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Icono from '@/components/ui/Icono'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { RUTAS_MIS_INCIDENCIAS } from '@/router/rutasApp'
import { obtenerMiIncidencia } from '@/services/api/incidencias'
import { hoyLima } from '@/utils/instanteLima'
import { useParams } from 'react-router'
import { ESTADO_INCIDENCIA } from './bandeja'
import { horasHistorial, textoTiempoCierre } from './detalleIncidencia'
import estilos from './Incidencias.module.css'

const VOLVER = { texto: 'Mis incidencias', ruta: RUTAS_MIS_INCIDENCIAS.lista }

export default function MiIncidenciaPage() {
  const id = Number(useParams().id)
  const consulta = useConsulta(`mi-incidencia:${id}`, (signal) => obtenerMiIncidencia(id, signal))
  const incidencia = consulta.datos
  const codigo = incidencia?.codigo ?? 'Incidencia'
  usePaginaActual(codigo, [VOLVER, { texto: codigo }], undefined, { movil: { volver: VOLVER } })

  if (consulta.estado === 'error' && !incidencia) {
    if (consulta.error?.estado === 404) {
      return (
        <EstadoVacio
          titulo="No existe esta incidencia"
          descripcion="Revisa el enlace o búscala en tus incidencias."
          accion={
            <BotonEnlace to={RUTAS_MIS_INCIDENCIAS.lista} variante="secundario">
              Ir a mis incidencias
            </BotonEnlace>
          }
        />
      )
    }
    return <EstadoError titulo="No pudimos cargar la incidencia" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }
  if (!incidencia) return consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null

  const estado = ESTADO_INCIDENCIA[incidencia.estado]
  const horas = horasHistorial(
    incidencia.pasos.map((paso) => ({ texto: paso.estado, fecha_hora: paso.fecha_hora })),
    hoyLima(),
  )
  // El estado actual, arriba: verde si se cerró y azul mientras sigue abierta.
  const claseActual = incidencia.estado === 'Cerrada' ? estilos.pasoHecho : estilos.pasoEnCurso
  return (
    <div className={`${estilos.paginaMovil} ${estilos.seguimiento}`}>
      <AvisoDatosSimulados />
      <div className={estilos.cabeceraSeguimiento}>
        <h2 className={estilos.tituloSeguimiento}>{incidencia.tipo}</h2>
        <Estado tono={estado.tono} texto={estado.texto} punto={incidencia.estado !== 'EnAtencion'} />
      </div>
      {incidencia.minutos_cierre !== null && (
        <p className={estilos.tiempoSeguimiento}>
          <span className={estilos.tituloSeguimiento}>{textoTiempoCierre(incidencia.minutos_cierre)}</span>
          <span>tiempo de cierre</span>
        </p>
      )}
      <ol className={`${estilos.pasos} ${estilos.pasosHolgados}`} aria-label="Seguimiento">
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
        <div className={estilos.evidenciaSeguimiento}>
          <h3 className={estilos.rotuloCampo}>Evidencia</h3>
          <div className={estilos.foto} role={incidencia.evidencia.url ? undefined : 'img'} aria-label={incidencia.evidencia.url ? undefined : 'Evidencia sin foto'}>
            {incidencia.evidencia.url ? <img src={incidencia.evidencia.url} alt="Evidencia de la atención" /> : <Icono nombre="image" tamano="md" />}
          </div>
        </div>
      )}
    </div>
  )
}
