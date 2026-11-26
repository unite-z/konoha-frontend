/** Vista «Lista» de Cuadrillas: los encargos con los filtros actuales (modalidad, «Solo vencidos», Desde y Hasta) en la URL. */
import Boton from '@/design-system/Boton'
import CampoFormulario from '@/design-system/CampoFormulario'
import Estado from '@/design-system/Estado'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import Paginacion from '@/design-system/Paginacion'
import Selector from '@/design-system/Selector'
import { tonosEncargo } from '@/pages/operacion-campo/tonosEncargo'
import { useListadoCampo } from '@/pages/operacion-campo/useCampo'
import type { EncargoCampo } from '@/types/operacionCampo'
import { formatearFecha } from '@/utils/formato'
import { estiloTransicion, fila } from '@/rediseno/base/movimiento'
import estilos from './Cuadrillas.module.css'

const POR_PAGINA = 25
const FILTROS = ['periodicidad', 'desde', 'hasta', 'vencidos']
const SIN_FILTROS = { periodicidad: '', desde: '', hasta: '', vencidos: '' }

export default function ListaEncargos({ abierto, onAbrir }: { abierto: number | null; onAbrir: (id: number) => void }) {
  const listado = useListadoCampo<EncargoCampo>('encargos', FILTROS)
  const { consulta, params, filtrar, pagina, cambiarPagina } = listado
  const hayFiltros = FILTROS.some((f) => params[f])
  let cuerpo
  if (consulta.error?.estado === 403 && !consulta.datos) {
    cuerpo = (
      <EstadoSinAcceso
        nivel={3}
        titulo="No puedes ver los encargos"
        descripcion="El servidor no permite consultarlos con tu cuenta."
      />
    )
  } else if (consulta.estado === 'error' && !consulta.datos) {
    cuerpo = (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar los encargos"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (!consulta.datos) {
    cuerpo = <EstadoCarga forma="tarjetas" texto="Cargando los encargos…" />
  } else if (consulta.datos.results.length === 0) {
    cuerpo = (
      <EstadoVacio
        nivel={3}
        titulo="No hay encargos con estos filtros"
        descripcion="Cuando haya encargos que cumplan los filtros aparecerán aquí."
        accion={
          hayFiltros && (
            <Boton variante="fantasma" onClick={() => filtrar(SIN_FILTROS)}>
              Limpiar filtros
            </Boton>
          )
        }
      />
    )
  } else {
    cuerpo = (
      <>
        <ul className={estilos.lista}>
          {consulta.datos.results.map((e) => (
            <li
              key={e.id}
              className={estilos.itemLista}
              data-vencido={e.vencido || undefined}
              style={abierto === e.id ? undefined : estiloTransicion(fila(e.id))} // estilo-calculado
            >
              <div>
                <Boton
                  variante="enlace"
                  onClick={() => onAbrir(e.id)}
                  aria-label={`Abrir el encargo ${e.id}: ${e.descripcion}`}
                >
                  {e.descripcion}
                </Boton>
                <p className={estilos.tarjetaDetalle}>
                  {e.cuadrilla_nombre} · {e.tipo_actividad_nombre} · {e.area_verde_nombre}
                </p>
                <p className={estilos.tarjetaDetalle}>
                  {e.periodicidad} · plazo {formatearFecha(e.plazo_previsto)}
                </p>
              </div>
              {e.vencido ? (
                <Estado tono="error" texto="Vencido" />
              ) : (
                <Estado tono={tonosEncargo[e.estado]} texto={e.estado} />
              )}
            </li>
          ))}
        </ul>
        <Paginacion pagina={pagina} porPagina={POR_PAGINA} total={consulta.datos.count} onCambiar={cambiarPagina} />
      </>
    )
  }
  return (
    <div className={estilos.vidrio}>
      <div className={estilos.filtros}>
        <Selector
          id="cuadrillas-modalidad"
          etiqueta="Modalidad"
          valor={String(params.periodicidad ?? '')}
          opciones={['Semanal', 'Quincenal', 'Directo'].map((m) => ({ valor: m, texto: m }))}
          opcionTodos="Todos"
          onCambiar={(periodicidad) => filtrar({ periodicidad })}
        />
        <Selector
          id="cuadrillas-vencimiento"
          etiqueta="Vencimiento"
          valor={String(params.vencidos ?? '')}
          opciones={[{ valor: 'true', texto: 'Solo vencidos' }]}
          opcionTodos="Todos"
          onCambiar={(vencidos) => filtrar({ vencidos })}
        />
        <CampoFormulario
          id="cuadrillas-desde"
          etiqueta="Desde"
          type="date"
          value={String(params.desde ?? '')}
          onChange={(e) => filtrar({ desde: e.target.value })}
        />
        <CampoFormulario
          id="cuadrillas-hasta"
          etiqueta="Hasta"
          type="date"
          value={String(params.hasta ?? '')}
          onChange={(e) => filtrar({ hasta: e.target.value })}
        />
        <Boton variante="fantasma" onClick={() => filtrar(SIN_FILTROS)}>
          Limpiar filtros
        </Boton>
      </div>
      {cuerpo}
    </div>
  )
}
