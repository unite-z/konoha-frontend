/**
 * Chips de filtro de los listados: Guía de Estilo Web, sección 5.4.
 *
 * - `ChipsFiltrosActivos`: muestra los filtros aplicados (relleno verde claro y borde verde) con un botón
 *   para quitar cada uno, más el enlace «Limpiar filtros».
 * - `GrupoChips`: grupo de opciones excluyentes en forma de chips (por ejemplo, estados de una bandeja).
 *   La opción elegida usa el mismo aspecto que un filtro activo y `aria-pressed`.
 */
import Icono from './Icono'
import estilos from './ChipsFiltro.module.css'

export interface FiltroActivo {
  clave: string
  /** Texto visible, por ejemplo «Cuadrilla: Cuadrilla 1». */
  texto: string
}

export interface ChipsFiltrosActivosProps {
  filtros: FiltroActivo[]
  onQuitar: (clave: string) => void
  onLimpiar: () => void
}

export function ChipsFiltrosActivos({ filtros, onQuitar, onLimpiar }: ChipsFiltrosActivosProps) {
  if (filtros.length === 0) return null
  return (
    <div className={estilos.contenedor}>
      <ul className={estilos.lista} aria-label="Filtros aplicados">
        {filtros.map((filtro) => (
          <li key={filtro.clave} className={`${estilos.chip} ${estilos.activo}`}>
            <span>{filtro.texto}</span>
            <button
              type="button"
              className={estilos.quitar}
              onClick={() => onQuitar(filtro.clave)}
              aria-label={`Quitar el filtro ${filtro.texto}`}
            >
              <Icono nombre="aspa" tamano="sm" />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className={estilos.limpiar} onClick={onLimpiar}>
        Limpiar filtros
      </button>
    </div>
  )
}

export interface OpcionChip {
  valor: string
  texto: string
}

export interface GrupoChipsProps {
  /** Nombre accesible del grupo. */
  etiqueta: string
  opciones: OpcionChip[]
  valor: string
  onCambiar: (valor: string) => void
}

export function GrupoChips({ etiqueta, opciones, valor, onCambiar }: GrupoChipsProps) {
  return (
    <div className={estilos.lista} role="group" aria-label={etiqueta}>
      {opciones.map((opcion) => {
        const elegida = opcion.valor === valor
        return (
          <button
            key={opcion.valor}
            type="button"
            className={`${estilos.chip} ${estilos.opcion} ${elegida ? estilos.activo : ''}`}
            aria-pressed={elegida}
            onClick={() => onCambiar(opcion.valor)}
          >
            {elegida && <Icono nombre="verificacion" tamano="sm" />}
            {opcion.texto}
          </button>
        )
      })}
    </div>
  )
}
