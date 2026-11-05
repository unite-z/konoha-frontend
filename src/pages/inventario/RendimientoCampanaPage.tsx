import { useNavigate, useParams } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import EstadoVacio from '@/components/ui/EstadoVacio'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO, rutaCampanaPoda } from '@/router/rutasApp'
import { consultarRendimiento } from '@/services/api/campanasPoda'
import type { TramoRendimiento } from '@/types/campanasPoda'
import { formatearFecha } from '@/utils/formato'
import estilos from './CampanasPoda.module.css'

const COLUMNAS: ColumnaTabla<TramoRendimiento>[] = [
  { clave: 'dias', titulo: 'Días trabajados', render: (tramo) => (tramo.dia_desde === tramo.dia_hasta ? `Día ${tramo.dia_desde}` : `Días ${tramo.dia_desde}–${tramo.dia_hasta}`) },
  { clave: 'fechas', titulo: 'Fechas', render: (tramo) => `${formatearFecha(tramo.fecha_desde)} – ${formatearFecha(tramo.fecha_hasta)}` },
  { clave: 'atendidos', titulo: 'Atendidos', alineacion: 'derecha' },
  { clave: 'promedio', titulo: 'Por día', alineacion: 'derecha' },
]

export default function RendimientoCampanaPage() {
  const id = Number(useParams().id)
  const navegar = useNavigate()
  usePaginaActual('Rendimiento de la campaña', [MIGAS_INVENTARIO.areasVerdes, MIGAS_INVENTARIO.campanasPoda, { texto: 'Rendimiento' }])
  const consulta = useConsulta(`rendimiento-campana|${id}`, (signal) => consultarRendimiento(id, signal))

  if (consulta.error?.estado === 403) return <EstadoSinAcceso descripcion={consulta.error.detalle} />
  if (consulta.estado === 'error' && !consulta.datos) {
    return <EstadoError titulo="No pudimos calcular el rendimiento" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }
  const rendimiento = consulta.datos
  if (!rendimiento) return <EstadoCarga forma="tabla" texto="Calculando el rendimiento…" retrasar />

  return (
    <div className={estilos.pagina}>
      <p className={estilos.descripcion}>Ejemplares distintos con poda verificada entre los días con al menos una poda verificada. Los registros sin fotografía y los anulados no cuentan.</p>

      {rendimiento.destacado && (
        <AvisoEnLinea tono="advertencia" titulo={`Rendimiento destacado · ${rendimiento.promedio} por día`}>
          Alcanza el valor de revisión de {rendimiento.umbral_alerta} ejemplares por día. Conviene comprobar la calidad de la poda.
        </AvisoEnLinea>
      )}

      {rendimiento.promedio === null ? (
        <EstadoVacio titulo="Sin ejecución verificada" descripcion="Aún no hay podas con fotografía, así que no se calcula el rendimiento." />
      ) : (
        <>
          <Tarjeta titulo="Resultado" relleno="amplio">
            <ListaDescripcion elementos={[
              { etiqueta: 'Verificados', valor: rendimiento.verificados },
              { etiqueta: 'Días con ejecución', valor: rendimiento.dias_con_ejecucion },
              { etiqueta: 'Promedio', valor: `${rendimiento.promedio} por día` },
            ]} />
          </Tarjeta>
          <TablaDatos
            titulo="Evolución por tramos de cinco días trabajados"
            tituloVisible
            columnas={COLUMNAS}
            filas={rendimiento.tramos}
            claveFila={(tramo) => String(tramo.dia_desde)}
            estado="exito"
          />
        </>
      )}

      <div className={estilos.acciones}>
        <Boton variante="secundario" onClick={() => navegar(rutaCampanaPoda(id))}>Volver a la campaña</Boton>
      </div>
    </div>
  )
}
