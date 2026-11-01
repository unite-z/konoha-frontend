/**
 * Columnas por fecha de los gráficos del MOD-06, en orden de fecha, con eje vertical y líneas guía.
 * Con muchas fechas se desplazan en horizontal.
 */
import { fechaCorta, porcentaje } from './escala'
import estilos from './Columnas.module.css'

export interface ColumnaGrafico {
  clave: string
  texto: string
  valor: number | null
  /** Fecha ISO de la columna. */
  fecha: string
}

export interface ColumnasFechaProps {
  columnas: ColumnaGrafico[]
  /** Texto del valor de una columna. */
  formatear: (valor: number | null) => string
  escala: number
  /** Textos de las marcas del eje, de 0 a la escala. */
  marcas: string[]
  claveElegida: string | null
  onAlternar: (clave: string) => void
}

export default function ColumnasFecha({
  columnas,
  formatear,
  escala,
  marcas,
  claveElegida,
  onAlternar,
}: ColumnasFechaProps) {
  return (
    <div className={estilos.grafico}>
      <div className={estilos.eje} aria-hidden="true">
        <span className={estilos.marcas}>
          {[...marcas].reverse().map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </span>
      </div>
      <div className={estilos.desplazable} tabIndex={0} role="region" aria-label="Columnas por fecha">
        <ul className={estilos.columnas}>
          {columnas.map((c) => {
            const texto = formatear(c.valor)
            const activa = c.clave === claveElegida
            return (
              <li key={c.clave} className={estilos.item}>
                <button
                  type="button"
                  className={`${estilos.columna} ${activa ? estilos.activa : ''}`}
                  aria-pressed={activa}
                  aria-label={`${c.texto}: ${texto}`}
                  title={`${c.texto}: ${texto}`}
                  onClick={() => onAlternar(c.clave)}
                >
                  <span className={`${estilos.valor} cifra`}>{texto}</span>
                  <span className={estilos.pista}>
                    <span
                      className={estilos.relleno}
                      style={{ height: `${porcentaje(c.valor, escala)}%` }} // estilo-calculado
                    />
                  </span>
                  <span className={estilos.fecha}>{fechaCorta(c.fecha)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
