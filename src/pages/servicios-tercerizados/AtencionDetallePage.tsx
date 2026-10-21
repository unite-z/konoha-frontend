// RF-SER-003, 004, 005, 006 y 011 · Ficha de la atención tercerizada
/**
 * Ficha de una atención (mockup, pantalla 6; Guía Web 6: ficha de detalle con historial).
 *
 * Acciones según rol y estado: OC, inicio, fin, reporte, origen y acuerdo de la unidad (`acciones/`). Tras
 * cada operación la ficha se actualiza con la atención que devuelve el servidor (nunca con un resultado
 * supuesto) y se confirma con un aviso temporal.
 * No se muestran conformidad ni seguridad y salud: están fuera de esta entrega.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useParams } from 'react-router'
import LineaEstados from '../../components/tercerizados/LineaEstados'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import AvisoTemporal from '../../components/ui/AvisoTemporal'
import Badge from '../../components/ui/Badge'
import { BotonEnlace } from '../../components/ui/Boton'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import EstadoVacio from '../../components/ui/EstadoVacio'
import ListaDescripcion from '../../components/ui/ListaDescripcion'
import TablaDatos, { type ColumnaTabla } from '../../components/ui/TablaDatos'
import { useConsulta } from '../../hooks/useConsulta'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS } from '../../router/rutasApp'
import { obtenerAtencion } from '../../services/api/tercerizados'
import type { Alcance, Atencion } from '../../types/tercerizados'
import {
  codigoCorto,
  insigniaAcuerdo,
  insigniaEstado,
  textoAlcance,
  textoOrigen,
} from '../../utils/estadosTercerizados'
import { formatearFecha, formatearFechaHora, formatearMinutos, formatearNumero, SIN_VALOR } from '../../utils/formato'
import { useSesionTercerizados } from '../../sesion/ContextoSesionTercerizados'
import AccionesAtencion from './acciones/AccionesAtencion'
import DocumentosProveedor from './DocumentosProveedor'
import type { EstadoNavegacionBandeja } from './AtencionesPage'
import estilos from './Tercerizados.module.css'

const COLUMNAS_ALCANCES: ColumnaTabla<Alcance>[] = [
  { clave: 'tipo', titulo: 'Tipo', render: (a) => (a.area_verde_id ? 'Área verde' : 'Ejemplar') },
  { clave: 'destino', titulo: 'Espacio o ejemplar', multilinea: true, render: textoAlcance },
  {
    clave: 'metrado',
    titulo: 'Metrado',
    alineacion: 'derecha',
    render: (a) =>
      a.metrado === null
        ? SIN_VALOR
        : `${formatearNumero(Number(a.metrado), 2)} ${a.unidad_medida_simbolo || a.unidad_medida_nombre || ''}`.trim(),
  },
]

/** Duración entre inicio y fin, en minutos; `null` si falta alguno. */
function duracionMinutos(atencion: Atencion): number | null {
  if (!atencion.fecha_hora_inicio || !atencion.fecha_hora_fin) return null
  const minutos = (Date.parse(atencion.fecha_hora_fin) - Date.parse(atencion.fecha_hora_inicio)) / 60000
  return Number.isFinite(minutos) && minutos >= 0 ? minutos : null
}

/** La versión más reciente entre la consultada y la recibida de una operación (misma atención). */
function masReciente(consultada: Atencion | null, local: Atencion | null): Atencion | null {
  if (!local || !consultada || local.id !== consultada.id) return consultada
  return Date.parse(local.fecha_modificacion) >= Date.parse(consultada.fecha_modificacion) ? local : consultada
}

function textoUnidad(atencion: Atencion): string | null {
  if (!atencion.unidad_solicitante_nombre) return null
  return atencion.unidad_solicitante_provisional
    ? `${atencion.unidad_solicitante_nombre} (provisional)`
    : atencion.unidad_solicitante_nombre
}

function Ficha({
  atencion,
  acciones,
  versionDocumentos,
  enfocarTitulo,
}: {
  atencion: Atencion
  acciones: ReactNode
  versionDocumentos: number
  /** Al llegar desde el asistente, el foco pasa al título para no perderse en el documento. */
  enfocarTitulo: boolean
}) {
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (enfocarTitulo) titulo.current?.focus()
    // `enfocarTitulo` no cambia durante la vida de la página: el efecto corre una sola vez.
  }, [enfocarTitulo])
  const acuerdo = insigniaAcuerdo(atencion.acuerdo_unidad)
  const duracion = duracionMinutos(atencion)
  const esSolicitudUnidad = atencion.origen === 'SolicitudUnidad'

  return (
    <>
      <section className={estilos.superficie} aria-labelledby="titulo-atencion">
        <div className={estilos.cabeceraFicha}>
          <h2 id="titulo-atencion" ref={titulo} tabIndex={-1} className={`${estilos.tituloPrincipal} ${estilos.textoLargo}`}>
            {atencion.descripcion}
          </h2>
          <span className={estilos.enLinea}>
            <Badge {...insigniaEstado(atencion.estado)} />
            {atencion.es_riesgo && (
              <Badge tono="advertencia" texto="Atención de riesgo" ayuda="El inicio queda bloqueado hasta integrar la revisión de seguridad" />
            )}
          </span>
        </div>
        <ListaDescripcion
          elementos={[
            { etiqueta: 'Código', valor: <span className="cifra">{atencion.codigo}</span>, ancho: true },
            { etiqueta: 'Proveedor', valor: atencion.proveedor_nombre },
            { etiqueta: 'Contrato', valor: atencion.contrato_numero },
            { etiqueta: 'Servicio', valor: atencion.tipo_servicio_nombre },
            { etiqueta: 'Modalidad', valor: 'Programada según contrato' },
            { etiqueta: 'Origen', valor: textoOrigen(atencion.origen) },
            esSolicitudUnidad && { etiqueta: 'Unidad solicitante', valor: textoUnidad(atencion) },
            {
              etiqueta: 'Orden de compra (Logística)',
              valor: atencion.numero_orden_compra
                ? `${atencion.numero_orden_compra} · ${formatearFechaHora(atencion.fecha_orden_compra)}`
                : 'Pendiente',
            },
            { etiqueta: 'Registrada por', valor: atencion.solicitado_por_nombre },
            { etiqueta: 'Fecha de registro', valor: formatearFechaHora(atencion.fecha_creacion) },
          ]}
        />
        <LineaEstados estado={atencion.estado} historial={atencion.historial} />
        {acciones}
      </section>

      <div className={estilos.columnas}>
        <section className={estilos.superficie} aria-labelledby="titulo-ejecucion">
          <h2 id="titulo-ejecucion" className={estilos.tituloSeccion}>
            Ejecución
          </h2>
          <ListaDescripcion
            columnas="una"
            elementos={[
              { etiqueta: 'Inicio', valor: atencion.fecha_hora_inicio ? formatearFechaHora(atencion.fecha_hora_inicio) : 'Sin registrar' },
              { etiqueta: 'Fin', valor: atencion.fecha_hora_fin ? formatearFechaHora(atencion.fecha_hora_fin) : 'Sin registrar' },
              duracion !== null && { etiqueta: 'Duración', valor: formatearMinutos(duracion) },
            ]}
          />
          <p className={estilos.ayuda}>Fechas y horas de Lima.</p>
        </section>

        {esSolicitudUnidad ? (
          <section className={estilos.superficie} aria-labelledby="titulo-acuerdo">
            <div className={estilos.cabeceraSeccion}>
              <h2 id="titulo-acuerdo" className={estilos.tituloSeccion}>
                Acuerdo de la unidad
              </h2>
              <Badge {...acuerdo} />
            </div>
            <ListaDescripcion
              columnas="una"
              elementos={[
                { etiqueta: 'Unidad', valor: textoUnidad(atencion) },
                atencion.acuerdo_unidad !== null && { etiqueta: 'Fecha', valor: formatearFecha(atencion.fecha_acuerdo_unidad) },
                Boolean(atencion.comentarios_acuerdo_unidad) && {
                  etiqueta: 'Comentarios',
                  valor: <span className={estilos.textoLargo}>{atencion.comentarios_acuerdo_unidad}</span>,
                },
              ]}
            />
            <AvisoEnLinea tono="info">
              El acuerdo de la unidad no sustituye la conformidad del jefe de sección ni cierra la atención.
            </AvisoEnLinea>
          </section>
        ) : (
          <section className={estilos.superficie} aria-labelledby="titulo-origen">
            <h2 id="titulo-origen" className={estilos.tituloSeccion}>
              Origen
            </h2>
            <p>{textoOrigen(atencion.origen)}</p>
            <p className={estilos.ayuda}>El acuerdo de una unidad solo aplica a atenciones solicitadas por una unidad.</p>
          </section>
        )}
      </div>

      <section className={estilos.seccion} aria-labelledby="titulo-alcances">
        <div className={estilos.cabeceraSeccion}>
          <h2 id="titulo-alcances" className={estilos.tituloSeccion}>
            Espacios y ejemplares
          </h2>
          <span className={estilos.ayuda}>
            {atencion.alcances.length} {atencion.alcances.length === 1 ? 'elemento' : 'elementos'}
          </span>
        </div>
        <TablaDatos
          titulo="Espacios y ejemplares de la atención"
          columnas={COLUMNAS_ALCANCES}
          filas={atencion.alcances}
          claveFila={(a) => String(a.id)}
        />
      </section>

      <DocumentosProveedor atencion={atencion} version={versionDocumentos} />

      <section className={estilos.superficie} aria-labelledby="titulo-historial">
        <h2 id="titulo-historial" className={estilos.tituloSeccion}>
          Historial de estados
        </h2>
        <ol className={estilos.historial}>
          {[...atencion.historial].reverse().map((cambio, indice) => (
            <li key={`${cambio.fecha_hora}-${indice}`}>
              <span className="cifra">{formatearFechaHora(cambio.fecha_hora)}</span>
              <span>
                {cambio.estado_anterior ? `${cambio.estado_anterior} → ` : ''}
                <strong>{cambio.estado_nuevo}</strong>
              </span>
              <span className={estilos.atenuado}>{cambio.usuario_nombre ?? SIN_VALOR}</span>
            </li>
          ))}
        </ol>
        <p className={estilos.ayuda}>
          Las correcciones de la orden de compra y del origen quedan auditadas en el servidor; su detalle se mostrará
          aquí más adelante.
        </p>
      </section>
    </>
  )
}

export default function AtencionDetallePage() {
  const { id: parametro } = useParams()
  const { state } = useLocation()
  const id = parametro && /^\d{1,9}$/.test(parametro) ? Number(parametro) : null
  const volverA = RUTAS_TERCERIZADOS.atenciones + ((state as EstadoNavegacionBandeja | null)?.volverA ?? '')

  const { estado: sesion } = useSesionTercerizados()
  const rol = sesion.tipo === 'activa' ? sesion.usuario.rol : null

  const consulta = useConsulta(id === null ? null : `atencion|${id}`, (signal) => obtenerAtencion(id as number, signal))
  // Última versión recibida de una operación o recarga; se usa si es tan reciente como la consultada.
  const [local, setLocal] = useState<Atencion | null>(null)
  const atencion = masReciente(consulta.datos, local)
  // Aviso que deja el asistente al registrar la atención.
  const [aviso, setAviso] = useState<string | null>(() => (state as { aviso?: string } | null)?.aviso ?? null)
  const cerrarAviso = useCallback(() => setAviso(null), [setAviso])
  const [versionDocumentos, setVersionDocumentos] = useState(0)
  const [enfocarTitulo] = useState(() => Boolean((state as { aviso?: string } | null)?.aviso))

  usePaginaActual(atencion ? `Atención ${codigoCorto(atencion.codigo)}` : 'Atención tercerizada', [
    MIGAS_TERCERIZADOS.serviciosTercerizados,
    MIGAS_TERCERIZADOS.atenciones,
    { texto: atencion ? codigoCorto(atencion.codigo) : 'Ficha' },
  ])

  const volver = (
    <BotonEnlace to={volverA} variante="terciario">
      Volver a la bandeja
    </BotonEnlace>
  )

  let contenido
  if (id === null || (consulta.estado === 'error' && consulta.error?.estado === 404)) {
    contenido = (
      <EstadoVacio
        titulo="No existe esta atención"
        descripcion="Revisa el enlace o búscala en la bandeja."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.atenciones} variante="secundario">
            Ir a la bandeja
          </BotonEnlace>
        }
      />
    )
  } else if (consulta.estado === 'error') {
    contenido = (
      <EstadoError
        titulo="No pudimos cargar la atención"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (!atencion) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  } else {
    contenido = (
      <Ficha
        atencion={atencion}
        versionDocumentos={versionDocumentos}
        enfocarTitulo={enfocarTitulo}
        acciones={
          <AccionesAtencion
            atencion={atencion}
            rol={rol}
            onActualizada={setLocal}
            onExito={setAviso}
            onReporteAdjunto={() => setVersionDocumentos((v) => v + 1)}
          />
        }
      />
    )
  }

  return (
    <div className={estilos.pagina}>
      <div>{volver}</div>
      {contenido}
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </div>
  )
}
