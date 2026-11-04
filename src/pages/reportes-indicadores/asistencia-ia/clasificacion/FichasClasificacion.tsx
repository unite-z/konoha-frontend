/**
 * Fichas de decisión de una clasificación (RF-IA-005): una por campo (categoría, subcategoría, prioridad, tipo de
 * atención y si es sencilla), con el valor sugerido y su motivo frente a «Tu decisión». Al corregir, el control del
 * campo. Ya registrada, muestra el valor registrado.
 */
import FichaDecisionIA from '@/components/reportes-indicadores/FichaDecisionIA'
import Estado from '@/components/ui/Estado'
import type { CampoClasificacion, ContenidoClasificacion } from '@/types/clasificacionIncidenciaIa'
import type { AccionDecision } from '@/types/ia'
import { camposADecidir, ETIQUETA_CAMPO, idFicha, insigniaSeveridad, textoValor, type DecisionEnCursoCampo } from '@/utils/clasificacionIncidenciaIa'
import estilos from '@/pages/reportes-indicadores/reportes/Reportes.module.css'
import estilosClasificacion from './Clasificacion.module.css'
import ControlCampo from './ControlCampo'

export interface FichasClasificacionProps {
  contenido: ContenidoClasificacion
  modo: 'editar' | 'final' | 'consulta'
  decisiones: Partial<Record<CampoClasificacion, DecisionEnCursoCampo>>
  onDecidir: (campo: CampoClasificacion, accion: AccionDecision) => void
  onCorregir: (campo: CampoClasificacion, valor: string | boolean | null) => void
  /** Errores por campo (solo tras intentar registrar). */
  errores: Partial<Record<CampoClasificacion, string>>
}

export default function FichasClasificacion({ contenido, modo, decisiones, onDecidir, onCorregir, errores }: FichasClasificacionProps) {
  const { sugerencia, motivos, decision } = contenido
  const campos = camposADecidir(sugerencia)

  return (
    <section className={estilos.seccion} aria-labelledby="titulo-clasificacion">
      <h2 id="titulo-clasificacion" className={estilos.tituloSeccion}>
        Clasificación sugerida
      </h2>
      {campos.map((campo) => {
        const sugerido = sugerencia?.[campo] ?? null
        const registrado = decision?.valores_registrados[campo] ?? null
        const accionFinal = decision?.por_campo[campo]?.accion
        return (
          <div key={campo} id={idFicha(campo)}>
            <FichaDecisionIA
              titulo={ETIQUETA_CAMPO[campo]}
              sugerencia={
                <span className={estilosClasificacion.sugerencia}>
                  {campo === 'severidad' && typeof sugerido === 'string' ? (
                    <Estado {...insigniaSeveridad(sugerido as 'Alta' | 'Media' | 'Baja')} />
                  ) : (
                    <span>{sugerido === null ? 'La IA no lo sugiere' : textoValor(campo, sugerido)}</span>
                  )}
                  {motivos[campo] && <span className={estilosClasificacion.motivo}>{motivos[campo]}</span>}
                </span>
              }
              modo={modo}
              accion={modo === 'final' ? accionFinal : decisiones[campo]?.accion}
              onAccion={(a) => onDecidir(campo, a)}
              error={errores[campo]}
              textoFinal="Registrado"
              final={textoValor(campo, registrado)}
              correccion={
                <ControlCampo
                  campo={campo}
                  idBase="corregir"
                  obligatorio
                  valor={decisiones[campo]?.valor ?? null}
                  onCambiar={(v) => onCorregir(campo, v)}
                />
              }
            />
          </div>
        )
      })}
    </section>
  )
}
