// RF-INV-011 · Ejemplares con atención especial
/**
 * Ejemplares marcados con atención fitosanitaria especial (Guía Web 6: listado con filtros).
 *
 * - Búsqueda, plaga y estado se filtran en el servidor; los filtros y la página viven en la URL.
 * - Acción primaria «Marcar ejemplar»: los tres roles del módulo.
 */
import { useCallback, useState } from 'react'
import { useLocation } from 'react-router'
import AvisoTemporal from '../../../components/ui/AvisoTemporal'
import Badge from '../../../components/ui/Badge'
import Boton, { BotonEnlace } from '../../../components/ui/Boton'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import Selector, { OPCION_TODOS } from '../../../components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '../../../components/ui/TablaDatos'
import { puedeMarcarAtencionEspecial } from '../../../config/permisosMaestros'
import { useConsulta } from '../../../hooks/useConsulta'
import { useFiltrosUrl } from '../../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS } from '../../../router/rutasApp'
import { listarAtencionesEspeciales, listarPlagas } from '../../../services/api/maestrosTercerizados'
import { listarTodo } from '../../../services/api/tercerizados'
import { useSesionTercerizados } from '../../../sesion/ContextoSesionTercerizados'
import type { AtencionEspecial, EstadoAtencionEspecial } from '../../../types/maestrosTercerizados'
import { formatearNumero, SIN_VALOR } from '../../../utils/formato'
import { textoAplicaciones } from '../../../utils/validacionMaestros'
import BarraFiltros from './BarraFiltros'
import {
  avisoDeNavegacion,
  FILTROS_MAESTROS_VACIOS,
  paginaDe,
  POR_PAGINA,
  type ClaveFiltroMaestros,
} from './filtrosMaestros'
import estilos from './Maestros.module.css'

const TITULO = 'Ejemplares con atención especial'

const ESTADOS: EstadoAtencionEspecial[] = ['En seguimiento', 'Aplicaciones completas']

const COLUMNAS: ColumnaTabla<AtencionEspecial>[] = [
  {
    clave: 'ejemplar',
    titulo: 'Ejemplar',
    multilinea: true,
    render: (e) => (
      <>
        {e.ejemplar_codigo}
        {e.area_verde_nombre && (
          <>
            <br />
            <span className={estilos.ayuda}>{e.area_verde_nombre}</span>
          </>
        )}
      </>
    ),
  },
  { clave: 'plaga', titulo: 'Plaga', render: (e) => e.plaga_nombre },
  {
    clave: 'aplicaciones',
    titulo: 'Aplicaciones adicionales',
    render: (e) => <span className={estilos.cifra}>{textoAplicaciones(e.aplicaciones_realizadas, e.aplicaciones_adicionales)}</span>,
  },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (e) =>
      e.estado === 'Aplicaciones completas' ? (
        <Badge tono="exito" texto="Aplicaciones completas" />
      ) : (
        <Badge tono="info" texto="En seguimiento" />
      ),
  },
]

export default function AtencionEspecialPage() {
  usePaginaActual(TITULO, [MIGAS_TERCERIZADOS.serviciosTercerizados, MIGAS_TERCERIZADOS.controlFitosanitario, { texto: 'Atención especial' }])
  const { state } = useLocation()
  const { estado: sesion } = useSesionTercerizados()
  const puedeMarcar = puedeMarcarAtencionEspecial(sesion.tipo === 'activa' ? sesion.usuario.rol : null)
  const [aviso, setAviso] = useState<string | null>(() => avisoDeNavegacion(state))
  const cerrarAviso = useCallback(() => setAviso(null), [])

  const { filtros, establecer } = useFiltrosUrl<ClaveFiltroMaestros>(FILTROS_MAESTROS_VACIOS)
  const pagina = paginaDe(filtros.pagina)
  const q = filtros.q
  const plagaId = Number.isInteger(Number(filtros.plaga)) && Number(filtros.plaga) > 0 ? Number(filtros.plaga) : undefined
  const estado = ESTADOS.find((e) => e === filtros.estado)
  const conFiltros = Boolean(q) || plagaId !== undefined || estado !== undefined

  const consulta = useConsulta(
    JSON.stringify([q, plagaId, estado, pagina]),
    (signal) => listarAtencionesEspeciales({ q: q || undefined, plaga_id: plagaId, estado }, pagina, signal),
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
    establecer({ q: null, plaga: null, estado: null, pagina: null })
  }

  return (
    <div className={estilos.pagina}>
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
      <div className={estilos.barraAcciones}>
        <p className={estilos.descripcion}>Árboles con plaga recurrente y el avance de sus aplicaciones adicionales.</p>
        {puedeMarcar && (
          <BotonEnlace to={RUTAS_TERCERIZADOS.marcarEjemplar} variante="primario">
            Marcar ejemplar
          </BotonEnlace>
        )}
      </div>

      <BarraFiltros
        id="especiales"
        nombre="Filtrar ejemplares con atención especial"
        etiquetaBusqueda="Buscar ejemplares"
        ayudaBusqueda="Código del ejemplar, plaga o área verde"
        q={q}
        onBuscar={(texto) => aplicar({ q: texto || null })}
      >
        <Selector
          id="especiales-plaga"
          etiqueta="Plaga"
          valor={plagaId ? String(plagaId) : ''}
          opciones={(plagas.datos?.resultados ?? []).map((p) => ({ valor: String(p.id), texto: p.nombre }))}
          opcionTodos={OPCION_TODOS}
          bloqueadoMotivo={plagas.estado === 'error' ? 'No se pudo cargar el catálogo de plagas. Recarga la página' : undefined}
          onCambiar={(valor) => aplicar({ plaga: valor || null })}
        />
        <Selector
          id="especiales-estado"
          etiqueta="Estado"
          valor={estado ?? ''}
          opciones={ESTADOS.map((e) => ({ valor: e, texto: e }))}
          opcionTodos={OPCION_TODOS}
          onCambiar={(valor) => aplicar({ estado: valor || null })}
        />
      </BarraFiltros>

      {conFiltros && (
        <div>
          <Boton variante="terciario" onClick={limpiar}>
            Limpiar filtros
          </Boton>
        </div>
      )}

      <p className={`${estilos.resumenResultados} cifra`} aria-live="polite">
        {consulta.estado === 'exito' || consulta.estado === 'vacio'
          ? `${formatearNumero(total)} ${total === 1 ? 'ejemplar' : 'ejemplares'}${conFiltros ? ' con estos filtros' : ''}`
          : ''}
      </p>

      {paginaInexistente ? (
        <EstadoVacio
          titulo="Esta página ya no tiene ejemplares"
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
          claveFila={(e) => String(e.id)}
          estado={estadoTabla === 'inactivo' ? 'cargando' : estadoTabla}
          paginacionServidor={{
            pagina,
            total,
            porPagina: POR_PAGINA,
            onCambiarPagina: (nueva) => establecer({ pagina: nueva > 1 ? String(nueva) : null }),
          }}
          vacio={
            conFiltros
              ? {
                  titulo: 'Sin ejemplares con estos filtros',
                  descripcion: 'Prueba con otra búsqueda o quita algún filtro.',
                  accion: (
                    <Boton variante="secundario" onClick={limpiar}>
                      Limpiar filtros
                    </Boton>
                  ),
                }
              : {
                  titulo: 'Aún no hay ejemplares con atención especial',
                  descripcion: 'Marca los árboles con plaga recurrente para que no se pierdan entre los miles del catastro.',
                  accion: puedeMarcar ? (
                    <BotonEnlace to={RUTAS_TERCERIZADOS.marcarEjemplar} variante="secundario">
                      Marcar ejemplar
                    </BotonEnlace>
                  ) : undefined,
                }
          }
          error={{
            titulo: 'No pudimos cargar los ejemplares',
            descripcion: consulta.error?.detalle ?? SIN_VALOR,
            onReintentar: consulta.reintentar,
          }}
        />
      )}
    </div>
  )
}
