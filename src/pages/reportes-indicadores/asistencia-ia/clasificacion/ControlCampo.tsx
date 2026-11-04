/**
 * Control para elegir el valor de un campo de la clasificación (RF-IA-005): categoría (tipo de evento), subcategoría,
 * prioridad (con la insignia de severidad), tipo de atención y si la incidencia es sencilla. Lo usan la corrección de
 * la revisión y la clasificación manual.
 */
import Casilla from '@/components/ui/Casilla'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Estado from '@/components/ui/Estado'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import Selector from '@/components/ui/Selector'
import type { CampoClasificacion, Severidad, TipoEvento, ViaAtencion } from '@/types/clasificacionIncidenciaIa'
import { ETIQUETA_CAMPO, insigniaSeveridad, OPCIONES_VIA_ATENCION, SEVERIDADES, TIPOS_EVENTO } from '@/utils/clasificacionIncidenciaIa'
import estilos from './Clasificacion.module.css'

export interface ControlCampoProps {
  campo: CampoClasificacion
  /** Prefijo del id (único en la página). */
  idBase: string
  valor: string | boolean | null
  onCambiar: (valor: string | boolean | null) => void
  error?: string
  obligatorio?: boolean
}

/** Id del control de un campo (para llevar el foco desde el resumen de errores). */
const idDe = (idBase: string, campo: CampoClasificacion) => `${idBase}-${campo}`

export default function ControlCampo({ campo, idBase, valor, onCambiar, error, obligatorio = false }: ControlCampoProps) {
  const id = idDe(idBase, campo)
  const etiqueta = ETIQUETA_CAMPO[campo]
  if (campo === 'tipo_evento') {
    return (
      <Selector
        id={id}
        etiqueta={etiqueta}
        obligatorio={obligatorio}
        valor={typeof valor === 'string' ? valor : ''}
        opciones={TIPOS_EVENTO.map((t) => ({ valor: t, texto: t }))}
        opcionTodos="Elige la categoría"
        error={error}
        onCambiar={(v) => onCambiar(TIPOS_EVENTO.find((t): t is TipoEvento => t === v) ?? null)}
      />
    )
  }
  if (campo === 'severidad') {
    const severidad = SEVERIDADES.find((s): s is Severidad => s === valor)
    return (
      <div className={estilos.controlSeveridad}>
        <Selector
          id={id}
          etiqueta={etiqueta}
          obligatorio={obligatorio}
          valor={severidad ?? ''}
          opciones={SEVERIDADES.map((s) => ({ valor: s, texto: s }))}
          opcionTodos="Elige la prioridad"
          error={error}
          onCambiar={(v) => onCambiar(SEVERIDADES.find((s) => s === v) ?? null)}
        />
        {severidad && <Estado {...insigniaSeveridad(severidad)} />}
      </div>
    )
  }
  if (campo === 'via_atencion') {
    return (
      <GrupoOpciones<ViaAtencion>
        etiqueta={etiqueta}
        nombre={id}
        obligatorio={obligatorio}
        opciones={OPCIONES_VIA_ATENCION}
        valor={valor === 'PersonalPropio' || valor === 'Tercerizado' ? valor : null}
        error={error}
        onCambiar={onCambiar}
      />
    )
  }
  if (campo === 'es_sencilla') {
    return (
      <Casilla
        id={id}
        etiqueta="Incidencia sencilla"
        ayuda="Se atiende en un día, como máximo en 48 horas (RN-019)"
        marcada={valor === true}
        onCambiar={onCambiar}
      />
    )
  }
  return (
    <CampoFormulario
      id={id}
      etiqueta={etiqueta}
      ayuda="Por ejemplo: Arbolado, Riego, Plagas o Infraestructura"
      value={typeof valor === 'string' ? valor : ''}
      error={error}
      onChange={(e) => onCambiar(e.target.value.trim() === '' ? null : e.target.value)}
    />
  )
}
