// RF-INC-001, RF-INC-005 · Incidencias del capataz en el móvil (RD-70, V14, HU-020 y HU-024)
/**
 * «Mis incidencias»: las que reportó el usuario con su espacio, cuándo y el estado, y el botón «Reportar» que abre la
 * hoja de reporte (`?reportar=1`). Las reportadas sin conexión van arriba como «Pendiente de enviar», con su foto y su
 * hora real, y una banda avisa de que faltan por enviar; la cola común (RF-T-012) las envía al volver la red aunque
 * esta pantalla no esté abierta. Cada incidencia propia abre su hoja de seguimiento (`?incidencia=<id>`).
 * Fondo liso, sin mapa; la barra inferior es la de RD-04. Permiso: `PLA.INCIDENCIA.REGISTRAR`.
 */
import { Plus, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import AvisoTemporal from '@/design-system/AvisoTemporal'
import Boton from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import Icono from '@/design-system/Icono'
import { PERMISOS } from '@/config/permisosCore'
import { tiene } from '@/config/permisosSesion'
import { useConsulta } from '@/hooks/useConsulta'
import { useEnLinea } from '@/hooks/useEnLinea'
import { ESTADO_INCIDENCIA } from '@/pages/incidencias/bandeja'
import { cuandoReportada } from '@/pages/incidencias/misIncidencias'
import { listarMisIncidencias } from '@/services/api/incidencias'
import { usePermisos } from '@/sesion/ContextoSesion'
import { conCache } from '@/sincronizacion/datosDescargados'
import { formatearFechaHora } from '@/utils/formato'
import { hoyLima } from '@/utils/instanteLima'
import { estiloTransicion, fila, nombresTransicion, panel, transicionar, useFocoConLaVista } from '../../base/movimiento'
import { useParametroPanel } from '../../base/PanelLateral/useParametroPanel'
import { PARAM_INCIDENCIA, PARAM_REPORTAR } from '../enlaces'
import HojaReportar from './HojaReportar'
import HojaSeguimiento from './HojaSeguimiento'
import { NOMBRE_REPORTAR } from './nombres'
import { usePendientesConFoto, type PendienteConFoto } from './usePendientesConFoto'
import { useVistaPrevia } from './useVistaPrevia'
import estilos from './Incidencias.module.css'

function FilaPendiente({ pendiente }: { pendiente: PendienteConFoto }) {
  const vistaPrevia = useVistaPrevia(pendiente.foto)
  return (
    <li className={estilos.fila}>
      <span className={estilos.miniatura}>
        {vistaPrevia ? <img src={vistaPrevia} alt="" /> : <Icono nombre="image" tamano="md" />}
      </span>
      <span className={estilos.textos}>
        <span className={estilos.titulo}>{pendiente.tipo}</span>
        <span className={estilos.detalle}>
          {pendiente.espacio} · {formatearFechaHora(pendiente.creado_en)}
        </span>
      </span>
      {pendiente.error ? (
        <Estado tono="error" texto="No se pudo enviar" ayuda={pendiente.error} />
      ) : (
        <Estado tono="aviso" texto="Pendiente de enviar" punto />
      )}
    </li>
  )
}

export default function IncidenciasPage() {
  const permisos = usePermisos()
  const puede = tiene(permisos, PERMISOS.registrarIncidencia)
  const consulta = useConsulta(puede ? 'mis-incidencias' : null, (signal) =>
    conCache('mis-incidencias', () => listarMisIncidencias(signal)),
  )
  const pendientes = usePendientesConFoto()
  const enLinea = useEnLinea()
  const hoy = hoyLima()
  const reportar = useParametroPanel(PARAM_REPORTAR)
  const seguimiento = useParametroPanel(PARAM_INCIDENCIA)
  const encabezado = useFocoConLaVista<HTMLHeadingElement>()
  const [aviso, setAviso] = useState<string | null>(null)
  const { reintentar } = consulta

  // Cuando la cola termina de enviar reportes, se relee la lista para verlos con su código y estado.
  const enCola = pendientes.length
  const anteriorEnCola = useRef(enCola)
  useEffect(() => {
    if (enLinea && enCola < anteriorEnCola.current) reintentar()
    anteriorEnCola.current = enCola
  }, [enCola, enLinea, reintentar])

  if (!puede || (consulta.estado === 'error' && consulta.error?.estado === 403 && !consulta.datos)) {
    return (
      <div className={estilos.pagina}>
        <EstadoSinAcceso
          titulo="No tienes acceso a las incidencias"
          descripcion="Tu cuenta no puede reportar incidencias. Pide acceso a tu jefatura."
        />
      </div>
    )
  }

  const abierta = seguimiento.valor === null ? null : Number(seguimiento.valor)
  let contenido
  if (consulta.estado === 'error' && !consulta.datos) {
    contenido = (
      <EstadoError
        titulo="No pudimos cargar tus incidencias"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (!consulta.datos) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="tarjetas" texto="Cargando tus incidencias…" /> : null
  } else if (consulta.datos.length === 0 && pendientes.length === 0) {
    contenido = (
      <EstadoVacio
        titulo="Aún no has reportado incidencias"
        descripcion="Si ves una rama caída o algo que reparar, repórtalo con una foto."
      />
    )
  } else {
    contenido = (
      <ul className={estilos.lista} aria-label="Mis incidencias">
        {pendientes.map((pendiente) => (
          <FilaPendiente key={pendiente.clave} pendiente={pendiente} />
        ))}
        {consulta.datos.map((incidencia) => {
          const estado = ESTADO_INCIDENCIA[incidencia.estado]
          return (
            <li
              key={incidencia.id}
              style={abierta === incidencia.id ? undefined : estiloTransicion(fila(incidencia.id))} // estilo-calculado
            >
              <button
                type="button"
                className={`${estilos.fila} ${estilos.filaPulsable}`}
                onClick={() => transicionar(() => seguimiento.abrir(String(incidencia.id)))}
              >
                <span className={estilos.textos}>
                  <span className={estilos.titulo}>{incidencia.tipo}</span>
                  <span className={estilos.detalle}>
                    {incidencia.espacio} · {cuandoReportada(incidencia.fecha_registro, hoy)}
                  </span>
                </span>
                <Estado tono={estado.tono} texto={estado.texto} punto={incidencia.estado !== 'EnAtencion'} />
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  const reportando = reportar.valor !== null
  return (
    <div className={estilos.pagina}>
      <header
        className={estilos.encabezado}
        style={estiloTransicion(nombresTransicion.encabezado)} /* estilo-calculado */
      >
        <h1 ref={encabezado} tabIndex={-1} className={estilos.tituloPagina}>
          Incidencias
        </h1>
        <span style={reportando ? undefined : estiloTransicion(panel(NOMBRE_REPORTAR))} /* estilo-calculado */>
          <Boton compacto onClick={() => transicionar(() => reportar.abrir('1'))}>
            <Plus size={16} aria-hidden="true" />
            Reportar
          </Boton>
        </span>
      </header>
      {(!enLinea || enCola > 0) && (
        <div className={estilos.banda} role="status">
          <WifiOff size={16} aria-hidden="true" />
          <p className={estilos.bandaTitulo}>
            {enLinea
              ? `${enCola} ${enCola === 1 ? 'reporte pendiente' : 'reportes pendientes'} de enviar`
              : 'Sin conexión · se enviará al reconectar'}
          </p>
        </div>
      )}
      {contenido}
      {reportando && (
        <HojaReportar
          onCerrar={() => transicionar(reportar.cerrar)}
          onEnviado={(mensaje) => {
            setAviso(mensaje)
            reintentar()
            transicionar(reportar.cerrar)
          }}
        />
      )}
      {abierta !== null && Number.isFinite(abierta) && (
        <HojaSeguimiento key={abierta} id={abierta} onCerrar={() => transicionar(seguimiento.cerrar)} />
      )}
      <AvisoTemporal mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
