/**
 * Elección del formato de una exportación (RF-REP-009) con `GrupoOpciones` (Radio compacto del sistema).
 * Solo muestra los formatos que admite el tipo de reporte.
 */
import GrupoOpciones from '@/design-system/GrupoOpciones'
import type { FormatoSalida } from '@/types/exportaciones'
import { TEXTO_FORMATO } from '@/utils/exportaciones'

export interface SelectorFormatoProps {
  /** Prefijo del `name` de los radios (único en la página). */
  nombre: string
  formatos: FormatoSalida[]
  valor: FormatoSalida
  onCambiar: (formato: FormatoSalida) => void
}

export default function SelectorFormato({ nombre, formatos, valor, onCambiar }: SelectorFormatoProps) {
  return (
    <GrupoOpciones
      etiqueta="Formato"
      nombre={`${nombre}-formato`}
      opciones={formatos.map((formato) => ({ valor: formato, texto: TEXTO_FORMATO[formato] }))}
      valor={valor}
      onCambiar={onCambiar}
    />
  )
}
