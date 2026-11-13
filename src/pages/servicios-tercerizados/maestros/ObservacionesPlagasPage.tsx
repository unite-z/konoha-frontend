// RF-FIT-005 · Observaciones de presencia de plagas en espacios o ejemplares
/**
 * Historial autorizado de observaciones (Guía Web 6: listado con filtros).
 *
 * - Búsqueda y plaga se filtran en el servidor; los filtros y la página viven en la URL.
 * - Acción primaria «Registrar observación»: los tres roles del módulo.
 * - No se edita: una corrección se registra como una observación nueva.
 */
import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import { nombreEjemplar } from '@/utils/nombreEjemplar'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Selector, { OPCION_TODOS } from '@/components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { puedeRegistrarObservacionPlaga } from '@/config/permisosMaestros'
import { useConsulta } from '@/hooks/useConsulta'
import { useFiltrosUrl } from '@/hooks/useFiltrosUrl'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_TERCERIZADOS, rutaDetalleObservacionPlaga, RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import { listarObservacionesPlagas, listarPlagas } from '@/services/api/maestrosTercerizados'
import { listarTodo } from '@/services/api/tercerizados'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { ObservacionPlaga } from '@/types/maestrosTercerizados'
import { formatearFecha, formatearNumero, SIN_VALOR } from '@/utils/formato'
import BarraFiltros from './BarraFiltros'
import { avisoDeNavegacion, FILTROS_MAESTROS_VACIOS, paginaDe, POR_PAGINA, type ClaveFiltroMaestros } from './filtrosMaestros'
import estilos from './Maestros.module.css'

const TITULO = 'Observaciones de plagas'

const COLUMNAS: ColumnaTabla<ObservacionPlaga>[] = [
  { clave: 'fecha', titulo: 'Fecha', render: (o) => formatearFecha(o.fecha_observacion) },
  {
    clave: 'destino',
    titulo: 'Espacio o ejemplar',
    render: (o) => o.area_verde_nombre ?? (o.ejemplar_codigo ? nombreEjemplar(o.ejemplar_codigo, o.ejemplar_alias) : SIN_VALOR),
  },
  { clave: 'plaga', titulo: 'Plaga', render: (o) => o.plaga_nombre },
  { clave: 'autor', titulo: 'Registrado por', render: (o) => o.usuario_creacion_nombre },
]

export default function ObservacionesPlagasPage() {
  usePaginaActual(TITULO, [MIGAS_TERCERIZADOS.serviciosTercerizados, MIGAS_TERCERIZADOS.controlFitosanitario, { texto: TITULO }])
  const { state } = useLocation()
  const navegar = useNavigate()
  const permisos = usePermisos()
  const puedeRegistrar = puedeRegistrarObservacionPlaga(permisos)
  const [aviso, setAviso] = useState<string | null>(() => avisoDeNavegacion(state))
  const cerrarAviso = useCallback(() => setAviso(null), [])

  const { filtros, establecer } = useFiltrosUrl<ClaveFiltroMaestros>(FILTROS_MAESTROS_VACIOS)
  const pagina = paginaDe(filtros.pagina)
  const q = filtros.q
  const plagaId = Number.isInteger(Number(filtros.plaga)) && Number(filtros.plaga) > 0 ? Number(filtros.plaga) : undefined
  const conFiltros = Boolean(q) || plagaId !== undefined

  const consulta = useConsulta(
    JSON.stringify([q, plagaId, pagina]),
    (signal) => listarObservacionesPlagas({ q: q || undefined, plaga_id: plagaId }, pagina, signal),
    (datos) => datos.results.length === 0,
  )
  const plagas = useConsulta('plagas', (signal) => listarTodo((page) => listarPlagas({ page }, signal)))

  const total = consulta.datos?.count ?? 0
  const estadoTabla =
    consulta.estado === 'cargando' ? (consulta.cargaVisible || !consulta.datos ? 'cargando' : 'exito') : consulta.estado
  const paginaInexistente = consulta.estado === 'error' && consulta.error?.estado === 404 && pagina > 1

  function aplicar(cambios: Partial<Record<ClaveFiltroMaestros, string | null>>) {
    establecer({ ...cambios, pagina: null })
  }

  function limpiar() {
    establecer({ q: null, plaga: null, pagina: null })
  }

  return (
    <div className={estilos.pagina}>
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
      <AccionesPagina>
        {puedeRegistrar && (
          <BotonEnlace to={RUTAS_TERCERIZADOS.nuevaObservacionPlaga} variante="primario">
            Registrar observación
          </BotonEnlace>
        )}
      </AccionesPagina>
      <p className={estilos.descripcion}>
        Presencia de plagas observada en campo, con su espacio o ejemplar, fecha y autor. Justifica una aplicación o su
        intensidad; no sustituye la evaluación técnica.
      </p>

      <BarraFiltros
        id="observaciones"
        nombre="Filtrar observaciones de plagas"
        etiquetaBusqueda="Buscar observaciones"
        ayudaBusqueda="Plaga, espacio, ejemplar o descripción"
        q={q}
        onBuscar={(texto) => aplicar({ q: texto || null })}
      >
        <Selector
          id="observaciones-plaga"
          etiqueta="Plaga"
          valor={plagaId ? String(plagaId) : ''}
          opciones={(plagas.datos?.resultados ?? []).map((p) => ({ valor: String(p.id), texto: p.nombre }))}
          opcionTodos={OPCION_TODOS}
          bloqueadoMotivo={plagas.estado === 'error' ? 'No se pudo cargar el catálogo de plagas. Recarga la página' : undefined}
          onCambiar={(valor) => aplicar({ plaga: valor || null })}
        />
      </BarraFiltros>

      {conFiltros && (
        <div>
          <Boton variante="fantasma" onClick={limpiar}>
            Limpiar filtros
          </Boton>
        </div>
      )}

      <p className={`${estilos.resumenResultados} cifra`} aria-live="polite">
        {consulta.estado === 'exito' || consulta.estado === 'vacio'
          ? `${formatearNumero(total)} ${total === 1 ? 'observación' : 'observaciones'}${conFiltros ? ' con estos filtros' : ''}`
          : ''}
      </p>

      {paginaInexistente ? (
        <EstadoVacio
          titulo="Esta página ya no tiene observaciones"
          descripcion="Los resultados cambiaron desde que se abrió la lista."
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
          claveFila={(o) => String(o.id)}
          estado={estadoTabla === 'inactivo' ? 'cargando' : estadoTabla}
          onFilaClick={(o) => navegar(rutaDetalleObservacionPlaga(o.id))}
          paginacionServidor={{
            pagina,
            total,
            porPagina: POR_PAGINA,
            onCambiarPagina: (nueva) => establecer({ pagina: nueva > 1 ? String(nueva) : null }),
          }}
          vacio={
            conFiltros
              ? {
                  titulo: 'Sin observaciones con estos filtros',
                  descripcion: 'Prueba con otra búsqueda o quita algún filtro.',
                  accion: (
                    <Boton variante="secundario" onClick={limpiar}>
                      Limpiar filtros
                    </Boton>
                  ),
                }
              : {
                  titulo: 'Aún no hay observaciones registradas',
                  descripcion: 'Registra la presencia de una plaga en un espacio o ejemplar para justificar una aplicación.',
                  accion: puedeRegistrar ? (
                    <BotonEnlace to={RUTAS_TERCERIZADOS.nuevaObservacionPlaga} variante="secundario">
                      Registrar observación
                    </BotonEnlace>
                  ) : undefined,
                }
          }
          error={{
            titulo: 'No pudimos cargar las observaciones',
            descripcion: consulta.error?.detalle ?? SIN_VALOR,
            onReintentar: consulta.reintentar,
          }}
        />
      )}
    </div>
  )
}
