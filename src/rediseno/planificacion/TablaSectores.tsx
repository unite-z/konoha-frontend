import BarraAvance from '@/design-system/BarraAvance'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import TablaDatos, { type ColumnaTabla } from '@/design-system/TablaDatos'
import type { ResultadoConsulta } from '@/hooks/useConsulta'
import type { AvanceSector, ResumenSectores } from '@/types/resumenSectores'
import { estiloTransicion, fila, useNavegarConTransicion } from '../base/movimiento'
import { rutaPlanificacionSector } from './enlaces'
import { servicioDeSector, serviciosPresentes, textoPorcentaje } from './sectores'
import estilos from './Sectores.module.css'

export interface TablaSectoresProps {
  consulta: ResultadoConsulta<ResumenSectores>
  /** `true` si no hay ciclo que consultar. */
  sinCiclo: boolean
  /** El backend aún no tiene `resumen-sectores/` (404): la vista sigue con el avance del ciclo en días. */
  noDisponible: boolean
}

/** Tabla por sector con corte, riego y poda (RD-15); si el resumen solo trae corte, solo esa columna. */
export default function TablaSectores({ consulta, sinCiclo, noDisponible }: TablaSectoresProps) {
  const navegar = useNavegarConTransicion()
  const datos = consulta.datos
  const columnas: ColumnaTabla<AvanceSector>[] = [
    {
      clave: 'sector',
      titulo: 'Sector',
      ordenable: true,
      render: (sector) => (
        <span className={estilos.nombreSector} style={estiloTransicion(fila(`sector-${sector.sector_id}`))} /* estilo-calculado */>
          {sector.sector}
        </span>
      ),
    },
    ...(datos
      ? serviciosPresentes(datos).map<ColumnaTabla<AvanceSector>>(({ clave, texto }) => ({
          clave,
          titulo: texto,
          ordenable: true,
          valorOrden: (sector) => servicioDeSector(sector.servicios, clave)?.porcentaje ?? null,
          render: (sector) => {
            const servicio = servicioDeSector(sector.servicios, clave)
            if (!servicio || servicio.programado === 0) return <span className={estilos.leyenda}>Sin programar</span>
            return (
              <span className={estilos.celdaAvance}>
                <span>
                  {textoPorcentaje(servicio.porcentaje)} <span className={estilos.leyenda}>({servicio.ejecutado} de {servicio.programado})</span>
                </span>
                <BarraAvance valor={servicio.ejecutado} maximo={servicio.programado} etiqueta={`${texto} de ${sector.sector}`} textoValor={textoPorcentaje(servicio.porcentaje)} />
              </span>
            )
          },
        }))
      : []),
  ]

  let cuerpo
  if (sinCiclo) {
    cuerpo = <TablaDatos titulo="Avance por sector" columnas={columnas} filas={[]} claveFila={() => ''} sinMarco vacio={{ titulo: 'Sin ciclo que mostrar', descripcion: 'Cuando haya un ciclo programado, aquí verás su avance por sector.', nivel: 3 }} />
  } else if (noDisponible) {
    cuerpo = <TablaDatos titulo="Avance por sector" columnas={columnas} filas={[]} claveFila={() => ''} sinMarco vacio={{ titulo: 'Avance por sector aún no disponible', descripcion: 'El servidor todavía no entrega el avance por sector. Arriba ves el avance del ciclo en días.', nivel: 3 }} />
  } else if (consulta.estado === 'error') {
    cuerpo =
      consulta.error?.estado === 403 ? (
        <EstadoSinAcceso nivel={3} titulo="No puedes ver el avance por sector" />
      ) : (
        <EstadoError nivel={3} titulo="No pudimos cargar el avance por sector" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
      )
  } else {
    cuerpo = (
      <TablaDatos
        titulo="Avance por sector"
        columnas={columnas}
        filas={datos?.sectores ?? []}
        claveFila={(sector) => String(sector.sector_id)}
        estado={datos ? 'exito' : 'cargando'}
        sinMarco
        onFilaClick={(sector) => navegar(rutaPlanificacionSector(sector.sector_id))}
        vacio={{ titulo: 'Sin sectores', descripcion: 'No hay sectores activos con áreas verdes asignadas.', nivel: 3 }}
      />
    )
  }
  return (
    <section className={estilos.vidrio} aria-labelledby="titulo-tabla-sectores">
      <div className={estilos.cabeceraPanel}>
        <h2 id="titulo-tabla-sectores">Avance por sector</h2>
      </div>
      {cuerpo}
    </section>
  )
}
