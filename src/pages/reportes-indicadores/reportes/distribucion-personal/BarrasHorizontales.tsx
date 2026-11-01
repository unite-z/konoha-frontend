/**
 * Barras horizontales del gráfico de RF-REP-004, con su eje de valores. En «agrupadas», cada grupo (clase de
 * actividad) va seguido de sus subgrupos (tipos), más claros y finos.
 */
import { formatearMedida, porcentaje, type Medida } from './agregacion'
import estilos from './Barras.module.css'
import comunes from './Graficos.module.css'

export interface BarraGrafico {
  clave: string
  texto: string
  valor: number | null
  /** Subgrupo (tipo de actividad) dentro de su grupo. */
  esTipo: boolean
  /** Clave del grupo al que pertenece un subgrupo. */
  grupo?: string
}

export interface BarrasHorizontalesProps {
  barras: BarraGrafico[]
  agrupadas: boolean
  medida: Medida
  escala: number
  /** Textos de las marcas del eje, de 0 a la escala. */
  marcas: string[]
  claveElegida: string | null
  onAlternar: (clave: string) => void
}

export default function BarrasHorizontales({
  barras,
  agrupadas,
  medida,
  escala,
  marcas,
  claveElegida,
  onAlternar,
}: BarrasHorizontalesProps) {
  function boton(barra: BarraGrafico) {
    const texto = formatearMedida(barra.valor, medida)
    const activa = barra.clave === claveElegida
    return (
      <button
        type="button"
        className={`${estilos.barra} ${barra.esTipo ? estilos.barraTipo : ''} ${activa ? estilos.barraActiva : ''}`}
        aria-pressed={activa}
        title={`${barra.texto}: ${texto}`}
        onClick={() => onAlternar(barra.clave)}
      >
        <span className={estilos.nombreBarra}>{barra.texto}</span>
        <span className={estilos.pista}>
          <span
            className={estilos.relleno}
            style={{ width: `${porcentaje(barra.valor, escala)}%` }} // estilo-calculado
          />
        </span>
        <span className={`${estilos.valorBarra} cifra`}>{texto}</span>
      </button>
    )
  }

  const eje = (
    <div className={estilos.eje} aria-hidden="true">
      <span className={estilos.ejeMarcas}>
        {marcas.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </span>
    </div>
  )

  if (!agrupadas) {
    return (
      <>
        {eje}
        <ul className={estilos.barras}>
          {barras.map((b) => (
            <li key={b.clave}>{boton(b)}</li>
          ))}
        </ul>
      </>
    )
  }

  const grupos = barras.filter((b) => !b.esTipo)
  return (
    <>
      <ul className={comunes.leyenda} aria-label="Leyenda">
        <li>
          <span className={estilos.muestraClase} aria-hidden="true" /> Clase de actividad
        </li>
        <li>
          <span className={estilos.muestraTipo} aria-hidden="true" /> Tipo de actividad
        </li>
      </ul>
      {eje}
      <ul className={estilos.barras}>
        {grupos.map((g) => (
          <li key={g.clave} className={estilos.grupoClase}>
            {boton(g)}
            <ul className={estilos.barras} aria-label={`Tipos de ${g.texto}`}>
              {barras
                .filter((b) => b.grupo === g.clave)
                .map((b) => (
                  <li key={b.clave}>{boton(b)}</li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  )
}
