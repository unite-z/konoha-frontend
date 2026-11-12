// RF-FIT-003 · Catálogo de productos agronómicos
/**
 * Productos agronómicos usados en control fitosanitario (Guía Web 6: listado con filtros).
 *
 * - Filtros (búsqueda y estado) y la página viven en la URL.
 * - Acción primaria («Registrar producto»): solo el jefe de sección.
 */
import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Selector, { OPCION_TODOS } from '@/components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { puedeAdministrarProductosAgronomicos } from '@/config/permisosMaestros'
import { useConsulta } from '@/hooks/useConsulta'
import { useFiltrosUrl } from '@/hooks/useFiltrosUrl'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS, rutaDetalleProductoAgronomico } from '@/router/rutasApp'
import { listarProductosAgronomicos } from '@/services/api/maestrosTercerizados'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { ProductoAgronomico } from '@/types/maestrosTercerizados'
import { formatearNumero, SIN_VALOR } from '@/utils/formato'
import BarraFiltros from './BarraFiltros'
import { avisoDeNavegacion, paginaDe, POR_PAGINA } from './filtrosMaestros'
import estilos from './Maestros.module.css'

const TITULO = 'Productos agronómicos'

const OPCIONES_ESTADO = [
  { valor: 'habilitado', texto: 'Habilitado' },
  { valor: 'inhabilitado', texto: 'Inhabilitado' },
]

type ClaveFiltro = 'q' | 'estado' | 'pagina'
const FILTROS_VACIOS: Record<ClaveFiltro, string> = { q: '', estado: '', pagina: '' }

const COLUMNAS: ColumnaTabla<ProductoAgronomico>[] = [
  { clave: 'nombre', titulo: 'Producto', multilinea: true, render: (p) => p.nombre },
  { clave: 'principio_activo', titulo: 'Principio activo', multilinea: true, render: (p) => p.principio_activo || SIN_VALOR },
  { clave: 'presentacion', titulo: 'Presentación', multilinea: true, render: (p) => p.presentacion || SIN_VALOR },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (p) => <Estado tono={p.activo ? 'exito' : 'neutro'} texto={p.activo ? 'Habilitado' : 'Inhabilitado'} />,
  },
]

export default function ProductosAgronomicosPage() {
  usePaginaActual(TITULO, [MIGAS_TERCERIZADOS.serviciosTercerizados, { texto: TITULO }])
  const { state } = useLocation()
  const navegar = useNavigate()
  const { search } = useLocation()
  const permisos = usePermisos()
  const puedeRegistrar = puedeAdministrarProductosAgronomicos(permisos)
  const [aviso, setAviso] = useState<string | null>(() => avisoDeNavegacion(state))
  const cerrarAviso = useCallback(() => setAviso(null), [])

  const { filtros, establecer } = useFiltrosUrl<ClaveFiltro>(FILTROS_VACIOS)
  const pagina = paginaDe(filtros.pagina)
  const q = filtros.q
  const activo = filtros.estado === 'habilitado' ? true : filtros.estado === 'inhabilitado' ? false : undefined
  const conFiltros = Boolean(q) || activo !== undefined

  const consulta = useConsulta(
    JSON.stringify([q, activo, pagina]),
    (signal) => listarProductosAgronomicos({ q: q || undefined, activo }, pagina, signal),
    (datos) => datos.results.length === 0,
  )

  const total = consulta.datos?.count ?? 0
  const estadoTabla =
    consulta.estado === 'cargando' ? (consulta.cargaVisible || !consulta.datos ? 'cargando' : 'exito') : consulta.estado
  const paginaInexistente = consulta.estado === 'error' && consulta.error?.estado === 404 && pagina > 1

  function aplicar(cambios: Partial<Record<ClaveFiltro, string | null>>) {
    establecer({ ...cambios, pagina: null })
  }

  function limpiar() {
    establecer({ q: null, estado: null, pagina: null })
  }

  return (
    <div className={estilos.pagina}>
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
      <AccionesPagina>
        {puedeRegistrar && (
          <BotonEnlace to={RUTAS_TERCERIZADOS.nuevoProductoAgronomico} variante="primario">
            Registrar producto
          </BotonEnlace>
        )}
      </AccionesPagina>
      <p className={estilos.descripcion}>Productos agronómicos que se pueden aplicar al registrar atenciones de control fitosanitario.</p>

      <BarraFiltros
        id="productos-agronomicos"
        nombre="Filtrar productos agronómicos"
        etiquetaBusqueda="Buscar productos"
        ayudaBusqueda="Nombre o principio activo"
        q={q}
        onBuscar={(texto) => aplicar({ q: texto || null })}
      >
        <Selector
          id="productos-agronomicos-estado"
          etiqueta="Estado"
          valor={filtros.estado}
          opciones={OPCIONES_ESTADO}
          opcionTodos={OPCION_TODOS}
          onCambiar={(valor) => aplicar({ estado: valor || null })}
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
          ? `${formatearNumero(total)} ${total === 1 ? 'producto' : 'productos'}${conFiltros ? ' con estos filtros' : ''}`
          : ''}
      </p>

      {paginaInexistente ? (
        <EstadoVacio
          titulo="Esta página ya no tiene productos"
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
          claveFila={(p) => String(p.id)}
          estado={estadoTabla === 'inactivo' ? 'cargando' : estadoTabla}
          onFilaClick={(p) => navegar(rutaDetalleProductoAgronomico(p.id), { state: { volverA: search } })}
          paginacionServidor={{
            pagina,
            total,
            porPagina: POR_PAGINA,
            onCambiarPagina: (nueva) => establecer({ pagina: nueva > 1 ? String(nueva) : null }),
          }}
          vacio={
            conFiltros
              ? {
                  titulo: 'Sin productos con estos filtros',
                  descripcion: 'Prueba con otra búsqueda o quita algún filtro.',
                  accion: (
                    <Boton variante="secundario" onClick={limpiar}>
                      Limpiar filtros
                    </Boton>
                  ),
                }
              : {
                  titulo: 'Aún no hay productos registrados',
                  descripcion: 'Aparecerán aquí cuando el jefe de sección registre el primero.',
                  accion: puedeRegistrar ? (
                    <BotonEnlace to={RUTAS_TERCERIZADOS.nuevoProductoAgronomico} variante="secundario">
                      Registrar producto
                    </BotonEnlace>
                  ) : undefined,
                }
          }
          error={{
            titulo: 'No pudimos cargar los productos',
            descripcion: consulta.error?.detalle ?? '',
            onReintentar: consulta.reintentar,
          }}
        />
      )}
    </div>
  )
}
