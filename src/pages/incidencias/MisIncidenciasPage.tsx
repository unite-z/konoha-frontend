// HU-024 · Mis incidencias en el móvil (AV-282, Figma 391-8522 y 394-9964)
/**
 * Las incidencias que reportó el usuario, con su espacio, cuándo y el estado. Las que se reportaron sin conexión van
 * arriba como «Pendiente de enviar» y, sin conexión, una banda lo avisa. «+» abre «Reportar incidencia».
 * Datos simulados hasta el backend (AV-274 y AV-279), con `AvisoDatosSimulados` (D9).
 */
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import { useEsMovil } from '@/components/reportes-indicadores/useEsMovil'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import { BotonEnlace } from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import AccionMovil from '@/layouts/LayoutOficina/AccionMovil'
import { RUTAS_MIS_INCIDENCIAS } from '@/router/rutasApp'
import { listarMisIncidencias } from '@/services/api/incidencias'
import { hoyLima } from '@/utils/instanteLima'
import { useEnLinea } from '../corte/useEnLinea'
import { ESTADO_INCIDENCIA } from './bandeja'
import { cuandoReportada } from './misIncidencias'
import { usePendientes } from './reportesPendientes'
import estilos from './Incidencias.module.css'

export default function MisIncidenciasPage() {
  usePaginaActual('Mis incidencias', [{ texto: 'Mis incidencias' }], undefined, { movil: { volver: { texto: 'Inicio', ruta: '/' } } })
  const consulta = useConsulta('mis-incidencias', listarMisIncidencias)
  const pendientes = usePendientes()
  const enLinea = useEnLinea()
  const esMovil = useEsMovil()
  const hoy = hoyLima()

  let contenido
  if (consulta.estado === 'error' && !consulta.datos) {
    contenido = <EstadoError titulo="No pudimos cargar tus incidencias" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  } else if (!consulta.datos) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="tarjetas" texto="Cargando tus incidencias…" /> : null
  } else if (consulta.datos.length === 0 && pendientes.length === 0) {
    contenido = (
      <EstadoVacio
        titulo="Aún no has reportado incidencias"
        descripcion="Si ves una rama caída o algo que reparar, repórtalo con una foto."
        accion={
          <BotonEnlace to={RUTAS_MIS_INCIDENCIAS.reportar} icono="plus-circle">
            Reportar incidencia
          </BotonEnlace>
        }
      />
    )
  } else {
    contenido = (
      <ul className={estilos.misIncidencias}>
        {pendientes.map((pendiente) => (
          <li key={pendiente.clave} className={estilos.miIncidencia}>
            <span className={estilos.textosMiIncidencia}>
              <span className={estilos.tituloMiIncidencia}>{pendiente.tipo}</span>
              <span className={estilos.detalleMiIncidencia}>{pendiente.espacio} · ahora</span>
            </span>
            <Estado tono="aviso" texto="Pendiente de enviar" punto />
          </li>
        ))}
        {consulta.datos.map((incidencia) => {
          const estado = ESTADO_INCIDENCIA[incidencia.estado]
          return (
            <li key={incidencia.id} className={estilos.miIncidencia}>
              <span className={estilos.textosMiIncidencia}>
                <span className={estilos.tituloMiIncidencia}>{incidencia.tipo}</span>
                <span className={estilos.detalleMiIncidencia}>
                  {incidencia.espacio} · {cuandoReportada(incidencia.fecha_registro, hoy)}
                </span>
              </span>
              <Estado tono={estado.tono} texto={estado.texto} punto={incidencia.estado !== 'EnAtencion'} />
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className={estilos.paginaMovil}>
      {/* En el móvil, el «+» va en la barra superior (Figma 391-8522). */}
      {!esMovil && (
        <AccionesPagina>
          <BotonEnlace to={RUTAS_MIS_INCIDENCIAS.reportar} icono="plus-circle">
            Reportar incidencia
          </BotonEnlace>
        </AccionesPagina>
      )}
      <AccionMovil>
        <BotonEnlace to={RUTAS_MIS_INCIDENCIAS.reportar} variante="fantasma" compacto icono="plus-circle">
          <span className="sr-only">Reportar incidencia</span>
        </BotonEnlace>
      </AccionMovil>
      <AvisoDatosSimulados />
      {!enLinea && <AvisoEnLinea tono="advertencia" icono="wifi-off" compacto titulo="Sin conexión · se enviará al reconectar" />}
      {contenido}
    </div>
  )
}
