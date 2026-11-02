/**
 * Piezas de los gráficos de RF-REP-004 propias de sus medidas: selector de medida y mensaje sin datos.
 * La cabecera y «Ver detalles» son las comunes del MOD-06 (`components/reportes-indicadores/graficos`).
 */
import comunes from '../../../../components/reportes-indicadores/graficos/Graficos.module.css'
import { GrupoChips } from '../../../../components/ui/ChipsFiltro'
import EstadoVacio from '../../../../components/ui/EstadoVacio'
import { MEDIDAS, MEDIDAS_CON_TIEMPO, type Medida } from './agregacion'

export function ControlMedida({ medida, onCambiar }: { medida: Medida; onCambiar: (medida: Medida) => void }) {
  return (
    <div className={comunes.control}>
      <span className={comunes.etiquetaControl}>Medida</span>
      <GrupoChips etiqueta="Medida" opciones={MEDIDAS} valor={medida} onCambiar={(v) => onCambiar(v as Medida)} />
    </div>
  )
}

export function SinDatosMedida({ medida }: { medida: Medida }) {
  return (
    <EstadoVacio
      nivel={3}
      titulo="Sin datos para esta medida"
      descripcion={
        MEDIDAS_CON_TIEMPO.includes(medida)
          ? 'Las actividades mostradas no tienen tiempo registrado. Elige otra medida.'
          : 'Ninguna actividad mostrada tiene este dato. Elige otra medida.'
      }
    />
  )
}
