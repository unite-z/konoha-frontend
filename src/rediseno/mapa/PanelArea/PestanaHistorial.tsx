import Boton from '@/design-system/Boton'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import EstadoVacio from '@/design-system/EstadoVacio'
import { formatearFecha } from '@/utils/formato'
import { nombreTipoHistorial } from './formato'
import type { HistorialArea } from './useHistorialArea'
import estilos from './PanelArea.module.css'

/** Historial del área: cambios de sector, actividades, incidencias y atenciones, de la más reciente a la más antigua. */
export default function PestanaHistorial({ historial }: { historial: HistorialArea }) {
  if (historial.entradas.length === 0) {
    return (
      <EstadoVacio
        nivel={3}
        titulo="Sin historial todavía"
        descripcion="Los cambios de sector, las actividades, las incidencias y las atenciones del área aparecerán aquí."
      />
    )
  }
  return (
    <>
      <ol className={estilos.historial} aria-label="Historial del área">
        {historial.entradas.map((entrada) => (
          <li key={`${entrada.tipo}-${entrada.id}`} className={estilos.entrada}>
            <span className={estilos.etiquetaTipo}>{nombreTipoHistorial(entrada)}</span>
            <span className={estilos.nombre}>{entrada.titulo}</span>
            <span className={estilos.secundario}>
              {[formatearFecha(entrada.fecha), entrada.detalle, entrada.estado].filter(Boolean).join(' · ')}
            </span>
          </li>
        ))}
      </ol>
      {historial.falloAlCargar && (
        <AvisoEnLinea tono="advertencia" compacto>
          No pudimos cargar más entradas.
        </AvisoEnLinea>
      )}
      {historial.hayMas && (
        <Boton variante="secundario" compacto cargando={historial.cargando} onClick={historial.cargarMas}>
          Cargar más
        </Boton>
      )}
    </>
  )
}
