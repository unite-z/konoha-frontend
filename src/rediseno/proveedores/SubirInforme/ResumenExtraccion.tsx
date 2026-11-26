/** Resumen de la propuesta de extracción dentro de «Konoha propone» (RD-56): identificación, cobertura y filtros de datos. */
import { GrupoChips } from '@/design-system/ChipsFiltro'
import Estado from '@/design-system/Estado'
import {
  coberturaSugerencia,
  type FiltroCampos,
} from '@/pages/reportes-indicadores/asistencia-ia/extraccion/valoresCampo'
import type { SugerenciaIA } from '@/types/ia'
import { formatearFecha, formatearNumero, SIN_VALOR } from '@/utils/formato'
import estilos from './SubirInforme.module.css'

const OPCIONES_FILTRO: { valor: FiltroCampos; texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'pendientes', texto: 'Pendientes' },
  { valor: 'sin_valor', texto: 'No encontrados' },
  { valor: 'obligatorios', texto: 'Obligatorios' },
]

export interface ResumenExtraccionProps {
  sugerencia: SugerenciaIA
  filtro: FiltroCampos
  onFiltro: (filtro: FiltroCampos) => void
  /** «Pendientes» solo existe mientras la persona decide. */
  conPendientes: boolean
  visibles: number
}

export default function ResumenExtraccion({
  sugerencia,
  filtro,
  onFiltro,
  conPendientes,
  visibles,
}: ResumenExtraccionProps) {
  const { entrada } = sugerencia.contenido
  const { atencion, informe } = sugerencia
  const { conValor, total } = coberturaSugerencia(sugerencia)
  const faltan = sugerencia.contenido.campos_obligatorios_faltantes.length
  return (
    <div className={estilos.resumen}>
      <p className={estilos.resumenTitulo}>
        {atencion?.codigo ?? `Atención n.º ${entrada.atencion_id}`}
        {atencion && ` · ${atencion.proveedor ?? SIN_VALOR} · ${atencion.tipo_servicio ?? SIN_VALOR}`}
      </p>
      <p className={estilos.secundario}>
        {informe
          ? `Informe: revisión ${informe.revision}, recibido el ${formatearFecha(informe.fecha_recepcion)}`
          : `Reporte n.º ${entrada.reporte_proveedor_id}`}
        {` · formato estándar versión ${entrada.formato_version ?? SIN_VALOR}`}
      </p>
      <p className={`${estilos.secundario} cifra`}>
        Datos encontrados por la IA: {formatearNumero(conValor)} de {formatearNumero(total)}
      </p>
      {faltan > 0 && (
        <Estado
          tono="aviso"
          texto={faltan === 1 ? '1 dato obligatorio sin valor' : `${faltan} datos obligatorios sin valor`}
        />
      )}
      <GrupoChips
        etiqueta="Mostrar datos"
        opciones={OPCIONES_FILTRO.filter((o) => conPendientes || o.valor !== 'pendientes')}
        valor={filtro}
        onCambiar={(v) => onFiltro(v as FiltroCampos)}
      />
      {visibles === 0 && <p role="status">Ningún dato con este filtro. Elige «Todos» para ver todos los datos.</p>}
    </div>
  )
}
