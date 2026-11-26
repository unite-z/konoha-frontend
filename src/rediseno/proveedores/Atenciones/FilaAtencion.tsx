/** Fila de vidrio de una atención: enlaza a su ficha (RD-53) y se transforma en ella (transición `fila`). */
import { EnlaceTransicion, estiloTransicion } from '@/rediseno/base/movimiento'
import Estado from '@/design-system/Estado'
import { insigniaAEstado } from '@/design-system/tonos'
import type { Atencion } from '@/types/tercerizados'
import { codigoCorto, insigniaEstado, textoClase, textoOrigen } from '@/utils/estadosTercerizados'
import { formatearFecha, SIN_VALOR } from '@/utils/formato'
import { rutaAtencion } from '../enlaces'
import estilos from './Atenciones.module.css'
import { nombreFilaAtencion } from './nombres'

/** Estado que recibe la ficha (RD-53) para volver a donde se abrió: ruta y consulta, con los mismos filtros. */
export interface EstadoNavegacionBandeja {
  volverA: string
}

export default function FilaAtencion({ atencion: a, volverA }: { atencion: Atencion; volverA: string }) {
  return (
    <li className={estilos.fila} style={estiloTransicion(nombreFilaAtencion(a.id))} /* estilo-calculado */>
      <EnlaceTransicion
        to={rutaAtencion(a.id)}
        state={{ volverA } satisfies EstadoNavegacionBandeja}
        className={estilos.enlaceFila}
      >
        <span className={estilos.principal}>
          <span className={`${estilos.codigo} cifra`} title={a.codigo}>
            {codigoCorto(a.codigo)}
          </span>
          <span>{a.tipo_servicio_nombre ?? SIN_VALOR}</span>
          <span className={estilos.secundario}>{a.proveedor_nombre ?? SIN_VALOR}</span>
        </span>
        <span className={estilos.principal}>
          <span className="cifra">{a.contrato_numero ?? SIN_VALOR}</span>
          <span className={estilos.secundario}>
            {textoClase(a.clase)} · {textoOrigen(a.origen)}
          </span>
        </span>
        <span className={estilos.estado}>
          <span className={estilos.etiquetas}>
            <Estado {...insigniaAEstado(insigniaEstado(a.estado))} />
            {a.es_riesgo && <Estado tono="aviso" texto="Riesgo" />}
          </span>
          <span className={`${estilos.secundario} cifra`}>Registrada {formatearFecha(a.fecha_creacion)}</span>
        </span>
      </EnlaceTransicion>
    </li>
  )
}
