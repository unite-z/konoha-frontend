/**
 * Detalle de la parte del gráfico elegida (contenido del diálogo «Ver detalles»): totales y tabla de filas.
 * RNF-008: solo se muestra el nombre de cada operario.
 */
import Badge from '../../../../components/ui/Badge'
import ListaDescripcion from '../../../../components/ui/ListaDescripcion'
import TablaDatos, { type ColumnaTabla } from '../../../../components/ui/TablaDatos'
import type { FilaDistribucion } from '../../../../types/reportes'
import { formatearFecha, formatearMinutos, formatearNumero, SIN_VALOR } from '../../../../utils/formato'
import estilos from '../Reportes.module.css'
import { formatearMedida, MEDIDAS, totalizar } from './agregacion'

/** Parte del gráfico elegida. */
export interface Seleccion {
  clave: string
  /** Por ejemplo, «Cuadrilla: Cuadrilla 1». */
  titulo: string
  filas: FilaDistribucion[]
}

/** Número de operarios y sus nombres; el apoyo eventual lleva la insignia «Apoyo». */
function celdaOperarios(fila: FilaDistribucion) {
  return (
    <div className={estilos.celdaAvance}>
      <span className="cifra">{formatearNumero(fila.numero_operarios)}</span>
      <ul className={`${estilos.listaSinVinetas} ${estilos.textoPequeno}`}>
        {fila.operarios.map((o) => (
          <li key={o.operario_id} className={estilos.enLinea}>
            <span>{o.nombre_completo ?? SIN_VALOR}</span>
            {o.es_apoyo && (
              <Badge tono="info" texto="Apoyo" ayuda="Operario de otra cuadrilla que apoyó en esta actividad" />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

const COLUMNAS: ColumnaTabla<FilaDistribucion>[] = [
  { clave: 'jornada', titulo: 'Jornada', ordenable: true, render: (f) => formatearFecha(f.jornada) },
  { clave: 'cuadrilla_nombre', titulo: 'Cuadrilla', ordenable: true },
  { clave: 'capataz_nombre', titulo: 'Capataz', ordenable: true },
  { clave: 'clase_actividad_nombre', titulo: 'Clase de actividad', ordenable: true },
  { clave: 'tipo_actividad_nombre', titulo: 'Tipo de actividad', ordenable: true },
  { clave: 'area_verde_nombre', titulo: 'Espacio', ordenable: true },
  {
    clave: 'numero_actividades',
    titulo: 'N.º de actividades',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearNumero(f.numero_actividades),
  },
  { clave: 'operarios', titulo: 'Operarios', valorOrden: (f) => f.numero_operarios, render: celdaOperarios },
  {
    clave: 'horas_persona',
    titulo: 'Horas-persona',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearNumero(f.horas_persona, 2),
  },
  {
    clave: 'tiempo_minutos',
    titulo: 'Tiempo',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearMinutos(f.tiempo_minutos),
  },
  {
    clave: 'superficie_m2',
    titulo: 'Superficie (m²)',
    alineacion: 'derecha',
    ordenable: true,
    render: (f) => formatearNumero(f.superficie_m2),
  },
]

export default function DetalleSeleccion({ seleccion }: { seleccion: Seleccion }) {
  const totales = totalizar(seleccion.filas)
  return (
    <>
      <ListaDescripcion
        elementos={MEDIDAS.map(({ valor, texto }) => ({
          etiqueta: texto,
          valor: <span className="cifra">{formatearMedida(totales[valor], valor)}</span>,
        }))}
      />
      <TablaDatos
        titulo={`Detalle de ${seleccion.titulo}`}
        columnas={COLUMNAS}
        filas={seleccion.filas}
        claveFila={(f, i) => `${f.jornada}-${f.cuadrilla_id}-${f.tipo_actividad_id}-${f.area_verde_id}-${i}`}
        ordenInicial={{ clave: 'jornada', direccion: 'asc' }}
      />
    </>
  )
}
