/**
 * Hueco propio de la evidencia dentro de `RevisionIa` (RD-55): el comentario técnico de la decisión y, al corregir una
 * hipótesis, la otra categoría de afectación con la plaga o enfermedad del catálogo o la afectación escrita (opcional),
 * como en «Tu validación técnica». «No es posible concluir» solo lleva el comentario.
 */
import { AreaTexto } from '@/design-system/CampoFormulario'
import CampoFormulario from '@/design-system/CampoFormulario'
import Selector from '@/design-system/Selector'
import SelectorBuscable from '@/design-system/SelectorBuscable'
import type { ContextoHueco } from '@/rediseno/base/RevisionIa/contrato'
import { buscarPlagas } from '@/services/api/evidenciaFitosanitariaIa'
import type { PlagaCatalogo } from '@/types/evidenciaFitosanitariaIa'
import { CATEGORIAS, ETIQUETA_CATEGORIA } from '@/utils/evidenciaFitosanitariaIa'
import { ID_NO_CONCLUYENTE, type ValorEvidencia } from './valorEvidencia'
import estilos from './EvidenciaKonoha.module.css'

export default function HuecoEvidencia({ contexto }: { contexto: ContextoHueco<ValorEvidencia> }) {
  const { elemento, decision, cambiar } = contexto
  const base = `evidencia-${elemento.id}`
  const corrige = decision.accion === 'corregir' && elemento.id !== ID_NO_CONCLUYENTE
  // Al pulsar «Corregir» el núcleo copia la hipótesis (con su `clave`): hasta que se elija otra categoría, no hay ninguna.
  const final = decision.valorFinal && decision.valorFinal.clave === null ? decision.valorFinal : null
  const conPlaga = final?.categoria === 'Plaga' || final?.categoria === 'Enfermedad'
  const plaga: PlagaCatalogo | null =
    final && final.plaga_id !== null ? { id: final.plaga_id, nombre: final.nombre ?? '' } : null
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
          {final?.categoria && conPlaga && (
            <SelectorBuscable<PlagaCatalogo>
              id={`${base}-plaga`}
              etiqueta={final.categoria === 'Plaga' ? 'Plaga' : 'Enfermedad'}
              ayuda="Opcional. Del catálogo de plagas y enfermedades"
              valor={plaga}
              claveDe={(p) => p.id}
              textoDe={(p) => p.nombre}
              buscar={buscarPlagas}
              onCambiar={(p) =>
                cambiar({ valorFinal: { ...final, plaga_id: p?.id ?? null, nombre: p?.nombre ?? null } })
              }
              placeholder="Busca por nombre"
            />
          )}
          {final?.categoria && !conPlaga && (
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
