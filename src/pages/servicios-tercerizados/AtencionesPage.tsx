// RF-SER-003 a 006 y 011 · Bandeja de atenciones tercerizadas
/**
 * Bandeja de atenciones (Guía Web 6: listado con filtros; figura 19: bandeja de requerimientos).
 *
 * - Filtros reales del servidor: búsqueda `q`, estado, origen y contrato. Nunca se filtra solo la página
 *   cargada. Los filtros y la página viven en la URL: se conservan al volver de la ficha.
 * - Paginación del servidor (25 por página).
 * - Estados: carga (> 300 ms), vacío (con o sin filtros), error con «Reintentar» y página inexistente.
 *
 * Acción primaria «Registrar atención»: solo el jefe de sección.
 */
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Badge from '../../components/ui/Badge'
import Boton, { BotonEnlace } from '../../components/ui/Boton'
import CampoFormulario from '../../components/ui/CampoFormulario'
import { ChipsFiltrosActivos, GrupoChips, type FiltroActivo } from '../../components/ui/ChipsFiltro'
import EstadoVacio from '../../components/ui/EstadoVacio'
import Selector, { OPCION_TODOS, type OpcionSelector } from '../../components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '../../components/ui/TablaDatos'
import { useConsulta } from '../../hooks/useConsulta'
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { puedeRegistrarAtencion } from '../../config/permisosTercerizados'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS, rutaDetalleAtencion } from '../../router/rutasApp'
import { useSesionTercerizados } from '../../sesion/ContextoSesionTercerizados'
import { listarAtenciones, listarTodosLosContratos } from '../../services/api/tercerizados'
import type { Atencion, Contrato } from '../../types/tercerizados'
import {
  ESTADOS_ATENCION,
  OPCIONES_ORIGEN,
  codigoCorto,
  insigniaEstado,
  resumenAlcances,
  textoOrigen,
} from '../../utils/estadosTercerizados'
import {
  FILTROS_BANDEJA_VACIOS,
  LARGO_MAXIMO_BUSQUEDA,
  hayFiltros,
  leerFiltrosBandeja,
  type ClaveFiltroBandeja,
} from '../../utils/filtrosBandeja'
import { formatearFecha, formatearNumero, SIN_VALOR } from '../../utils/formato'
import estilos from './Tercerizados.module.css'

const TITULO = 'Atenciones tercerizadas'

/** Tamaño de página de la API (`Paginacion.page_size`). */
const POR_PAGINA = 25

const ID_BUSQUEDA = 'filtro-busqueda'

/** Estado que la ficha recibe para volver a la bandeja con los mismos filtros. */
export interface EstadoNavegacionBandeja {
  volverA: string
}

const OPCIONES_ESTADO = [
  { valor: '', texto: 'Todos' },
  ...ESTADOS_ATENCION.map((estado) => ({ valor: estado, texto: estado })),
]

function textoContrato(contrato: Contrato): string {
  return contrato.proveedor_nombre ? `${contrato.numero} · ${contrato.proveedor_nombre}` : contrato.numero
}

const COLUMNAS: ColumnaTabla<Atencion>[] = [
  {
    clave: 'codigo',
    titulo: 'Código',
    render: (a) => (
      <span className={estilos.celdaCodigo} title={a.codigo}>
        {codigoCorto(a.codigo)}
      </span>
    ),
  },
  {
    clave: 'descripcion',
    titulo: 'Descripción',
    multilinea: true,
    render: (a) => <span className={estilos.celdaDescripcion}>{a.descripcion}</span>,
  },
  { clave: 'servicio', titulo: 'Servicio', render: (a) => a.tipo_servicio_nombre ?? SIN_VALOR },
  {
    clave: 'proveedor',
    titulo: 'Proveedor',
    subtitulo: 'Contrato',
    multilinea: true,
    render: (a) => (
      <>
        {a.proveedor_nombre ?? SIN_VALOR}
        <br />
        <span className={estilos.ayuda}>{a.contrato_numero ?? SIN_VALOR}</span>
      </>
    ),
  },
  {
    clave: 'origen',
    titulo: 'Origen',
    multilinea: true,
    render: (a) => (
      <>
        {textoOrigen(a.origen)}
        {a.unidad_solicitante_nombre && (
          <>
            <br />
            <span className={estilos.ayuda}>{a.unidad_solicitante_nombre}</span>
          </>
        )}
      </>
    ),
  },
  { clave: 'oc', titulo: 'Orden de compra', render: (a) => a.numero_orden_compra || SIN_VALOR },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (a) => (
      <span className={estilos.enLinea}>
        <Badge {...insigniaEstado(a.estado)} />
        {a.es_riesgo && <Badge tono="advertencia" texto="Riesgo" />}
      </span>
    ),
  },
  { clave: 'alcances', titulo: 'Alcance', multilinea: true, render: (a) => resumenAlcances(a.alcances) },
  { clave: 'registro', titulo: 'Registrada', render: (a) => formatearFecha(a.fecha_creacion) },
]

export default function AtencionesPage() {
  usePaginaActual(TITULO, [MIGAS_TERCERIZADOS.serviciosTercerizados, { texto: 'Atenciones' }])
  const navegar = useNavigate()
  const { search } = useLocation()
  const { estado: sesion } = useSesionTercerizados()
  const esJefe = puedeRegistrarAtencion(sesion.tipo === 'activa' ? sesion.usuario.rol : null)

  const { filtros: url, establecer } = useFiltrosUrl<ClaveFiltroBandeja>(FILTROS_BANDEJA_VACIOS)
  const { filtros, pagina } = leerFiltrosBandeja(url)
  const claveConsulta = JSON.stringify([filtros, pagina])
  const conFiltros = hayFiltros(filtros)

  const consulta = useConsulta(
    claveConsulta,
    (signal) => listarAtenciones(filtros, pagina, signal),
    (datos) => datos.results.length === 0,
  )

  const contratos = useConsulta('contratos', (signal) => listarTodosLosContratos(signal))
  const opcionesContrato: OpcionSelector[] = (contratos.datos?.contratos ?? []).map((c) => ({
    valor: String(c.id),
    texto: textoContrato(c),
  }))
  const contratoAplicado = contratos.datos?.contratos.find((c) => c.id === filtros.contrato_id)

  // Borrador de la búsqueda: se aplica al enviar. Si la URL cambia (chip quitado), el borrador la refleja.
  const [busqueda, setBusqueda] = useState(filtros.q ?? '')
  const [qPrevia, setQPrevia] = useState(filtros.q ?? '')
  if ((filtros.q ?? '') !== qPrevia) {
    setQPrevia(filtros.q ?? '')
    setBusqueda(filtros.q ?? '')
  }

  /** Cambiar un filtro vuelve a la primera página. */
  function aplicar(cambios: Partial<Record<ClaveFiltroBandeja, string | null>>) {
    establecer({ ...cambios, pagina: null })
  }

  function limpiarFiltros() {
    establecer({ q: null, estado: null, origen: null, contrato_id: null, pagina: null })
  }

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const texto = busqueda.trim()
    if (texto === (filtros.q ?? '')) consulta.reintentar()
    else aplicar({ q: texto || null })
  }

  const activos: FiltroActivo[] = [
    filtros.q && { clave: 'q', texto: `Búsqueda: ${filtros.q}` },
    filtros.estado && { clave: 'estado', texto: `Estado: ${filtros.estado}` },
    filtros.origen && { clave: 'origen', texto: `Origen: ${textoOrigen(filtros.origen)}` },
    filtros.contrato_id && {
      clave: 'contrato_id',
      texto: `Contrato: ${contratoAplicado ? textoContrato(contratoAplicado) : `n.º ${filtros.contrato_id}`}`,
    },
  ].filter((f): f is FiltroActivo => Boolean(f))

  const total = consulta.datos?.count ?? 0
  // Mientras carga sin superar el umbral, se mantienen los datos anteriores (sin parpadeo).
  const estadoTabla =
    consulta.estado === 'cargando' ? (consulta.cargaVisible || !consulta.datos ? 'cargando' : 'exito') : consulta.estado
  const paginaInexistente = consulta.estado === 'error' && consulta.error?.estado === 404 && pagina > 1

  return (
    <div className={estilos.pagina}>
      {esJefe && (
        <div className={estilos.barraAcciones}>
          <BotonEnlace to={RUTAS_TERCERIZADOS.nuevaAtencion} variante="primario">
            Registrar atención
          </BotonEnlace>
        </div>
      )}
      <form role="search" aria-label="Filtrar atenciones" className={estilos.barraFiltros} onSubmit={buscar}>
        <div className={estilos.busqueda}>
          <CampoFormulario
            id={ID_BUSQUEDA}
            etiqueta="Buscar atenciones"
            type="search"
            ayuda="Código, descripción, OC, contrato, proveedor, servicio o unidad"
            maxLength={LARGO_MAXIMO_BUSQUEDA}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Selector
          id="filtro-origen"
          etiqueta="Origen"
          valor={filtros.origen ?? ''}
          opciones={OPCIONES_ORIGEN}
          opcionTodos={OPCION_TODOS}
          onCambiar={(valor) => aplicar({ origen: valor || null })}
        />
        <Selector
          id="filtro-contrato"
          etiqueta="Contrato"
          valor={filtros.contrato_id ? String(filtros.contrato_id) : ''}
          opciones={
            contratoAplicado || !filtros.contrato_id
              ? opcionesContrato
              : [...opcionesContrato, { valor: String(filtros.contrato_id), texto: `n.º ${filtros.contrato_id}` }]
          }
          opcionTodos={OPCION_TODOS}
          ayuda={contratos.datos && !contratos.datos.completo ? 'Se muestran los primeros 500 contratos' : undefined}
          bloqueadoMotivo={
            contratos.estado === 'error'
              ? 'No se pudieron cargar los contratos. Recarga la página para filtrar por contrato'
              : contratos.cargaVisible
                ? 'Cargando contratos…'
                : undefined
          }
          onCambiar={(valor) => aplicar({ contrato_id: valor || null })}
        />
        <div className={estilos.accionFiltros}>
          <Boton type="submit" variante="secundario">
            Buscar
          </Boton>
        </div>
      </form>

      <div className={estilos.filaEstados}>
        <span className={estilos.rotulo} aria-hidden="true">
          Estado
        </span>
        <GrupoChips
          etiqueta="Filtrar por estado"
          opciones={OPCIONES_ESTADO}
          valor={filtros.estado ?? ''}
          onCambiar={(valor) => aplicar({ estado: valor || null })}
        />
      </div>

      <ChipsFiltrosActivos
        filtros={activos}
        onQuitar={(clave) => aplicar({ [clave]: null })}
        onLimpiar={limpiarFiltros}
      />

      <p className={`${estilos.resumenResultados} cifra`} aria-live="polite">
        {consulta.estado === 'exito' || consulta.estado === 'vacio'
          ? `${formatearNumero(total)} ${total === 1 ? 'atención' : 'atenciones'}${conFiltros ? ' con estos filtros' : ''}`
          : ''}
      </p>

      {paginaInexistente ? (
        <EstadoVacio
          titulo="Esta página ya no tiene atenciones"
          descripcion="Los resultados cambiaron desde que se abrió la bandeja."
          accion={
            <Boton variante="secundario" onClick={() => establecer({ pagina: null })}>
              Ir a la primera página
            </Boton>
          }
        />
      ) : (
        <TablaDatos
          titulo={TITULO}
          columnas={COLUMNAS}
          filas={consulta.datos?.results ?? []}
          claveFila={(a) => String(a.id)}
          estado={estadoTabla === 'inactivo' ? 'cargando' : estadoTabla}
          onFilaClick={(a) =>
            navegar(rutaDetalleAtencion(a.id), { state: { volverA: search } satisfies EstadoNavegacionBandeja })
          }
          paginacionServidor={{
            pagina,
            total,
            porPagina: POR_PAGINA,
            onCambiarPagina: (nueva) => establecer({ pagina: nueva > 1 ? String(nueva) : null }),
          }}
          vacio={
            conFiltros
              ? {
                  titulo: 'Sin atenciones con estos filtros',
                  descripcion: 'Prueba con otra búsqueda o quita algún filtro.',
                  accion: (
                    <Boton variante="secundario" onClick={limpiarFiltros}>
                      Limpiar filtros
                    </Boton>
                  ),
                }
              : {
                  titulo: 'Aún no hay atenciones tercerizadas',
                  descripcion: 'Aparecerán aquí cuando el jefe de sección registre la primera.',
                  accion: esJefe ? (
                    <BotonEnlace to={RUTAS_TERCERIZADOS.nuevaAtencion} variante="secundario">
                      Registrar atención
                    </BotonEnlace>
                  ) : undefined,
                }
          }
          error={{
            titulo: 'No pudimos cargar las atenciones',
            descripcion: consulta.error?.detalle ?? '',
            onReintentar: consulta.reintentar,
          }}
        />
      )}
    </div>
  )
}
