// RF-SER-003, 004, 005, 006 y 011 · Ficha de la atención tercerizada
/** Ficha de una atención: datos, ejecución, acuerdo, seguridad, alcances, historial y evidencias. */
import { useEffect, useRef, type ReactNode } from 'react'
import LineaEstados from '@/components/tercerizados/LineaEstados'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Estado from '@/components/ui/Estado'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import Tarjeta from '@/components/ui/Tarjeta'
import { insigniaAEstado } from '@/components/ui/tonos'
import type { Alcance, Atencion, PlagaControlada, ProductoAplicado } from '@/types/tercerizados'
import {
  insigniaAcuerdo,
  insigniaEstado,
  textoAlcance,
  textoClase,
  textoOrden,
  textoOrigen,
} from '@/utils/estadosTercerizados'
import { formatearFecha, formatearFechaHora, formatearMinutos, formatearNumero, SIN_VALOR } from '@/utils/formato'
import DocumentosProveedor from './DocumentosProveedor'
import SeccionConformidad from './SeccionConformidad'
import Adjuntos from '@/components/core/Adjuntos'
import HistorialCambios from '@/components/core/HistorialCambios'
import { PERMISOS, puede } from '@/config/permisosCore'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import estilos from './Tercerizados.module.css'

const COLUMNAS_PRODUCTOS: ColumnaTabla<ProductoAplicado>[] = [
  {
    clave: 'producto',
    titulo: 'Producto',
    multilinea: true,
    render: (p) => (
      <>
        {p.producto_nombre}
        {!p.producto_activo && <Estado tono="neutro" texto="Inhabilitado" />}
      </>
    ),
  },
  { clave: 'dosis', titulo: 'Dosis', multilinea: true, render: (p) => p.dosis || SIN_VALOR },
]

const COLUMNAS_PLAGAS: ColumnaTabla<PlagaControlada>[] = [
  {
    clave: 'plaga',
    titulo: 'Plaga',
    multilinea: true,
    render: (p) => (
      <>
        {p.plaga_nombre}
        {!p.plaga_activo && <Estado tono="neutro" texto="Inhabilitada" />}
      </>
    ),
  },
]

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

function textoUnidad(atencion: Atencion): string | null {
  if (!atencion.unidad_solicitante_nombre) return null
  return atencion.unidad_solicitante_provisional
    ? `${atencion.unidad_solicitante_nombre} (provisional)`
    : atencion.unidad_solicitante_nombre
}

export default function Ficha({
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
  const puedeAdjuntar = puede(useSesionActiva(), PERMISOS.registrarAtencion)
  useEffect(() => {
    if (enfocarTitulo) titulo.current?.focus()
    // `enfocarTitulo` no cambia durante la vida de la página: el efecto corre una sola vez.
  }, [enfocarTitulo])
  const acuerdo = insigniaAcuerdo(atencion.acuerdo_unidad)
  const duracion = duracionMinutos(atencion)
  const esSolicitudUnidad = atencion.origen === 'SolicitudUnidad'

  const tarjetaEjecucion = (
    <Tarjeta titulo="Ejecución" relleno="amplio">
      <ListaDescripcion
        elementos={[
          {
            etiqueta: 'Inicio',
            valor: atencion.fecha_hora_inicio ? formatearFechaHora(atencion.fecha_hora_inicio) : 'Sin registrar',
          },
          {
            etiqueta: 'Fin',
            valor: atencion.fecha_hora_fin ? formatearFechaHora(atencion.fecha_hora_fin) : 'Sin registrar',
          },
          duracion !== null && { etiqueta: 'Duración', valor: formatearMinutos(duracion) },
        ]}
      />
      <p className={estilos.ayuda}>Fechas y horas de Lima.</p>
    </Tarjeta>
  )

  return (
    <>
      <Tarjeta relleno="amplio" etiquetadaPor="titulo-atencion">
        <div className={estilos.cabeceraFicha}>
          <h2
            id="titulo-atencion"
            ref={titulo}
            tabIndex={-1}
            className={`${estilos.tituloPrincipal} ${estilos.textoLargo}`}
          >
            {atencion.descripcion}
          </h2>
          <span className={estilos.enLinea}>
            <Estado {...insigniaAEstado(insigniaEstado(atencion.estado))} />
            {atencion.es_riesgo && (
              <Estado
                tono="aviso"
                texto="Atención de riesgo"
                ayuda="Requiere verificación de seguridad antes del inicio"
              />
            )}
          </span>
        </div>
        <ListaDescripcion
          columnas="filas"
          etiquetaAncha
          elementos={[
            { etiqueta: 'Código', valor: <span className="cifra">{atencion.codigo}</span>, ancho: true },
            { etiqueta: 'Proveedor', valor: atencion.proveedor_nombre },
            { etiqueta: 'Contrato', valor: atencion.contrato_numero },
            { etiqueta: 'Servicio', valor: atencion.tipo_servicio_nombre },
            { etiqueta: 'Modalidad', valor: textoClase(atencion.clase) },
            { etiqueta: 'Origen', valor: textoOrigen(atencion.origen) },
            esSolicitudUnidad && { etiqueta: 'Unidad solicitante', valor: textoUnidad(atencion) },
            {
              etiqueta: `${textoOrden(atencion.clase, true)} (Logística)`,
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
      </Tarjeta>

      {esSolicitudUnidad ? (
        <div className={estilos.columnas}>
          {tarjetaEjecucion}

          <Tarjeta titulo="Acuerdo de la unidad" relleno="amplio" acciones={<Estado {...insigniaAEstado(acuerdo)} />}>
            <ListaDescripcion
              columnas="una"
              elementos={[
                { etiqueta: 'Unidad', valor: textoUnidad(atencion) },
                atencion.acuerdo_unidad !== null && {
                  etiqueta: 'Fecha',
                  valor: formatearFecha(atencion.fecha_acuerdo_unidad),
                },
                Boolean(atencion.comentarios_acuerdo_unidad) && {
                  etiqueta: 'Comentarios',
                  valor: <span className={estilos.textoLargo}>{atencion.comentarios_acuerdo_unidad}</span>,
                },
              ]}
            />
            <AvisoEnLinea tono="info">
              El acuerdo de la unidad no sustituye la conformidad del jefe de sección ni cierra la atención.
            </AvisoEnLinea>
          </Tarjeta>
        </div>
      ) : (
        // Sin solicitud de unidad no hay acuerdo que mostrar junto a «Ejecución»: antes esto dejaba una
        // tarjeta «Origen» que solo repetía el dato que ya está en la lista de arriba de la ficha.
        tarjetaEjecucion
      )}

      {atencion.es_riesgo && (
        <Tarjeta
          titulo={
            atencion.verificaciones_seguridad?.length ? 'Seguridad verificada' : 'Seguridad pendiente de verificar'
          }
          relleno="amplio"
        >
          {!atencion.verificaciones_seguridad?.length && (
            <p>El jefe de sección o el ingeniero de campo deben registrar la verificación para habilitar el inicio.</p>
          )}
          {[...(atencion.verificaciones_seguridad ?? [])].reverse().map((v) => (
            <ListaDescripcion
              key={v.id}
              elementos={[
                {
                  etiqueta: 'EPP y medidas de seguridad',
                  valor: <span className={estilos.textoLargo}>{v.medidas}</span>,
                  ancho: true,
                },
                { etiqueta: 'Verificada por', valor: v.usuario_nombre },
                { etiqueta: 'Fecha de verificación', valor: formatearFechaHora(v.fecha_creacion) },
              ]}
            />
          ))}
        </Tarjeta>
      )}

      <SeccionConformidad atencion={atencion} />

      <Tarjeta
        titulo="Espacios y ejemplares"
        relleno="amplio"
        acciones={
          <span className={estilos.ayuda}>
            {atencion.alcances.length} {atencion.alcances.length === 1 ? 'elemento' : 'elementos'}
          </span>
        }
      >
        <TablaDatos
          titulo="Espacios y ejemplares de la atención"
          columnas={COLUMNAS_ALCANCES}
          filas={atencion.alcances}
          claveFila={(a) => String(a.id)}
        />
      </Tarjeta>

      {atencion.productos.length > 0 && (
        <Tarjeta
          titulo="Productos aplicados"
          relleno="amplio"
          acciones={
            <span className={estilos.ayuda}>
              {atencion.productos.length} {atencion.productos.length === 1 ? 'producto' : 'productos'}
            </span>
          }
        >
          <TablaDatos
            titulo="Productos aplicados en la atención"
            columnas={COLUMNAS_PRODUCTOS}
            filas={atencion.productos}
            claveFila={(p) => String(p.id)}
          />
        </Tarjeta>
      )}

      {atencion.plagas.length > 0 && (
        <Tarjeta
          titulo="Plagas controladas"
          relleno="amplio"
          acciones={
            <span className={estilos.ayuda}>
              {atencion.plagas.length} {atencion.plagas.length === 1 ? 'plaga' : 'plagas'}
            </span>
          }
        >
          <TablaDatos
            titulo="Plagas controladas en la atención"
            columnas={COLUMNAS_PLAGAS}
            filas={atencion.plagas}
            claveFila={(p) => String(p.id)}
          />
        </Tarjeta>
      )}

      <DocumentosProveedor atencion={atencion} version={versionDocumentos} />

      <Tarjeta titulo="Historial de estados" relleno="amplio">
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
      </Tarjeta>

      {/* RF-T-007 y RF-T-008: componentes comunes de MOD-01, con la sesión de MOD-01. */}
      <Tarjeta relleno="amplio" etiqueta="Evidencias de la atención">
        <Adjuntos entidad="atencion" registroId={atencion.id} puedeAdjuntar={puedeAdjuntar} />
      </Tarjeta>

      <Tarjeta relleno="amplio" etiqueta="Historial de cambios de la atención">
        <HistorialCambios entidad="atencion" registroId={atencion.id} />
      </Tarjeta>
    </>
  )
}
