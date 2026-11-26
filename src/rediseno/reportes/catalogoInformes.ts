import { RUTAS } from '@/router/rutasApp'

/** Los seis informes de Reportes (M6-01): su clave va en `?informe=` y cada ticket de informe (RD-60 y RD-61) los construye. */
export interface InformeReportes {
  clave: string
  titulo: string
  descripcion: string
  /** Pantalla actual del informe: el panel la enlaza hasta que RD-60 y RD-61 lo traigan a esta vista. */
  rutaActual: string
}

export const INFORMES: readonly InformeReportes[] = [
  {
    clave: 'cumplimiento-corte',
    rutaActual: RUTAS.cumplimientoCorte,
    titulo: 'Cumplimiento del corte de césped',
    descripcion: 'Días entre ciclos frente a la frecuencia y días de ejecución frente a la duración máxima.',
  },
  {
    clave: 'distribucion-personal',
    rutaActual: RUTAS.distribucionPersonal,
    titulo: 'Distribución del personal',
    descripcion: 'Personal por cuadrilla, actividad, espacio y jornada, con las horas-persona registradas.',
  },
  {
    clave: 'atenciones-espacio-sector',
    rutaActual: RUTAS.atencionesEspacioSector,
    titulo: 'Atenciones por espacio y sector',
    descripcion: 'Número de atenciones por sector y espacio en un periodo, para priorizar espacios.',
  },
  {
    clave: 'material-vegetal',
    rutaActual: RUTAS.materialVegetal,
    titulo: 'Material vegetal',
    descripcion: 'Material vegetal e insumos consumidos, propagados y trasladados en un mes, por tipo y espacio.',
  },
  {
    clave: 'servicio-tercerizado',
    rutaActual: RUTAS.reporteServicioTercerizado,
    titulo: 'Servicio tercerizado',
    descripcion: 'Avance, rendimiento, especies o plagas atendidas y conformidad de un servicio en un periodo.',
  },
  {
    clave: 'programado-ejecutado',
    rutaActual: RUTAS.programadoEjecutado,
    titulo: 'Programado y ejecutado',
    descripcion: 'Trabajos programados en un periodo, sus ejecuciones vinculadas, pendientes y desviaciones.',
  },
]
