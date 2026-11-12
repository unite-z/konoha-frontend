/**
 * Las 4 tarjetas del reporte por servicio (RF-REP-008): avance, rendimiento, especies o plagas y conformidad.
 * Una sección sin datos muestra «Sin datos» con su motivo: nunca un cero (criterio 3).
 */
import TarjetaIndicador from '@/components/ui/TarjetaIndicador'
import type { ResultadoReporteServicio } from '@/types/reportesGestion'
import { formatearNumero } from '@/utils/formato'
import { numeroDeDecimal } from '@/utils/reportesGestion'
import { contextoRendimiento, resumenConformidad, textoAvance, tituloTarjetaRendimiento } from '@/utils/reporteServicio'
import estilos from './ServicioTercerizado.module.css'

function motivo(seccion: { mensaje_sin_datos: string | null }): string {
  return seccion.mensaje_sin_datos ?? 'No se registró la información necesaria'
}

export default function TarjetasServicio({ datos }: { datos: ResultadoReporteServicio }) {
  const { avance, rendimiento, especies_plagas: especies, conformidad } = datos
  const porcentaje = numeroDeDecimal(avance.porcentaje_avance)
  const total = avance.programadas + avance.extraordinarias
  const valorRendimiento = tituloTarjetaRendimiento(rendimiento)
  const plagas = especies.elementos.filter((e) => e.tipo === 'Plaga').length
  const especiesDistintas = especies.elementos.length - plagas

  return (
    <div className={estilos.tarjetas} role="group" aria-label="Resumen del servicio">
      <div>
        <TarjetaIndicador
          etiqueta="Avance"
          estado={avance.sin_datos || porcentaje === null ? 'sinDatos' : 'normal'}
          motivoSinDatos={motivo(avance)}
          valor={porcentaje === null ? undefined : formatearNumero(porcentaje)}
          unidad="%"
          contexto={textoAvance(avance) ?? undefined}
          avance={
            porcentaje === null
              ? undefined
              : { valor: avance.ejecutadas, maximo: total, etiqueta: 'Atenciones ejecutadas', textoValor: textoAvance(avance) ?? undefined }
          }
        />
      </div>
      <div>
        <TarjetaIndicador
          etiqueta="Rendimiento"
          estado={valorRendimiento === 'Sin datos' ? 'sinDatos' : 'normal'}
          motivoSinDatos={motivo(rendimiento)}
          valor={valorRendimiento}
          contexto={contextoRendimiento(rendimiento) ?? undefined}
          insignia={
            rendimiento.atenciones_fuera_de_plazo ? { tono: 'advertencia', texto: 'Con atenciones fuera de plazo' } : undefined
          }
        />
      </div>
      <div>
        <TarjetaIndicador
          etiqueta="Especies o plagas atendidas"
          estado={especies.sin_datos ? 'sinDatos' : 'normal'}
          motivoSinDatos={motivo(especies)}
          valor={formatearNumero(especies.elementos.length)}
          contexto={[
            especiesDistintas > 0 && `${formatearNumero(especiesDistintas)} ${especiesDistintas === 1 ? 'especie' : 'especies'}`,
            plagas > 0 && `${formatearNumero(plagas)} ${plagas === 1 ? 'plaga' : 'plagas'}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      </div>
      <div>
        <TarjetaIndicador
          etiqueta="Conformidad"
          estado={conformidad.sin_datos ? 'sinDatos' : 'normal'}
          motivoSinDatos={motivo(conformidad)}
          valor={resumenConformidad(conformidad) ?? undefined}
          contexto={
            conformidad.sin_datos
              ? undefined
              : `${formatearNumero(conformidad.pendientes_de_revision)} pendientes de revisión`
          }
          insignia={conformidad.observadas > 0 && !conformidad.sin_datos ? { tono: 'advertencia', texto: 'Con observaciones' } : undefined}
        />
      </div>
    </div>
  )
}
