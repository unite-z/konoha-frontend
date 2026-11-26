import Paginacion from '@/design-system/Paginacion'
import type { AreaVerde } from '@/types/areasVerdes'
import { estiloTransicion, fila } from '../base/movimiento'
import estilos from './Mapa.module.css'

interface Props {
  filas: readonly AreaVerde[]
  pagina: number
  total: number
  porPagina: number
  onPagina: (pagina: number) => void
  /** `id` del área abierta (`?area=`). */
  seleccionada: number | null
  /** ¿Tiene contorno en el mapa? Sin él se puede abrir, pero no hay nada que enseñar en el plano. */
  tieneContorno: (areaId: number) => boolean
  onElegir: (area: AreaVerde) => void
}

const formatoSuperficie = new Intl.NumberFormat('es-PE', {
  maximumFractionDigits: 0,
})

function detalle(area: AreaVerde): string {
  const superficie = Number(area.superficie_m2)
  return [
    area.sector_nombre,
    area.tipo_uso_nombre,
    area.cuartel_numero ? `Cuartel ${area.cuartel_numero}` : null,
    Number.isFinite(superficie) ? `${formatoSuperficie.format(superficie)} m²` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Resultado de la búsqueda, paginado. Cada fila es el elemento que crecerá hasta el panel del área (RD-18). */
export default function ListaAreas({
  filas,
  pagina,
  total,
  porPagina,
  onPagina,
  seleccionada,
  tieneContorno,
  onElegir,
}: Props) {
  return (
    <>
      <ul className={estilos.lista} aria-label="Áreas del resultado">
        {filas.map((area) => (
          <li key={area.id} className={estilos.fila} style={estiloTransicion(fila(area.id))} /* estilo-calculado */>
            {/* Excepción al sistema (AV-351): fila de lista que se abre como el panel del área; no es un botón de acción. */}
            <button
              type="button"
              className={estilos.filaBoton}
              aria-current={seleccionada === area.id ? 'true' : undefined}
              onClick={() => onElegir(area)}
            >
              <span className={estilos.nombre}>{area.nombre}</span>
              <span className={estilos.secundario}>{detalle(area) || 'Sin datos de ubicación'}</span>
              {!tieneContorno(area.id) && <span className={estilos.secundario}>Sin contorno en el mapa</span>}
            </button>
          </li>
        ))}
      </ul>
      <Paginacion pagina={pagina} porPagina={porPagina} total={total} onCambiar={onPagina} />
    </>
  )
}
