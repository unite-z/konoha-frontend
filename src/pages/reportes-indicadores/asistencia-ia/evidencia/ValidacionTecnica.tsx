/**
 * «Tu validación técnica» (RF-IA-006, criterios 2 y 4 y A2): confirmar una hipótesis, registrar otra categoría (con la
 * plaga del catálogo o la afectación escrita) o «No es posible concluir» (queda pendiente de diagnóstico), más un
 * comentario técnico opcional. Ninguna opción viene marcada. Lo usan la revisión y la evaluación manual.
 */
import { AreaTexto } from '@/components/ui/CampoFormulario'
import CampoFormulario from '@/components/ui/CampoFormulario'
import GrupoOpciones, { type OpcionGrupo } from '@/components/ui/GrupoOpciones'
import Selector from '@/components/ui/Selector'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
import { buscarPlagas } from '@/services/api/evidenciaFitosanitariaIa'
import type { HipotesisFitosanitaria, PlagaCatalogo } from '@/types/evidenciaFitosanitariaIa'
import {
  CATEGORIAS,
  ETIQUETA_CATEGORIA,
  opcionHipotesis,
  ordenarHipotesis,
  textoConfianza,
  type ErroresValidacion,
  type FormularioValidacion,
  type OpcionValidacion,
} from '@/utils/evidenciaFitosanitariaIa'
import estilos from './Evidencia.module.css'

export interface ValidacionTecnicaProps {
  /** Prefijo de los ids (único en la página). */
  idBase: string
  hipotesis: HipotesisFitosanitaria[]
  formulario: FormularioValidacion
  onCambiar: (cambio: Partial<FormularioValidacion>) => void
  errores: ErroresValidacion
}

export default function ValidacionTecnica({ idBase, hipotesis, formulario, onCambiar, errores }: ValidacionTecnicaProps) {
  const opciones: OpcionGrupo<OpcionValidacion>[] = [
    ...ordenarHipotesis(hipotesis).map((h) => ({
      valor: opcionHipotesis(h.clave),
      texto: `Confirmar hipótesis: ${h.nombre}`,
      descripcion: `${ETIQUETA_CATEGORIA[h.categoria]} · confianza ${textoConfianza(h).toLowerCase()}`,
    })),
    { valor: 'otra', texto: 'Registrar otra categoría', descripcion: 'La afectación no coincide con ninguna hipótesis' },
    { valor: 'no-concluyente', texto: 'No es posible concluir', descripcion: 'La evaluación quedará pendiente de diagnóstico' },
  ]
  const conPlaga = formulario.categoria === 'Plaga' || formulario.categoria === 'Enfermedad'
  const plaga: PlagaCatalogo | null = formulario.plaga_id ? { id: formulario.plaga_id, nombre: formulario.nombre } : null

  return (
    <div className={estilos.pila}>
      <GrupoOpciones
        etiqueta="Tu validación técnica"
        idBase={`${idBase}-opcion`}
        obligatorio
        opciones={opciones}
        valor={formulario.opcion}
        error={errores.opcion}
        onCambiar={(opcion) => onCambiar({ opcion })}
      />
      {formulario.opcion === 'otra' && (
        <>
          <Selector
            id={`${idBase}-categoria`}
            etiqueta="Categoría de afectación"
            obligatorio
            valor={formulario.categoria ?? ''}
            opciones={CATEGORIAS.map((c) => ({ valor: c, texto: ETIQUETA_CATEGORIA[c] }))}
            opcionTodos="Elige la categoría"
            error={errores.categoria}
            onCambiar={(v) => onCambiar({ categoria: CATEGORIAS.find((c) => c === v) ?? null, plaga_id: null, nombre: '' })}
          />
          {conPlaga ? (
            <SelectorBuscable<PlagaCatalogo>
              id={`${idBase}-plaga`}
              etiqueta={formulario.categoria === 'Plaga' ? 'Plaga' : 'Enfermedad'}
              ayuda="Opcional. Del catálogo de plagas y enfermedades"
              valor={plaga}
              claveDe={(p) => p.id}
              textoDe={(p) => p.nombre}
              buscar={buscarPlagas}
              onCambiar={(p) => onCambiar({ plaga_id: p?.id ?? null, nombre: p?.nombre ?? '' })}
              placeholder="Busca por nombre"
            />
          ) : (
            formulario.categoria && (
              <CampoFormulario
                id={`${idBase}-nombre`}
                etiqueta="Afectación concreta"
                ayuda="Opcional. Por ejemplo: rama desgajada, clorosis"
                maxLength={120}
                value={formulario.nombre}
                onChange={(e) => onCambiar({ nombre: e.target.value })}
              />
            )
          )}
        </>
      )}
      <AreaTexto
        id={`${idBase}-comentario`}
        etiqueta="Comentario técnico"
        ayuda="Opcional"
        rows={3}
        maxLength={1000}
        value={formulario.comentario}
        onChange={(e) => onCambiar({ comentario: e.target.value })}
      />
    </div>
  )
}
