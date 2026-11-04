/**
 * Contexto de una propuesta de IA (RN-IA-001, patrón de S12): la suficiencia de los datos, lo que faltó, los datos
 * utilizados, las limitaciones y la explicación de los criterios. Siempre visible junto a la propuesta, para que la
 * persona sepa con qué trabajó la IA antes de decidir.
 */
import type { MetadatosIA } from '@/types/ia'
import { insigniaSuficiencia } from '@/utils/estados'
import AvisoEnLinea from '../ui/AvisoEnLinea'
import Estado from '../ui/Estado'
import Icono from '../ui/Icono'
import { insigniaAEstado } from '../ui/tonos'
import estilos from './BloqueContextoIA.module.css'

export interface BloqueContextoIAProps {
  contexto: Pick<MetadatosIA, 'suficiencia' | 'faltantes' | 'datos_utilizados' | 'limitaciones' | 'explicacion'>
  /** Título del aviso de faltantes (por ejemplo, «Faltan datos para una priorización confiable»). */
  tituloFaltantes: string
}

function Lista({ titulo, elementos }: { titulo: string; elementos: string[] }) {
  if (elementos.length === 0) return null
  return (
    <div className={estilos.grupo}>
      <h3 className={estilos.titulo}>{titulo}</h3>
      <ul className={estilos.lista}>
        {elementos.map((texto) => (
          <li key={texto}>{texto}</li>
        ))}
      </ul>
    </div>
  )
}

export default function BloqueContextoIA({ contexto, tituloFaltantes }: BloqueContextoIAProps) {
  return (
    <section className={estilos.bloque} aria-labelledby="titulo-contexto-ia">
      <div className={estilos.cabecera}>
        <h2 id="titulo-contexto-ia" className={estilos.encabezado}>
          <Icono nombre="destello" tamano="sm" /> Con qué trabajó la IA
        </h2>
        <Estado {...insigniaAEstado(insigniaSuficiencia(contexto.suficiencia))} />
      </div>
      {contexto.faltantes.length > 0 && (
        <AvisoEnLinea tono="advertencia" titulo={tituloFaltantes}>
          <ul>
            {contexto.faltantes.map((texto) => (
              <li key={texto}>{texto}</li>
            ))}
          </ul>
        </AvisoEnLinea>
      )}
      {contexto.explicacion && <p className={estilos.explicacion}>{contexto.explicacion}</p>}
      <div className={estilos.columnas}>
        <Lista titulo="Datos utilizados" elementos={contexto.datos_utilizados} />
        <Lista titulo="Limitaciones" elementos={contexto.limitaciones} />
      </div>
    </section>
  )
}
