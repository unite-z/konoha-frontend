import BarraAvance from '@/design-system/BarraAvance'
import EstadoVacio from '@/design-system/EstadoVacio'
import Selector from '@/design-system/Selector'
import { avanceCiclo, fechasCiclo } from '@/pages/planificacion/ciclos/ciclos'
import type { FechaIso } from '@/types/comun'
import type { Programacion } from '@/types/planificacion'
import type { ResumenSectores } from '@/types/resumenSectores'
import { EnlaceTransicion, estiloTransicion, panel } from '../base/movimiento'
import { rutaPlanificacionCiclo } from './enlaces'
import { avanceGlobal, nombreCiclo, textoActualizacion, textoPorcentaje, ultimaActualizacion } from './sectores'
import estilos from './Sectores.module.css'

export interface AvanceCicloProps {
  hoy: FechaIso
  ciclos: Programacion[]
  elegido: Programacion | null
  resumen: ResumenSectores | null
  onElegir: (id: number) => void
}

/** Avance del ciclo elegido con la hora de la última actualización; la cifra pasa al panel del ciclo (RD-29). */
export default function AvanceCiclo({ hoy, ciclos, elegido, resumen, onElegir }: AvanceCicloProps) {
  if (!elegido) {
    return (
      <section className={estilos.vidrio} aria-labelledby="titulo-avance">
        <div className={estilos.cabeceraPanel}>
          <h2 id="titulo-avance">Avance del ciclo</h2>
        </div>
        <EstadoVacio titulo="Sin ciclos" descripcion="Cuando se programe un ciclo, aquí verás su avance." nivel={3} />
      </section>
    )
  }
  const global = resumen ? avanceGlobal(resumen) : null
  const enDias = avanceCiclo(elegido, hoy)
  const porcentaje = global?.porcentaje ?? enDias
  const actualizado = resumen ? textoActualizacion(ultimaActualizacion(resumen)) : null
  const leyenda = global && global.porcentaje !== null ? `${global.ejecutado} de ${global.programado} áreas` : enDias === null ? 'Aún sin avance' : 'Avance en días del ciclo'

  return (
    <section className={estilos.vidrio} aria-labelledby="titulo-avance">
      <div className={estilos.cabeceraPanel}>
        <h2 id="titulo-avance">Avance del ciclo</h2>
        <div className={estilos.selector}>
          <Selector
            id="selector-ciclo"
            etiqueta="Ciclo"
            compacto
            valor={String(elegido.id)}
            opciones={ciclos.map((c) => ({ valor: String(c.id), texto: `${nombreCiclo(c)} · ${fechasCiclo(c.fecha_inicio_prevista, c.fecha_fin_prevista)}` }))}
            onCambiar={(valor) => onElegir(Number(valor))}
          />
        </div>
      </div>
      <div className={estilos.avance}>
        <EnlaceTransicion
          to={rutaPlanificacionCiclo(elegido.id)}
          className={estilos.cifra}
          aria-label={`Ver el ciclo ${nombreCiclo(elegido)}`}
          style={estiloTransicion(panel(`ciclo-${elegido.id}`))} /* estilo-calculado */
        >
          <span className={estilos.cifraValor}>{porcentaje === null ? 'Sin avance' : textoPorcentaje(porcentaje)}</span>
          <span className={estilos.leyenda}>{leyenda}</span>
        </EnlaceTransicion>
        <div className={estilos.detalleAvance}>
          {porcentaje !== null && <BarraAvance valor={porcentaje} maximo={100} etiqueta={`Avance de ${nombreCiclo(elegido)}`} textoValor={textoPorcentaje(porcentaje)} />}
          {actualizado && <span className={estilos.leyenda}>{actualizado}</span>}
        </div>
      </div>
    </section>
  )
}
