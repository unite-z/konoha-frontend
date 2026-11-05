import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Selector from '@/components/ui/Selector'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { todosCampo } from '@/services/api/operacionCampo'
import type { ActividadCampo, CuadrillaCampo } from '@/types/operacionCampo'
import { formatearFechaHora } from '@/utils/formato'
import { EstadoCatalogos, TablaCampo } from './ComponentesCampo'
import { useListadoCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'

type ActividadListado = ActividadCampo & { fecha_hora_registro: string | null }

export default function ActividadesPage() {
  usePaginaActual('Actividades por cuadrilla', [{ texto: 'Operación de campo' }, { texto: 'Actividades por cuadrilla' }])
  const listado = useListadoCampo<ActividadListado>('actividades', ['cuadrilla_id', 'fecha'])
  const cuadrillas = useConsulta('cuadrillas-consulta-actividades', signal =>
    todosCampo<CuadrillaCampo>('cuadrillas/', {}, signal),
  )

  return <div className={estilos.pagina}>
    <Tarjeta>
      <div className={estilos.filtros}>
        <EstadoCatalogos consulta={cuadrillas}>
          {opciones => <Selector
            id="actividad-cuadrilla"
            etiqueta="Cuadrilla"
            valor={String(listado.params.cuadrilla_id ?? '')}
            opciones={opciones.map(cuadrilla => ({ valor: String(cuadrilla.id), texto: cuadrilla.nombre }))}
            opcionTodos="Todas"
            onCambiar={cuadrilla_id => listado.filtrar({ cuadrilla_id })}
          />}
        </EstadoCatalogos>
        <CampoFormulario
          id="actividad-fecha"
          etiqueta="Fecha del parte"
          type="date"
          value={String(listado.params.fecha ?? '')}
          onChange={evento => listado.filtrar({ fecha: evento.target.value })}
        />
        <Boton variante="fantasma" onClick={listado.consulta.reintentar}>Actualizar</Boton>
      </div>
    </Tarjeta>
    <TablaCampo titulo="Actividades registradas" listado={listado} vacio="No hay actividades con estos filtros" columnas={[
      { clave: 'cuadrilla_nombre', titulo: 'Cuadrilla', render: fila => fila.cuadrilla_nombre },
      { clave: 'tipo_actividad_nombre', titulo: 'Actividad', render: fila => fila.tipo_actividad_nombre },
      { clave: 'area_verde_nombre', titulo: 'Espacio', render: fila => fila.area_verde_nombre },
      { clave: 'fecha_hora_actividad', titulo: 'Ejecución (Lima)', render: fila => formatearFechaHora(fila.fecha_hora_actividad) },
      { clave: 'fecha_hora_registro', titulo: 'Registro (Lima)', render: fila => fila.fecha_hora_registro ? formatearFechaHora(fila.fecha_hora_registro) : 'Sin hora registrada' },
    ]} />
  </div>
}
