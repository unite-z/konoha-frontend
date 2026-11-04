/**
 * «Diferencia frente a la estimación» (RF-IA-004, criterio 2 y A2): estimado, confirmado y diferencia por concepto.
 * Antes de confirmar es una vista previa que cambia al corregir; ya confirmada, la conserva para compararla con lo real.
 * La diferencia se dice con texto («+1 operario», «−2 h»), nunca solo con color.
 */
import { CeldaTexto } from '@/components/ui/CeldasTabla'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import type { DiferenciaEstimacion, EstimacionRecursos, RecursosConfirmados } from '@/types/estimacionIa'
import { textoDiferencia, textoDuracion } from '@/utils/estimacionIa'
import { formatearNumero, SIN_VALOR } from '@/utils/formato'

interface Fila {
  concepto: string
  estimado: string
  confirmado: string
  diferencia: string
  cambia: boolean
}

const COLUMNAS: ColumnaTabla<Fila>[] = [
  { clave: 'concepto', titulo: 'Concepto', render: (f) => <CeldaTexto texto={f.concepto} destacado /> },
  { clave: 'estimado', titulo: 'Estimado', render: (f) => <CeldaTexto texto={f.estimado} tono="secundario" /> },
  { clave: 'confirmado', titulo: 'Confirmado', render: (f) => <CeldaTexto texto={f.confirmado} /> },
  { clave: 'diferencia', titulo: 'Diferencia', render: (f) => <CeldaTexto texto={f.diferencia} tono={f.cambia ? 'aviso' : 'secundario'} destacado={f.cambia} /> },
]

export interface TablaDiferenciaProps {
  titulo: string
  estimacion: EstimacionRecursos | null
  confirmado: RecursosConfirmados
  diferencia: DiferenciaEstimacion
}

export default function TablaDiferencia({ titulo, estimacion, confirmado, diferencia }: TablaDiferenciaProps) {
  const unidadDuracion = estimacion?.unidad_duracion === 'jornadas' ? 'jorn.' : 'h'
  const filas: Fila[] = [
    {
      concepto: 'Operarios',
      estimado: estimacion ? formatearNumero(estimacion.operarios_sugeridos) : SIN_VALOR,
      confirmado: confirmado.operarios === null ? 'No se confirma' : formatearNumero(confirmado.operarios),
      diferencia: textoDiferencia(diferencia.operarios, diferencia.operarios !== null && Math.abs(diferencia.operarios) === 1 ? 'operario' : 'operarios'),
      cambia: Boolean(diferencia.operarios),
    },
    {
      concepto: 'Duración',
      estimado: estimacion ? textoDuracion(estimacion.duracion, estimacion.unidad_duracion) : SIN_VALOR,
      confirmado:
        confirmado.duracion === null ? 'No se confirma' : textoDuracion(confirmado.duracion, confirmado.unidad_duracion ?? estimacion?.unidad_duracion ?? 'horas'),
      diferencia: textoDiferencia(diferencia.duracion, unidadDuracion),
      cambia: Boolean(diferencia.duracion),
    },
    ...diferencia.insumos.map((i) => ({
      concepto: i.nombre,
      estimado: formatearNumero(estimacion?.insumos.find((e) => e.nombre.toLowerCase() === i.nombre.toLowerCase() && e.unidad === i.unidad)?.cantidad ?? 0),
      confirmado: formatearNumero(confirmado.insumos.find((c) => c.nombre.toLowerCase() === i.nombre.toLowerCase() && c.unidad === i.unidad)?.cantidad ?? 0),
      diferencia: textoDiferencia(i.diferencia, i.unidad),
      cambia: true,
    })),
  ]
  return <TablaDatos titulo={titulo} columnas={COLUMNAS} filas={filas} claveFila={(f) => f.concepto} />
}
