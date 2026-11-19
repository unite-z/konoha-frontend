/**
 * Panel de capas del mapa de atenciones (Guía Web 5.8 y 6.1, patrón «Mapa con capas»), flotante sobre el mapa:
 * casillas por tipo de atención con su total, filtro por tipo de uso (catálogo de MOD-02) y leyenda con los colores
 * de los tipos de uso de los espacios con atenciones. Presentacional.
 */
import Casilla from '@/design-system/Casilla'
import Selector, { OPCION_TODOS, type OpcionSelector } from '@/design-system/Selector'
import type { TipoAtencion, TotalTipoAtencion } from '@/types/reportesGestion'
import { formatearNumero } from '@/utils/formato'
import type { UsoColoreado } from '@/utils/mapaAtenciones'
import { TIPOS_ATENCION } from '@/utils/reportesGestion'
import estilos from './MapaAtenciones.module.css'

export interface PanelCapasProps {
  totales: TotalTipoAtencion[]
  visibles: ReadonlySet<TipoAtencion>
  onCambiarVisible: (tipo: TipoAtencion, visible: boolean) => void
  /** Filtro por tipo de uso del espacio (catálogo de MOD-02); valor vacío = todos. */
  tipoUso: { valor: string; opciones: OpcionSelector[]; motivoBloqueo?: string; onCambiar: (valor: string) => void }
  /** Tipos de uso de los espacios con atenciones (leyenda). */
  leyenda: UsoColoreado[]
}

function Muestra({ color }: { color: string }) {
  return (
    <svg className={estilos.muestra} viewBox="0 0 16 16" aria-hidden="true">
      <rect width="16" height="16" fill={color} />
    </svg>
  )
}

export default function PanelCapas({ totales, visibles, onCambiarVisible, tipoUso, leyenda }: PanelCapasProps) {
  return (
    <section className={estilos.panel} aria-labelledby="titulo-capas">
      <h2 id="titulo-capas" className={estilos.titulo}>
        Capas
      </h2>

      <fieldset className={estilos.grupo}>
        <legend className="sr-only">Tipos de atención visibles</legend>
        {TIPOS_ATENCION.map((tipo) => {
          const total = totales.find((t) => t.tipo_atencion === tipo)?.total
          return (
            <Casilla
              key={tipo}
              etiqueta={total !== undefined ? `${tipo} (${formatearNumero(total)})` : tipo}
              marcada={visibles.has(tipo)}
              onCambiar={(marcada) => onCambiarVisible(tipo, marcada)}
            />
          )
        })}
      </fieldset>

      <Selector
        id="filtro-tipo-uso"
        etiqueta="Tipo de uso"
        valor={tipoUso.valor}
        opciones={tipoUso.opciones}
        opcionTodos={OPCION_TODOS}
        bloqueadoMotivo={tipoUso.motivoBloqueo}
        onCambiar={tipoUso.onCambiar}
      />

      <div className={estilos.grupo}>
        <p className={estilos.subtitulo}>Leyenda</p>
        <ul className={estilos.leyenda}>
          {leyenda.map((uso) => (
            <li key={uso.id}>
              <Muestra color={uso.color} />
              {uso.nombre}
            </li>
          ))}
          <li>
            <Muestra color="var(--color-text-secondary)" />
            Sin atenciones en el periodo
          </li>
          <li>
            <span className={estilos.puntoLeyenda} aria-hidden="true" />
            Ejemplar con atenciones
          </li>
        </ul>
        <p className={estilos.ayuda}>Elige un espacio o un ejemplar en el mapa para ver sus atenciones</p>
      </div>
    </section>
  )
}
