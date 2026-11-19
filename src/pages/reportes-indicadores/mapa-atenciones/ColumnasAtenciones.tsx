/**
 * Columnas de las atenciones del mapa (RF-REP-007): la lista bajo el mapa y la ventana de un espacio o ejemplar.
 * Solo las atenciones tercerizadas enlazan a su ficha de MOD-05; una actividad del personal propio no tiene ficha aquí.
 */
import { Link } from 'react-router'
import Estado from '@/design-system/Estado'
import type { ColumnaTabla } from '@/design-system/TablaDatos'
import { insigniaAEstado } from '@/design-system/tonos'
import { rutaDetalleAtencion } from '@/router/rutasApp'
import { formatearFecha, SIN_VALOR } from '@/utils/formato'
import { esAtencionTercerizada, type FilaMapa } from '@/utils/mapaAtenciones'
import { nombreEjemplar } from '@/utils/nombreEjemplar'
import { insigniaEstadoAtencion } from '@/utils/reportesGestion'

const COLUMNAS_BASE: ColumnaTabla<FilaMapa>[] = [
  { clave: 'fecha', titulo: 'Fecha', ordenable: true, render: (f) => formatearFecha(f.fecha) },
  {
    clave: 'codigo',
    titulo: 'Atención',
    // El clic en el enlace abre la atención sin elegir la fila.
    render: (f) =>
      esAtencionTercerizada(f) ? (
        <Link to={rutaDetalleAtencion(f.atencion_id)} onClick={(e) => e.stopPropagation()}>
          {f.codigo}
        </Link>
      ) : (
        f.codigo
      ),
  },
  { clave: 'tipo_atencion', titulo: 'Tipo de atención', ordenable: true },
  {
    clave: 'modalidad',
    titulo: 'Modalidad',
    ordenable: true,
    render: (f) => (esAtencionTercerizada(f) ? 'Tercerizado' : 'Personal propio'),
  },
  { clave: 'tipo_servicio', titulo: 'Servicio o actividad' },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (f) =>
      esAtencionTercerizada(f) ? (
        <Estado {...insigniaAEstado(insigniaEstadoAtencion(f.estado))} />
      ) : (
        <Estado tono="neutro" texto={`Parte ${f.estado.toLocaleLowerCase('es')}`} />
      ),
  },
  { clave: 'proveedor', titulo: 'Responsable', ordenable: true },
]

const COLUMNA_EJEMPLAR: ColumnaTabla<FilaMapa> = {
  clave: 'ejemplar_codigo',
  titulo: 'Ejemplar',
  render: (f) => (f.ejemplar_codigo ? nombreEjemplar(f.ejemplar_codigo, f.ejemplar_alias) : SIN_VALOR),
}

/** Lista bajo el mapa: con el espacio, el ejemplar y si está en el mapa. */
export const COLUMNAS_LISTA: ColumnaTabla<FilaMapa>[] = [
  ...COLUMNAS_BASE,
  { clave: 'espacio', titulo: 'Espacio', ordenable: true },
  COLUMNA_EJEMPLAR,
  {
    clave: 'con_ubicacion',
    titulo: 'Ubicación',
    render: (f) =>
      f.con_ubicacion ? <Estado tono="info" texto="En el mapa" /> : <Estado tono="neutro" texto="Sin ubicación" />,
  },
]

/** Ventana de un espacio o ejemplar: el espacio ya va en el título. */
export const COLUMNAS_VENTANA: ColumnaTabla<FilaMapa>[] = [...COLUMNAS_BASE, COLUMNA_EJEMPLAR]
