/**
 * Ficha de un dato en la revisión de RF-IA-001 (RN-IA-001): a la izquierda, lo que propone la IA (panel azul
 * con «Sugerencia de la IA»); a la derecha, la decisión de la persona o, ya validada, el valor final.
 * Los ids de las opciones y del campo de corrección son los que usa el resumen de errores para llevar el foco.
 */
import type { ReactNode } from 'react'
import CampoFormulario, { AreaTexto } from '@/components/ui/CampoFormulario'
import Icono from '@/components/ui/Icono'
import Selector from '@/components/ui/Selector'
import { claveCampo, type AccionDecision, type CampoSolicitado, type DecisionFinalCampo, type TipoDato, type ValorCampo } from '@/types/ia'
import { ETIQUETA_OPCION_ACCION, insigniaAccion } from '@/utils/estados'
import { SIN_VALOR } from '@/utils/formato'
import estilos from './FichaCampo.module.css'
import { ACCIONES, idCorreccion, MENSAJES, partirEnLineas, textoValorSimple, tieneValor } from './valoresCampo'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import Estado from '@/components/ui/Estado'
import { insigniaAEstado } from '@/components/ui/tonos'

/** Decisión en curso de un dato. */
export interface DecisionCampo {
  accion?: AccionDecision
  texto: string
}

/**
 * Valor legible: textos largos en líneas (saltos de línea o tramos horarios), listas JSON con un bloque por
 * elemento y un par «clave: valor» por línea, cifras y fechas con el formato de la Guía Web 7.
 */
function ValorLegible({ valor, tipo, textoNulo }: { valor: ValorCampo; tipo: TipoDato | null; textoNulo: string }) {
  if (!tieneValor(valor)) return <span className={estilos.noEncontrado}>{textoNulo}</span>
  if (Array.isArray(valor)) {
    if (valor.length === 0) return <span className={estilos.noEncontrado}>{SIN_VALOR}</span>
    return (
      <ul className={estilos.listaJson}>
        {valor.map((objeto, i) => (
          <li key={i} className={estilos.elementoJson}>
            {objeto && typeof objeto === 'object'
              ? Object.entries(objeto).map(([clave, v]) => (
                  <span key={clave} className={estilos.lineaValor}>
                    <span className={estilos.claveJson}>{clave}:</span> {textoValorSimple(v)}
                  </span>
                ))
              : textoValorSimple(objeto)}
          </li>
        ))}
      </ul>
    )
  }
  if (typeof valor === 'string' && tipo !== 'Fecha') {
    const lineas = partirEnLineas(valor)
    if (lineas.length > 1) {
      return (
        <ul className={estilos.lineas}>
          {lineas.map((linea, i) => (
            <li key={i}>{linea}</li>
          ))}
        </ul>
      )
    }
  }
  return <span className={typeof valor === 'number' ? 'cifra' : undefined}>{textoValorSimple(valor, tipo)}</span>
}

export interface FichaCampoProps {
  campo: CampoSolicitado
  sugerido: ValorCampo
  /** editar: decide la persona; final: ya validada; consulta: sin permiso para decidir. */
  modo: 'editar' | 'final' | 'consulta'
  decision?: DecisionCampo
  error?: string
  final?: DecisionFinalCampo
  onAccion: (accion: AccionDecision) => void
  onTexto: (texto: string) => void
  onSalir: () => void
}

export default function FichaCampo({ campo, sugerido, modo, decision, error, final, onAccion, onTexto, onSalir }: FichaCampoProps) {
  const clave = claveCampo(campo.campo_id)
  const nombre = campo.nombre_campo ?? clave
  const sinValor = !tieneValor(sugerido)
  const errorPendiente = error === MENSAJES.sinDecision
  const idTitulo = `dato-${clave}`
  const idAyuda = `ayuda-${clave}`

  let estado = estilos.pendiente
  let insignia: ReactNode = modo === 'editar' ? <Estado tono="neutro" texto="Pendiente" /> : null
  if (error) {
    estado = estilos.conError
    insignia = <Estado tono="error" texto={errorPendiente ? 'Falta decidir' : 'Revisa el valor'} />
  } else if (modo === 'editar' && decision?.accion) {
    estado = estilos.decidido
    insignia = <Estado {...insigniaAEstado(insigniaAccion(decision.accion))} />
  } else if (modo === 'final' && final) {
    estado = estilos.decidido
    insignia = <Estado {...insigniaAEstado(insigniaAccion(final.accion))} />
  }

  function correccion(): ReactNode {
    const comun = {
      id: idCorreccion(clave),
      etiqueta: `Valor corregido de ${nombre}`,
      error: error && !errorPendiente ? error : undefined,
    }
    const texto = decision?.texto ?? ''
    switch (campo.tipo_dato) {
      case 'Texto largo':
      case 'JSON':
        return (
          <AreaTexto
            {...comun}
            rows={campo.tipo_dato === 'JSON' ? 4 : 3}
            value={texto}
            onChange={(e) => onTexto(e.target.value)}
            onBlur={onSalir}
          />
        )
      case 'Booleano':
        return (
          <Selector
            {...comun}
            valor={texto}
            opcionTodos="Elige una opción"
            opciones={[
              { valor: 'si', texto: 'Sí' },
              { valor: 'no', texto: 'No' },
            ]}
            onCambiar={onTexto}
          />
        )
      default:
        return (
          <CampoFormulario
            {...comun}
            type={campo.tipo_dato === 'Fecha' ? 'date' : 'text'}
            formato={campo.tipo_dato === 'Entero' ? 'entero' : campo.tipo_dato === 'Decimal' ? 'decimal' : undefined}
            negativo
            value={texto}
            onChange={(e) => onTexto(e.target.value)}
            onBlur={onSalir}
          />
        )
    }
  }

  return (
    <li>
      <article className={`${estilos.ficha} ${estado}`} aria-labelledby={idTitulo}>
        <div className={estilos.cabecera}>
          <h3 id={idTitulo} className={estilos.nombre}>
            {nombre}
            {campo.obligatorio && (
              <>
                <span className={estilos.asterisco} aria-hidden="true">
                  {' '}
                  *
                </span>
                <span className="sr-only"> (obligatorio)</span>
              </>
            )}
          </h3>
          {campo.tipo_dato && <span className={estilos.tipo}>{campo.tipo_dato}</span>}
          <span className={estilos.insignia}>{insignia}</span>
        </div>

        <div className={`${estilos.cuerpo} ${modo === 'consulta' ? estilos.unaColumna : ''}`}>
          <div className={estilos.panelIa}>
            <span className={estilos.etiquetaIa}>
              <Icono nombre="destello" tamano="sm" /> Sugerencia de la IA
            </span>
            <div className={estilos.valor}>
              <ValorLegible valor={sugerido} tipo={campo.tipo_dato} textoNulo="No encontrado en el informe" />
            </div>
          </div>

          {modo === 'editar' && (
            <div className={estilos.panelDecision}>
              {/* Ids `decision-${clave}-${accion}` (idDecision): los enlaza el resumen de pendientes. */}
              <GrupoOpciones
                etiqueta="Tu decisión"
                idBase={`decision-${clave}`}
                horizontal
                opciones={ACCIONES.map((accion) => ({
                  valor: accion,
                  texto: ETIQUETA_OPCION_ACCION[accion],
                  deshabilitada: accion === 'aceptar' && sinValor,
                }))}
                valor={decision?.accion ?? null}
                onCambiar={onAccion}
                descritoPor={[sinValor && idAyuda, errorPendiente && `error-${clave}`].filter(Boolean).join(' ') || undefined}
              />
              {sinValor && (
                <p id={idAyuda} className={estilos.ayuda}>
                  {MENSAJES.sinValorAceptar}
                </p>
              )}
              {errorPendiente && (
                <p id={`error-${clave}`} className={estilos.error}>
                  {MENSAJES.sinDecision}
                </p>
              )}
              {decision?.accion === 'corregir' && <div className={estilos.correccion}>{correccion()}</div>}
            </div>
          )}

          {modo === 'final' && (
            <div className={estilos.panelFinal}>
              <span className={estilos.etiquetaDecision}>Valor final</span>
              <div className={estilos.valor}>
                {!final ? (
                  <span className={estilos.noEncontrado}>{SIN_VALOR}</span>
                ) : final.accion === 'descartar' ? (
                  <span className={estilos.noEncontrado}>Descartado: no se registra</span>
                ) : (
                  <ValorLegible valor={final.valor_final} tipo={campo.tipo_dato} textoNulo={SIN_VALOR} />
                )}
              </div>
            </div>
          )}
        </div>
      </article>
    </li>
  )
}
