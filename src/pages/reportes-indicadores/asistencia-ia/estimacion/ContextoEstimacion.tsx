/**
 * «Variables consideradas» y «Antecedentes comparables» de una estimación (RF-IA-004, criterios 1 y 5): con qué datos
 * de origen trabajó la IA. En móvil, los antecedentes se pliegan.
 */
import { useEsMovil } from '../../../../components/reportes-indicadores/useEsMovil'
import ListaDescripcion from '../../../../components/ui/ListaDescripcion'
import TablaDatos, { type ColumnaTabla } from '../../../../components/ui/TablaDatos'
import Tarjeta from '../../../../components/ui/Tarjeta'
import type { AntecedenteComparable, VariableConsiderada } from '../../../../types/estimacionIa'
import { formatearFecha, formatearNumero, SIN_VALOR } from '../../../../utils/formato'
import estilos from './Estimacion.module.css'

const COLUMNAS: ColumnaTabla<AntecedenteComparable>[] = [
  { clave: 'codigo', titulo: 'Actividad' },
  { clave: 'fecha', titulo: 'Fecha', render: (a) => formatearFecha(a.fecha) },
  { clave: 'espacio', titulo: 'Espacio' },
  { clave: 'operarios', titulo: 'Operarios', alineacion: 'derecha', render: (a) => (a.operarios === null ? SIN_VALOR : formatearNumero(a.operarios)) },
  {
    clave: 'duracion_horas',
    titulo: 'Duración real',
    alineacion: 'derecha',
    render: (a) => (a.duracion_horas === null ? SIN_VALOR : `${formatearNumero(a.duracion_horas)} h`),
  },
]

export default function ContextoEstimacion({ variables, antecedentes }: { variables: VariableConsiderada[]; antecedentes: AntecedenteComparable[] }) {
  const esMovil = useEsMovil()
  const tabla = (
    <TablaDatos
      titulo="Antecedentes comparables"
      columnas={COLUMNAS}
      filas={antecedentes}
      claveFila={(a) => a.codigo}
      vacio={{ titulo: 'Sin antecedentes comparables', descripcion: 'No hay actividades parecidas registradas.', nivel: 3 }}
    />
  )
  return (
    <>
      {variables.length > 0 && (
        <Tarjeta titulo="Variables consideradas" nivel={2}>
          <ListaDescripcion elementos={variables.map((v) => ({ etiqueta: v.nombre, valor: v.valor }))} />
        </Tarjeta>
      )}
      <Tarjeta titulo="Antecedentes comparables" nivel={2} descripcion="Actividades parecidas con sus operarios y su duración reales.">
        {esMovil ? (
          <details className={estilos.pila}>
            <summary className={estilos.secundario}>Ver {formatearNumero(antecedentes.length)} antecedentes</summary>
            {tabla}
          </details>
        ) : (
          tabla
        )}
      </Tarjeta>
    </>
  )
}
