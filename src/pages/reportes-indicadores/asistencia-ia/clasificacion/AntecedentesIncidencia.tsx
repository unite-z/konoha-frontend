/** Incidencias parecidas que la IA tuvo en cuenta (RF-IA-005), con su tipo y su prioridad. */
import Estado from '@/components/ui/Estado'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import Tarjeta from '@/components/ui/Tarjeta'
import type { AntecedenteIncidencia } from '@/types/clasificacionIncidenciaIa'
import { insigniaSeveridad } from '@/utils/clasificacionIncidenciaIa'
import { formatearFecha, SIN_VALOR } from '@/utils/formato'

const COLUMNAS: ColumnaTabla<AntecedenteIncidencia>[] = [
  { clave: 'codigo', titulo: 'Incidencia' },
  { clave: 'fecha', titulo: 'Fecha', render: (a) => formatearFecha(a.fecha) },
  { clave: 'tipo_evento', titulo: 'Categoría' },
  { clave: 'severidad', titulo: 'Prioridad', render: (a) => (a.severidad ? <Estado {...insigniaSeveridad(a.severidad)} /> : SIN_VALOR) },
]

export default function AntecedentesIncidencia({ antecedentes }: { antecedentes: AntecedenteIncidencia[] }) {
  return (
    <Tarjeta titulo="Incidencias parecidas" nivel={2} descripcion="Antecedentes que la IA tuvo en cuenta para sugerir la clasificación.">
      <TablaDatos
        titulo="Incidencias parecidas"
        columnas={COLUMNAS}
        filas={antecedentes}
        claveFila={(a) => a.codigo}
        compacta
        vacio={{ titulo: 'Sin incidencias parecidas', descripcion: 'No hay incidencias anteriores comparables.', nivel: 3 }}
      />
    </Tarjeta>
  )
}
