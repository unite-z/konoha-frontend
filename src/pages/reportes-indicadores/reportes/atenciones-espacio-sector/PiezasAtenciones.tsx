/**
 * Piezas de RF-REP-006: barra de modalidad (personal propio / tercerizado, con los colores del mapa de
 * atenciones), chips de tipos de atención, barra de atenciones frente al máximo y leyenda de modalidad.
 * Ninguna comunica solo con color: siempre llevan cifras o texto.
 */
import BarraAvance from '../../../../components/ui/BarraAvance'
import { formatearNumero, SIN_VALOR } from '../../../../utils/formato'
import estilos from './Atenciones.module.css'

function porcentaje(parte: number, total: number): string {
  return `${formatearNumero(total > 0 ? Math.round((parte / total) * 100) : 0)} %`
}

export function BarraModalidad({
  propio,
  tercerizado,
  formato = 'cifras',
}: {
  propio: number
  tercerizado: number
  /** «4 propio · 2 tercerizado» o «67 % propio · 33 % tercerizado». */
  formato?: 'cifras' | 'porcentaje'
}) {
  const total = propio + tercerizado
  if (total === 0) return <>{SIN_VALOR}</>
  const texto =
    formato === 'porcentaje'
      ? `${porcentaje(propio, total)} propio · ${porcentaje(tercerizado, total)} tercerizado`
      : `${formatearNumero(propio)} propio · ${formatearNumero(tercerizado)} tercerizado`
  return (
    <div className={estilos.modalidad}>
      <span
        className={estilos.barraModalidad}
        role="img"
        aria-label={`${formatearNumero(propio)} de personal propio y ${formatearNumero(tercerizado)} tercerizadas`}
      >
        {propio > 0 && (
          <span className={estilos.propio} style={{ flexGrow: propio }} /> // estilo-calculado
        )}
        {tercerizado > 0 && (
          <span className={estilos.tercerizado} style={{ flexGrow: tercerizado }} /> // estilo-calculado
        )}
      </span>
      <span className={`${estilos.textoModalidad} cifra`}>{texto}</span>
    </div>
  )
}

export function LeyendaModalidad() {
  return (
    <ul className={estilos.leyenda} aria-label="Leyenda de modalidad">
      <li>
        <span className={`${estilos.muestra} ${estilos.propio}`} aria-hidden="true" /> Personal propio
      </li>
      <li>
        <span className={`${estilos.muestra} ${estilos.tercerizado}`} aria-hidden="true" /> Tercerizado
      </li>
    </ul>
  )
}

/** Tipos de atención como chips, de más a menos frecuente. */
export function TiposAtencion({ porTipo }: { porTipo: Record<string, number> }) {
  const tipos = Object.entries(porTipo).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
  if (tipos.length === 0) return <>{SIN_VALOR}</>
  return (
    <ul className={estilos.tipos}>
      {tipos.map(([tipo, n]) => (
        <li key={tipo} className={estilos.chipTipo}>
          <span>{tipo}</span>
          <span className={`${estilos.numeroTipo} cifra`}>{formatearNumero(n)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Número de atenciones y su barra frente al más atendido del grupo. */
export function AtencionesFrenteAlMaximo({ total, maximo, nombre }: { total: number; maximo: number; nombre: string }) {
  return (
    <div className={estilos.atenciones}>
      <span className={`${estilos.numeroAtenciones} cifra`}>{formatearNumero(total)}</span>
      <BarraAvance
        valor={total}
        maximo={maximo}
        etiqueta={`Atenciones de ${nombre} frente al más atendido`}
        textoValor={`${formatearNumero(total)} de ${formatearNumero(maximo)}`}
      />
    </div>
  )
}
