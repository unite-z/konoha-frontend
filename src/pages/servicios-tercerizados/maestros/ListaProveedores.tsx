// RF-SER-001 · Lista de proveedores
import Badge from '../../../components/ui/Badge'
import Boton, { BotonEnlace } from '../../../components/ui/Boton'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import Selector, { OPCION_TODOS } from '../../../components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '../../../components/ui/TablaDatos'
import { useConsulta } from '../../../hooks/useConsulta'
import { RUTAS_TERCERIZADOS } from '../../../router/rutasApp'
import { listarProveedoresMaestro } from '../../../services/api/maestrosTercerizados'
import type { ProveedorMaestro, TipoVinculo } from '../../../types/maestrosTercerizados'
import { formatearNumero, SIN_VALOR } from '../../../utils/formato'
import { OPCIONES_VINCULO, textoVinculo } from '../../../utils/validacionMaestros'
import BarraFiltros from './BarraFiltros'
import { paginaDe, POR_PAGINA, type EstablecerFiltros, type FiltrosMaestros } from './filtrosMaestros'
import estilos from './Maestros.module.css'

const OPCIONES_ESTADO = [
  { valor: 'habilitado', texto: 'Habilitado' },
  { valor: 'inhabilitado', texto: 'Inhabilitado' },
]

const COLUMNAS: ColumnaTabla<ProveedorMaestro>[] = [
  { clave: 'razon_social', titulo: 'Proveedor', multilinea: true, render: (p) => p.razon_social },
  { clave: 'ruc', titulo: 'RUC', render: (p) => <span className={estilos.cifra}>{p.ruc ?? SIN_VALOR}</span> },
  { clave: 'contacto', titulo: 'Contacto', multilinea: true, render: (p) => p.contacto || SIN_VALOR },
  { clave: 'vinculo', titulo: 'Vínculo', multilinea: true, render: (p) => textoVinculo(p) },
  { clave: 'contratos', titulo: 'Contratos', alineacion: 'derecha', render: (p) => formatearNumero(p.contratos) },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (p) => <Badge tono={p.activo ? 'exito' : 'neutral'} texto={p.activo ? 'Habilitado' : 'Inhabilitado'} />,
  },
]

export interface ListaProps {
  filtros: FiltrosMaestros
  establecer: EstablecerFiltros
  /** `true` si el usuario puede registrar (muestra la acción en el estado vacío). */
  puedeRegistrar: boolean
}

export default function ListaProveedores({ filtros, establecer, puedeRegistrar }: ListaProps) {
  const pagina = paginaDe(filtros.pagina)
  const q = filtros.q
  const activo = filtros.estado === 'habilitado' ? true : filtros.estado === 'inhabilitado' ? false : undefined
  const vinculo = OPCIONES_VINCULO.find((o) => o.valor === filtros.vinculo)?.valor as TipoVinculo | undefined
  const conFiltros = Boolean(q) || activo !== undefined || vinculo !== undefined

  const consulta = useConsulta(
    JSON.stringify([q, activo, vinculo, pagina]),
    (signal) => listarProveedoresMaestro({ q: q || undefined, activo, tipo_vinculo: vinculo }, pagina, signal),
    (datos) => datos.results.length === 0,
  )

  const total = consulta.datos?.count ?? 0
  // Mientras carga sin superar el umbral, se mantienen los datos anteriores (sin parpadeo).
  const estadoTabla =
    consulta.estado === 'cargando' ? (consulta.cargaVisible || !consulta.datos ? 'cargando' : 'exito') : consulta.estado
  const paginaInexistente = consulta.estado === 'error' && consulta.error?.estado === 404 && pagina > 1

  function aplicar(cambios: Parameters<EstablecerFiltros>[0]) {
    establecer({ ...cambios, pagina: null })
  }

  function limpiar() {
    establecer({ q: null, estado: null, vinculo: null, pagina: null })
  }

  return (
    <>
      <BarraFiltros
        id="proveedores"
        nombre="Filtrar proveedores"
        etiquetaBusqueda="Buscar proveedores"
        ayudaBusqueda="Razón social o RUC"
        q={q}
        onBuscar={(texto) => aplicar({ q: texto || null })}
      >
        <Selector
          id="proveedores-estado"
          etiqueta="Estado"
          valor={filtros.estado}
          opciones={OPCIONES_ESTADO}
          opcionTodos={OPCION_TODOS}
          onCambiar={(valor) => aplicar({ estado: valor || null })}
        />
        <Selector
          id="proveedores-vinculo"
          etiqueta="Vínculo"
          valor={vinculo ?? ''}
          opciones={OPCIONES_VINCULO.map((o) => ({ valor: o.valor, texto: o.texto }))}
          opcionTodos={OPCION_TODOS}
          onCambiar={(valor) => aplicar({ vinculo: valor || null })}
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
          ? `${formatearNumero(total)} ${total === 1 ? 'proveedor' : 'proveedores'}${conFiltros ? ' con estos filtros' : ''}`
          : ''}
      </p>

      {paginaInexistente ? (
        <EstadoVacio
          titulo="Esta página ya no tiene proveedores"
          descripcion="Los resultados cambiaron desde que se abrió la lista."
          accion={
            <Boton variante="secundario" onClick={() => establecer({ pagina: null })}>
              Ir a la primera página
            </Boton>
          }
        />
      ) : (
        <TablaDatos
          titulo="Proveedores"
          columnas={COLUMNAS}
          filas={consulta.datos?.results ?? []}
          claveFila={(p) => String(p.id)}
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
                  titulo: 'Sin proveedores con estos filtros',
                  descripcion: 'Prueba con otra búsqueda o quita algún filtro.',
                  accion: (
                    <Boton variante="secundario" onClick={limpiar}>
                      Limpiar filtros
                    </Boton>
                  ),
                }
              : {
                  titulo: 'Aún no hay proveedores registrados',
                  descripcion: 'Aparecerán aquí cuando el jefe de sección registre el primero.',
                  accion: puedeRegistrar ? (
                    <BotonEnlace to={RUTAS_TERCERIZADOS.nuevoProveedor} variante="secundario">
                      Registrar proveedor
                    </BotonEnlace>
                  ) : undefined,
                }
          }
          error={{
            titulo: 'No pudimos cargar los proveedores',
            descripcion: consulta.error?.detalle ?? '',
            onReintentar: consulta.reintentar,
          }}
        />
      )}
    </>
  )
}
