/**
 * Hueco propio de la evidencia dentro de `RevisionIa` (RD-55): el comentario técnico de la decisión y, al corregir una
 * hipótesis, la otra categoría de afectación (y la afectación concreta, opcional). «No es posible concluir» solo lleva
 * el comentario.
 */
import { AreaTexto } from '@/design-system/CampoFormulario'
import CampoFormulario from '@/design-system/CampoFormulario'
import Selector from '@/design-system/Selector'
import type { ContextoHueco } from '@/rediseno/base/RevisionIa/contrato'
import { CATEGORIAS, ETIQUETA_CATEGORIA } from '@/utils/evidenciaFitosanitariaIa'
import { ID_NO_CONCLUYENTE, type ValorEvidencia } from './valorEvidencia'
import estilos from './EvidenciaKonoha.module.css'

export default function HuecoEvidencia({ contexto }: { contexto: ContextoHueco<ValorEvidencia> }) {
  const { elemento, decision, cambiar } = contexto
  const base = `evidencia-${elemento.id}`
  const corrige = decision.accion === 'corregir' && elemento.id !== ID_NO_CONCLUYENTE
  const final = decision.valorFinal
  return (
    <div className={estilos.hueco}>
      {corrige && (
        <>
          <Selector
            id={`${base}-categoria`}
            etiqueta="Otra categoría de afectación"
            obligatorio
            valor={final?.categoria ?? ''}
            opciones={CATEGORIAS.map((c) => ({
              valor: c,
              texto: ETIQUETA_CATEGORIA[c],
            }))}
            opcionTodos="Elige la categoría"
            onCambiar={(valor) =>
              cambiar({
                valorFinal: {
                  clave: null,
                  categoria: CATEGORIAS.find((c) => c === valor) ?? null,
                  nombre: null,
                  plaga_id: null,
                },
              })
            }
          />
          {final?.categoria && (
            <CampoFormulario
              id={`${base}-nombre`}
              etiqueta="Afectación concreta"
              ayuda="Opcional. Por ejemplo: rama desgajada, clorosis"
              maxLength={120}
              value={final.nombre ?? ''}
              onChange={(e) => cambiar({ valorFinal: { ...final, nombre: e.target.value } })}
            />
          )}
        </>
      )}
      {decision.accion !== 'descartar' && (
        <AreaTexto
          id={`${base}-comentario`}
          etiqueta="Comentario técnico"
          ayuda="Opcional"
          rows={3}
          maxLength={1000}
          value={decision.comentario ?? ''}
          onChange={(e) => cambiar({ comentario: e.target.value })}
        />
      )}
    </div>
  )
}
