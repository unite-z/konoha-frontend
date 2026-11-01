/**
 * Columnas por jornada del gráfico de RF-REP-004, en orden de fecha, con eje vertical y líneas guía.
 * Con muchas jornadas se desplazan en horizontal.
 */
import { fechaCorta, formatearMedida, porcentaje, type Medida } from './agregacion'
import estilos from './Columnas.module.css'

export interface ColumnaGrafico {
  clave: string
  texto: string
  valor: number | null
  /** Fecha ISO de la jornada. */
  jornada: string
}

export interface ColumnasJornadaProps {
  columnas: ColumnaGrafico[]
  medida: Medida
  escala: number
  /** Textos de las marcas del eje, de 0 a la escala. */
  marcas: string[]
  claveElegida: string | null
  onAlternar: (clave: string) => void
}

export default function ColumnasJornada({
  columnas,
  medida,
  escala,
  marcas,
  claveElegida,
  onAlternar,
}: ColumnasJornadaProps) {
  return (
    <div className={estilos.grafico}>
      <div className={estilos.eje} aria-hidden="true">
        <span className={estilos.marcas}>
          {[...marcas].reverse().map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </span>
      </div>
      <div className={estilos.desplazable} tabIndex={0} role="region" aria-label="Columnas por jornada">
        <ul className={estilos.columnas}>
          {columnas.map((c) => {
            const texto = formatearMedida(c.valor, medida)
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
                  <span className={estilos.fecha}>{fechaCorta(c.jornada)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
