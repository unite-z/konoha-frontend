import type { ResultadoIndicador } from '@/types/reportesGestion'
import { valorTarjeta } from '@/utils/reportesGestion'
import { EnlaceTransicion, estiloTransicion, fila } from '../base/movimiento'
import { PARAMETRO_INDICADOR, rutaReportes } from './enlaces'
import estilos from './Cifras.module.css'

export interface CifrasProps {
  indicadores: ResultadoIndicador[]
  /** Clave del indicador cuyo panel está abierto, si hay alguno. */
  abierto: string | null
  /** Consulta actual de la URL: el panel conserva el periodo y los filtros. */
  busqueda: string
}

/**
 * Las cinco cifras del encabezado. Cada una es un enlace que abre su panel (`?indicador=`) y se transforma en él:
 * mientras su panel está abierto cede el nombre de transición al panel, porque un nombre solo puede estar una vez.
 */
export default function Cifras({ indicadores, abierto, busqueda }: CifrasProps) {
  return (
    <ul className={estilos.cifras} aria-label="Indicadores del periodo">
      {indicadores.map((r) => {
        const valor = valorTarjeta(r)
        const esta = abierto === r.clave
        return (
          <li key={r.clave}>
            <EnlaceTransicion
              to={rutaReportes({ indicador: r.clave, filtros: busqueda })}
              // Con otro panel abierto se sustituye la entrada; si no, «Atrás» (o cerrar) vuelve a la vista sin panel.
              replace={abierto !== null}
              state={abierto === null ? { panelAbiertoPor: PARAMETRO_INDICADOR } : undefined}
              className={estilos.cifra}
              aria-current={esta || undefined}
              style={esta ? undefined : estiloTransicion(fila(r.clave))} // estilo-calculado
            >
              {/* Los espacios entre las partes separan las palabras del nombre accesible del enlace. */}
              <span className={estilos.etiqueta}>{r.indicador.nombre}</span>{' '}
              {valor === null ? (
                <>
                  <span className={estilos.sinDatos}>Sin datos</span>{' '}
                  {r.mensaje_sin_datos && <span className={estilos.nota}>{r.mensaje_sin_datos}</span>}
                </>
              ) : (
                <span className={`${estilos.valor} cifra`}>
                  {valor} <span className={estilos.unidad}>{r.indicador.unidad}</span>
                </span>
              )}{' '}
              <span className="sr-only">Ver detalle</span>
            </EnlaceTransicion>
          </li>
        )
      })}
    </ul>
  )
}
