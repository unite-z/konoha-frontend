// RF-SER-002 · Lista de contratos
import Badge from '../../../components/ui/Badge'
import Boton, { BotonEnlace } from '../../../components/ui/Boton'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import Selector, { OPCION_TODOS } from '../../../components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '../../../components/ui/TablaDatos'
import { useConsulta } from '../../../hooks/useConsulta'
import { RUTAS_TERCERIZADOS } from '../../../router/rutasApp'
import { listarContratosMaestro } from '../../../services/api/maestrosTercerizados'
import type { ContratoMaestro } from '../../../types/maestrosTercerizados'
import { formatearFecha, formatearNumero, SIN_VALOR } from '../../../utils/formato'
import BarraFiltros from './BarraFiltros'
import { paginaDe, POR_PAGINA } from './filtrosMaestros'
import type { ListaProps } from './ListaProveedores'
import estilos from './Maestros.module.css'

const OPCIONES_VIGENCIA = [
  { valor: 'vigente', texto: 'Vigente' },
  { valor: 'vencido', texto: 'Vencido (histórico)' },
]

function textoMonto(monto: string | null): string {
  return monto === null ? SIN_VALOR : `S/ ${formatearNumero(Number(monto), 2)}`
}

const COLUMNAS: ColumnaTabla<ContratoMaestro>[] = [
  { clave: 'numero', titulo: 'Contrato', render: (c) => <span className={estilos.cifra}>{c.numero}</span> },
  { clave: 'proveedor', titulo: 'Proveedor', multilinea: true, render: (c) => c.proveedor_nombre ?? SIN_VALOR },
  { clave: 'servicio', titulo: 'Servicio', multilinea: true, render: (c) => c.tipo_servicio_nombre ?? SIN_VALOR },
  { clave: 'area', titulo: 'Área o metrado estimado', multilinea: true, render: (c) => c.area_metrado_estimado ?? SIN_VALOR },
  { clave: 'monto', titulo: 'Monto fijo', alineacion: 'derecha', render: (c) => <span className={estilos.cifra}>{textoMonto(c.monto_fijo)}</span> },
  { clave: 'frecuencia', titulo: 'Frecuencia', multilinea: true, render: (c) => c.frecuencia_pactada ?? SIN_VALOR },
  {
    clave: 'vigencia',
    titulo: 'Vigencia',
    render: (c) => (
      <span className={estilos.cifra}>
        {formatearFecha(c.vigencia_inicio)} – {formatearFecha(c.vigencia_fin)}
      </span>
    ),
  },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (c) =>
      c.vigente ? (
        <Badge tono="exito" texto="Vigente" />
      ) : (
        <Badge tono="advertencia" texto="Vencido" ayuda="Se conserva como histórico: no se puede usar en nuevas atenciones" />
      ),
  },
]

export default function ListaContratos({ filtros, establecer, puedeRegistrar }: ListaProps) {
  const pagina = paginaDe(filtros.pagina)
  const q = filtros.q
  const vigente = filtros.vigencia === 'vigente' ? true : filtros.vigencia === 'vencido' ? false : undefined
  const conFiltros = Boolean(q) || vigente !== undefined

  const consulta = useConsulta(
    JSON.stringify([q, vigente, pagina]),
    (signal) => listarContratosMaestro({ q: q || undefined, vigente }, pagina, signal),
    (datos) => datos.results.length === 0,
  )

  const total = consulta.datos?.count ?? 0
  const estadoTabla =
    consulta.estado === 'cargando' ? (consulta.cargaVisible || !consulta.datos ? 'cargando' : 'exito') : consulta.estado
  const paginaInexistente = consulta.estado === 'error' && consulta.error?.estado === 404 && pagina > 1

  function limpiar() {
    establecer({ q: null, vigencia: null, pagina: null })
  }

  return (
    <>
      <BarraFiltros
        id="contratos"
        nombre="Filtrar contratos"
        etiquetaBusqueda="Buscar contratos"
        ayudaBusqueda="Número, proveedor o servicio"
        q={q}
        onBuscar={(texto) => establecer({ q: texto || null, pagina: null })}
      >
        <Selector
          id="contratos-vigencia"
          etiqueta="Vigencia"
          valor={filtros.vigencia}
          opciones={OPCIONES_VIGENCIA}
          opcionTodos={OPCION_TODOS}
          onCambiar={(valor) => establecer({ vigencia: valor || null, pagina: null })}
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
          ? `${formatearNumero(total)} ${total === 1 ? 'contrato' : 'contratos'}${conFiltros ? ' con estos filtros' : ''}`
          : ''}
      </p>

      {paginaInexistente ? (
        <EstadoVacio
          titulo="Esta página ya no tiene contratos"
          descripcion="Los resultados cambiaron desde que se abrió la lista."
          accion={
            <Boton variante="secundario" onClick={() => establecer({ pagina: null })}>
              Ir a la primera página
            </Boton>
          }
        />
      ) : (
        <TablaDatos
          titulo="Contratos"
          columnas={COLUMNAS}
          filas={consulta.datos?.results ?? []}
          claveFila={(c) => String(c.id)}
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
                  titulo: 'Sin contratos con estos filtros',
                  descripcion: 'Prueba con otra búsqueda o quita algún filtro.',
                  accion: (
                    <Boton variante="secundario" onClick={limpiar}>
                      Limpiar filtros
                    </Boton>
                  ),
                }
              : {
                  titulo: 'Aún no hay contratos registrados',
                  descripcion: 'Aparecerán aquí cuando el jefe de sección registre el primero.',
                  accion: puedeRegistrar ? (
                    <BotonEnlace to={RUTAS_TERCERIZADOS.nuevoContrato} variante="secundario">
                      Registrar contrato
                    </BotonEnlace>
                  ) : undefined,
                }
          }
          error={{
            titulo: 'No pudimos cargar los contratos',
            descripcion: consulta.error?.detalle ?? '',
            onReintentar: consulta.reintentar,
          }}
        />
      )}
    </>
  )
}
