/**
 * Las tres fichas de decisión de una estimación (RF-IA-004): operarios, duración e insumos, cada una con su
 * recomendación con unidades, «Tu decisión» y los campos para corregir. Ya confirmada, muestra lo confirmado.
 */
import CampoFormulario from '@/components/ui/CampoFormulario'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import type { EstimacionRecursos } from '@/types/estimacionIa'
import type { AccionDecision } from '@/types/ia'
import {
  OPCIONES_UNIDAD,
  textoDuracion,
  textoInsumo,
  textoOperarios,
  unidadesSugeridas,
  type ErroresConfirmados,
  type RecursosEnEdicion,
} from '@/utils/estimacionIa'
import estilos from '@/pages/reportes-indicadores/reportes/Reportes.module.css'
import EditorInsumos from './EditorInsumos'
import estilosEstimacion from './Estimacion.module.css'
import FichaRecurso from './FichaRecurso'

export type BloqueRecurso = 'operarios' | 'duracion' | 'insumos'

export interface FichasRecursosProps {
  estimacion: EstimacionRecursos
  modo: 'editar' | 'final' | 'consulta'
  acciones: Partial<Record<BloqueRecurso, AccionDecision>>
  corregido: RecursosEnEdicion
  onCorregir: (cambio: Partial<RecursosEnEdicion>) => void
  onDecidir: (bloque: BloqueRecurso, accion: AccionDecision) => void
  /** Error «falta decidir» de cada bloque (solo tras intentar confirmar). */
  errorBloque: (bloque: BloqueRecurso) => string | undefined
  /** Errores de los valores corregidos (solo tras intentar confirmar). */
  errores: ErroresConfirmados
  /** Textos de lo confirmado (modo final). */
  final: { operarios: string; duracion: string; insumos: string } | null
}

export default function FichasRecursos({ estimacion: est, modo, acciones, corregido, onCorregir, onDecidir, errorBloque, errores, final }: FichasRecursosProps) {
  return (
    <section className={estilos.seccion} aria-labelledby="titulo-recursos">
      <h2 id="titulo-recursos" className={estilos.tituloSeccion}>
        Recursos estimados
      </h2>
      <div id="ficha-operarios">
        <FichaRecurso
          titulo="Operarios"
          sugerencia={textoOperarios(est)}
          modo={modo}
          accion={acciones.operarios}
          onAccion={(a) => onDecidir('operarios', a)}
          error={errorBloque('operarios')}
          final={final?.operarios}
          correccion={
            <CampoFormulario
              id="corregir-operarios"
              etiqueta="Operarios confirmados"
              formato="entero"
              value={corregido.operarios}
              error={errores.operarios}
              onChange={(e) => onCorregir({ operarios: e.target.value })}
            />
          }
        />
      </div>
      <div id="ficha-duracion">
        <FichaRecurso
          titulo="Duración"
          sugerencia={textoDuracion(est.duracion, est.unidad_duracion)}
          modo={modo}
          accion={acciones.duracion}
          onAccion={(a) => onDecidir('duracion', a)}
          error={errorBloque('duracion')}
          final={final?.duracion}
          correccion={
            <div className={estilosEstimacion.duracion}>
              <CampoFormulario
                id="corregir-duracion"
                etiqueta="Duración confirmada"
                formato="decimal"
                value={corregido.duracion}
                error={errores.duracion}
                onChange={(e) => onCorregir({ duracion: e.target.value })}
              />
              <GrupoOpciones
                etiqueta="Unidad"
                opciones={OPCIONES_UNIDAD}
                valor={corregido.unidad_duracion}
                onCambiar={(unidad_duracion) => onCorregir({ unidad_duracion })}
              />
            </div>
          }
        />
      </div>
      <div id="ficha-insumos">
        <FichaRecurso
          titulo="Insumos"
          sugerencia={
            est.insumos.length === 0 ? (
              'Sin insumos estimados'
            ) : (
              <ul className={estilosEstimacion.lista}>
                {est.insumos.map((i) => (
                  <li key={`${i.nombre}-${i.unidad}`}>{textoInsumo(i)}</li>
                ))}
              </ul>
            )
          }
          modo={modo}
          accion={acciones.insumos}
          onAccion={(a) => onDecidir('insumos', a)}
          error={errorBloque('insumos')}
          final={final?.insumos}
          correccion={
            <EditorInsumos
              idBase="corregir-insumos"
              insumos={corregido.insumos}
              onCambiar={(insumos) => onCorregir({ insumos })}
              unidades={unidadesSugeridas(est.insumos)}
              errores={errores.insumos}
            />
          }
        />
      </div>
    </section>
  )
}
