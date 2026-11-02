/**
 * Las 4 tarjetas de RF-REP-010: cumplimiento (como la del panel ejecutivo del mockup), pendientes (en alerta si hay
 * alguno), con desviación y ejecuciones sin programar. Las tres últimas son también filtros de toda la página
 * (`TarjetaFiltro`): al pulsarlas se ven solo esos trabajos; al pulsar otra vez, se quita el filtro.
 */
import TarjetaFiltro from '../../../../components/reportes-indicadores/TarjetaFiltro'
import TarjetaIndicador from '../../../../components/ui/TarjetaIndicador'
import type { ResultadoProgramadoEjecutado } from '../../../../types/reportesGestion'
import { formatearNumero } from '../../../../utils/formato'
import { promedioDesviacion, type FiltroTarjeta } from '../../../../utils/programadoEjecutado'
import { numeroDeDecimal } from '../../../../utils/reportesGestion'
import estilos from './ProgramadoEjecutado.module.css'

const plural = (n: number, uno: string, varios: string) => `${formatearNumero(n)} ${n === 1 ? uno : varios}`

export interface TarjetasProgramadoProps {
  datos: ResultadoProgramadoEjecutado
  filtro: FiltroTarjeta | null
  onFiltrar: (filtro: FiltroTarjeta | null) => void
}

export default function TarjetasProgramado({ datos, filtro, onFiltrar }: TarjetasProgramadoProps) {
  const { resumen } = datos
  const porcentaje = numeroDeDecimal(resumen.porcentaje_cumplimiento)
  const cumplidos = resumen.ejecutados + resumen.ejecutados_con_desviacion
  const base = resumen.programados - resumen.cancelados
  const textoCumplidos = `${formatearNumero(cumplidos)} de ${plural(base, 'trabajo ejecutado', 'trabajos ejecutados')}`
  const media = promedioDesviacion(datos.filas)

  const alternar = (propio: FiltroTarjeta) => onFiltrar(filtro === propio ? null : propio)
  const pista = (propio: FiltroTarjeta) => (filtro === propio ? 'Filtro aplicado. Pulsa para quitarlo.' : 'Pulsa para ver solo estos.')

  return (
    <div className={estilos.tarjetas} role="group" aria-label="Resumen de la comparación">
      <div>
        <TarjetaIndicador
          etiqueta="Cumplimiento"
          estado={porcentaje === null ? 'sinDatos' : 'normal'}
          motivoSinDatos="No hay trabajos programados sin cancelar en el periodo"
          valor={porcentaje === null ? undefined : formatearNumero(porcentaje)}
          unidad="%"
          contexto={textoCumplidos}
          avance={porcentaje === null ? undefined : { valor: cumplidos, maximo: base, etiqueta: 'Trabajos ejecutados', textoValor: textoCumplidos }}
        />
      </div>
      <TarjetaFiltro activo={filtro === 'Pendiente'} etiqueta="Filtrar por trabajos pendientes" onAlternar={() => alternar('Pendiente')}>
        <TarjetaIndicador
          etiqueta="Pendientes"
          estado={resumen.pendientes > 0 ? 'alerta' : 'normal'}
          valor={formatearNumero(resumen.pendientes)}
          contexto={`${plural(resumen.en_curso, 'trabajo en curso', 'trabajos en curso')} · ${pista('Pendiente')}`}
          insignia={resumen.pendientes > 0 ? { tono: 'advertencia', texto: 'Sin ejecución' } : undefined}
        />
      </TarjetaFiltro>
      <TarjetaFiltro
        activo={filtro === 'EjecutadoConDesviacion'}
        etiqueta="Filtrar por trabajos con desviación"
        onAlternar={() => alternar('EjecutadoConDesviacion')}
      >
        <TarjetaIndicador
          etiqueta="Con desviación"
          valor={formatearNumero(resumen.ejecutados_con_desviacion)}
          contexto={`${media === null ? 'Ningún trabajo terminó tarde' : `${formatearNumero(media, 1)} días de retraso de media`} · ${pista('EjecutadoConDesviacion')}`}
        />
      </TarjetaFiltro>
      <TarjetaFiltro
        activo={filtro === 'sin-programar'}
        etiqueta="Filtrar por ejecuciones sin programar"
        onAlternar={() => alternar('sin-programar')}
      >
        <TarjetaIndicador
          etiqueta="Ejecuciones sin programar"
          valor={formatearNumero(resumen.ejecuciones_sin_programacion)}
          contexto={`Hechas sin una programación vinculada · ${pista('sin-programar')}`}
        />
      </TarjetaFiltro>
    </div>
  )
}
