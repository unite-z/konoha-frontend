import BarraAvance from '@/design-system/BarraAvance'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import TablaDatos, { type ColumnaTabla } from '@/design-system/TablaDatos'
import type { ResultadoConsulta } from '@/hooks/useConsulta'
import { fechasCiclo } from '@/pages/planificacion/ciclos/ciclos'
import type { FechaIso } from '@/types/comun'
import type { AvanceSector, ResumenSectores } from '@/types/resumenSectores'
import { estiloTransicion, fila } from '../base/movimiento'
import { servicioDeSector, serviciosPresentes, textoPorcentaje } from './sectores'
import estilos from './Sectores.module.css'

export interface TablaSectoresProps {
  consulta: ResultadoConsulta<ResumenSectores>
  /** Periodo del ciclo elegido, o `null` si no hay ciclo que consultar. */
  periodo: { desde: FechaIso; hasta: FechaIso } | null
  /** El backend aún no tiene `resumen-sectores/` (404): la vista sigue con el avance del ciclo en días. */
  noDisponible: boolean
}

const TITULO = 'Avance por sector'

/**
 * Tabla por sector con corte, riego y poda de los ciclos que coinciden con el elegido (RD-15); si el resumen solo
 * trae corte, solo esa columna. Cada nombre de sector lleva su nombre de transición para crecer hasta el panel del
 * sector cuando exista (RD-41); hasta entonces la fila no es clicable.
 */
export default function TablaSectores({ consulta, periodo, noDisponible }: TablaSectoresProps) {
  const datos = consulta.datos
  const columnas: ColumnaTabla<AvanceSector>[] = [
    {
      clave: 'sector',
      titulo: 'Sector',
      ordenable: true,
      render: (sector) => (
        <span
          className={estilos.nombreSector}
          style={estiloTransicion(fila(`sector-${sector.sector_id}`))} /* estilo-calculado */
        >
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
                  {textoPorcentaje(servicio.porcentaje)}{' '}
                  <span className={estilos.leyenda}>
                    ({servicio.ejecutado} de {servicio.programado})
                  </span>
                </span>
                <BarraAvance
                  valor={servicio.ejecutado}
                  maximo={servicio.programado}
                  etiqueta={`${texto} de ${sector.sector}`}
                  textoValor={textoPorcentaje(servicio.porcentaje)}
                />
              </span>
            )
          },
        }))
      : []),
  ]
  const sinFilas = (titulo: string, descripcion: string) => (
    <TablaDatos
      titulo={TITULO}
      columnas={columnas}
      filas={[]}
      claveFila={() => ''}
      sinMarco
      vacio={{ titulo, descripcion, nivel: 3 }}
    />
  )

  let cuerpo
  if (!periodo) {
    cuerpo = sinFilas('Sin ciclo que mostrar', 'Cuando haya un ciclo programado, aquí verás su avance por sector.')
  } else if (noDisponible) {
    cuerpo = sinFilas(
      'Avance por sector aún no disponible',
      'El servidor todavía no entrega el avance por sector. Arriba ves el avance del ciclo en días.',
    )
  } else if (consulta.estado === 'error' && !datos) {
    cuerpo =
      consulta.error?.estado === 403 ? (
        <EstadoSinAcceso nivel={3} titulo="No puedes ver el avance por sector" />
      ) : (
        <EstadoError
          nivel={3}
          titulo="No pudimos cargar el avance por sector"
          descripcion={consulta.error?.detalle ?? ''}
          onReintentar={consulta.reintentar}
        />
      )
  } else {
    cuerpo = (
      <TablaDatos
        titulo={TITULO}
        columnas={columnas}
        filas={datos?.sectores ?? []}
        claveFila={(sector) => String(sector.sector_id)}
        estado={datos ? 'exito' : 'cargando'}
        sinMarco
        vacio={{ titulo: 'Sin sectores', descripcion: 'No hay sectores activos con áreas verdes asignadas.', nivel: 3 }}
      />
    )
  }
  return (
    <section className={estilos.vidrio} aria-labelledby="titulo-tabla-sectores">
      <div className={estilos.cabeceraPanel}>
        <h2 id="titulo-tabla-sectores">{TITULO}</h2>
        {periodo && (
          <span className={estilos.leyenda}>Ciclos del {fechasCiclo(periodo.desde, periodo.hasta)}, por áreas</span>
        )}
      </div>
      {cuerpo}
    </section>
  )
}
