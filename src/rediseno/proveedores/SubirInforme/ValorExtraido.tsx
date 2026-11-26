/** Valor que propone la IA para un dato del informe, legible: listas JSON, tramos en líneas, cifras y fechas con formato. */
import {
  partirEnLineas,
  textoValorSimple,
  tieneValor,
} from '@/pages/reportes-indicadores/asistencia-ia/extraccion/valoresCampo'
import type { TipoDato, ValorCampo } from '@/types/ia'
import estilos from './SubirInforme.module.css'

export const TEXTO_NO_ENCONTRADO = 'No encontrado en el informe'

export default function ValorExtraido({ valor, tipo }: { valor: ValorCampo; tipo: TipoDato | null }) {
  if (!tieneValor(valor)) return <span className={estilos.noEncontrado}>{TEXTO_NO_ENCONTRADO}</span>
  if (Array.isArray(valor)) {
    return (
      <ul className={estilos.valorLista}>
        {valor.map((objeto, i) => (
          <li key={i}>
            {Object.entries(objeto)
              .map(([clave, v]) => `${clave}: ${textoValorSimple(v)}`)
              .join(' · ')}
          </li>
        ))}
      </ul>
    )
  }
  if (typeof valor === 'string' && tipo !== 'Fecha') {
    const lineas = partirEnLineas(valor)
    if (lineas.length > 1) {
      return (
        <ul className={estilos.valorLista}>
          {lineas.map((linea, i) => (
            <li key={i}>{linea}</li>
          ))}
        </ul>
      )
    }
  }
  return <span className={typeof valor === 'number' ? 'cifra' : undefined}>{textoValorSimple(valor, tipo)}</span>
}
