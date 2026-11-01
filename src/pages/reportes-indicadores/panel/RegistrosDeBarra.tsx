/**
 * Registros de una barra del desglose del panel (contenido del diálogo «Ver detalles»): descarga los registros
 * del indicador con los filtros del panel (hasta el tope) y se queda con los de la barra elegida.
 */
import EstadoCarga from '../../../components/ui/EstadoCarga'
import EstadoError from '../../../components/ui/EstadoError'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import { useConsulta } from '../../../hooks/useConsulta'
import type { ClaveIndicadorPanel, ConsultaGestion } from '../../../types/reportesGestion'
import { filtroDeBarra } from './desglose'
import { cargarRegistros } from './registros'
import TablaRegistros from './TablaRegistros'

export interface RegistrosDeBarraProps {
  clave: ClaveIndicadorPanel
  etiqueta: string
  titulo: string
  consulta: ConsultaGestion
  /** Identifica los filtros aplicados (para repetir la descarga solo si cambian). */
  claveFiltros: string
}

export default function RegistrosDeBarra({ clave, etiqueta, titulo, consulta, claveFiltros }: RegistrosDeBarraProps) {
  const registros = useConsulta(`registros|${clave}|${claveFiltros}`, (signal) =>
    cargarRegistros<unknown>(clave, consulta, signal),
  )

  if (registros.estado === 'error' && registros.error) {
    return (
      <EstadoError
        nivel={3}
        titulo="No se pudieron cargar los registros"
        descripcion={registros.error.detalle}
        onReintentar={registros.reintentar}
      />
    )
  }
  if (!registros.datos) return registros.cargaVisible ? <EstadoCarga forma="tabla" /> : null

  const filtro = filtroDeBarra(clave, etiqueta)
  const filas = filtro ? registros.datos.results.filter(filtro) : []
  if (filas.length === 0) {
    return <EstadoVacio nivel={3} titulo="Sin registros" descripcion="No hay registros para esta parte del gráfico." />
  }
  return <TablaRegistros clave={clave} titulo={`Registros de ${titulo}`} filas={filas} incompleto={!registros.datos.completo} />
}
