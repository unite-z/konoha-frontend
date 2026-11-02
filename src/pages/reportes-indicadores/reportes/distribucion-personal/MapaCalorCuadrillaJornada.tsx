/**
 * Mapa de calor «Cuadrilla por jornada» (RF-REP-004): una fila por cuadrilla y una columna por jornada; cuanto
 * más oscura la celda, mayor la medida. Clic en una celda: queda elegida y se habilita «Ver detalles».
 * Es una tabla: con muchas jornadas se desplaza en horizontal con la columna de cuadrillas fija.
 */
import { useMemo, useState } from 'react'
import type { FilaDistribucion } from '../../../../types/reportes'
import { formatearFecha, SIN_VALOR } from '../../../../utils/formato'
import { fechaCorta } from '../../../../components/reportes-indicadores/graficos/escala'
import comunes from '../../../../components/reportes-indicadores/graficos/Graficos.module.css'
import { BarraSeleccion, CabeceraGrafico } from '../../../../components/reportes-indicadores/graficos/PartesGrafico'
import {
  claveCelda,
  formatearMedida,
  matrizCuadrillaJornada,
  MEDIDAS,
  nivelIntensidad,
  totalizar,
  valorMedida,
  type Medida,
} from './agregacion'
import type { Seleccion } from './DetalleSeleccion'
import estilos from './MapaCalor.module.css'
import { ControlMedida, SinDatosMedida } from './PartesGrafico'

const CLASE_NIVEL = [estilos.nivel0, estilos.nivel1, estilos.nivel2, estilos.nivel3, estilos.nivel4]

export interface MapaCalorProps {
  filas: FilaDistribucion[]
  medida: Medida
  onCambiarMedida: (medida: Medida) => void
  onVerDetalle: (seleccion: Seleccion) => void
}

export default function MapaCalorCuadrillaJornada({ filas, medida, onCambiarMedida, onVerDetalle }: MapaCalorProps) {
  const [claveElegida, setClaveElegida] = useState<string | null>(null)
  const matriz = useMemo(() => matrizCuadrillaJornada(filas), [filas])
  const maximo = Math.max(0, ...[...matriz.celdas.values()].map((c) => valorMedida(c.totales, medida) ?? 0))
  const total = useMemo(() => totalizar(filas), [filas])
  const textoMedida = MEDIDAS.find((m) => m.valor === medida)?.texto ?? ''

  let seleccion: Seleccion | null = null
  if (claveElegida) {
    const celda = matriz.celdas.get(claveElegida)
    const [cuadrilla, jornada] = claveElegida.split('|')
    const texto = matriz.cuadrillas.find((c) => c.clave === cuadrilla)?.texto ?? SIN_VALOR
    if (celda) seleccion = { clave: claveElegida, titulo: `${texto} · ${formatearFecha(jornada)}`, filas: celda.filas }
  }

  return (
    <div className={comunes.superficie}>
      <CabeceraGrafico
        titulo={`${textoMedida} por cuadrilla y jornada`}
        total={formatearMedida(total[medida], medida)}
      />
      <div className={comunes.controles}>
        <ControlMedida medida={medida} onCambiar={onCambiarMedida} />
      </div>
      <BarraSeleccion
        seleccionado={seleccion?.titulo ?? null}
        indicacion="Haz clic en una celda para ver su detalle."
        onVerDetalle={() => seleccion && onVerDetalle(seleccion)}
      />
      {maximo === 0 ? (
        <SinDatosMedida medida={medida} />
      ) : (
        <>
          <div className={comunes.desplazable} tabIndex={0} role="region" aria-label="Mapa de calor por cuadrilla y jornada">
            <table className={estilos.mapa}>
              <caption className="sr-only">Cuadrilla por jornada</caption>
              <thead>
                <tr>
                  <th scope="col">Cuadrilla</th>
                  {matriz.jornadas.map((j) => (
                    <th key={j} scope="col" className="cifra">
                      {fechaCorta(j)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matriz.cuadrillas.map((c) => (
                  <tr key={c.clave}>
                    <th scope="row">{c.texto}</th>
                    {matriz.jornadas.map((j) => {
                      const clave = claveCelda(c.clave, j)
                      const celda = matriz.celdas.get(clave)
                      if (!celda) {
                        return (
                          <td key={j}>
                            <span className={estilos.celdaVacia}>
                              <span aria-hidden="true">{SIN_VALOR}</span>
                              <span className="sr-only">Sin actividades</span>
                            </span>
                          </td>
                        )
                      }
                      const valor = valorMedida(celda.totales, medida)
                      const texto = formatearMedida(valor, medida)
                      const activa = clave === claveElegida
                      return (
                        <td key={j}>
                          <button
                            type="button"
                            className={`${estilos.celda} ${CLASE_NIVEL[nivelIntensidad(valor, maximo)]} ${
                              activa ? estilos.celdaActiva : ''
                            }`}
                            aria-pressed={activa}
                            aria-label={`${c.texto}, ${formatearFecha(j)}: ${texto}`}
                            title={`${c.texto}, ${formatearFecha(j)}: ${texto}`}
                            onClick={() => setClaveElegida((actual) => (actual === clave ? null : clave))}
                          >
                            <span className="cifra">{texto}</span>
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={comunes.leyenda} aria-label="Leyenda">
            <li>
              <span className={`${estilos.muestra} ${estilos.celdaVacia}`} aria-hidden="true" /> Sin actividades
            </li>
            <li className={estilos.escala}>
              Menos
              {CLASE_NIVEL.slice(1).map((clase) => (
                <span key={clase} className={`${estilos.muestra} ${clase}`} aria-hidden="true" />
              ))}
              Más
            </li>
          </ul>
        </>
      )}
    </div>
  )
}
