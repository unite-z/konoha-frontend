/**
 * Cabecera de la revisión de una clasificación (RF-IA-005): la incidencia en evaluación (código, tipo, fecha, canal,
 * espacio, ejemplar, descripción y fotografías) y el estado del análisis. Recuerda que nada se deriva desde aquí.
 */
import type { ReactNode } from 'react'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import Tarjeta from '@/components/ui/Tarjeta'
import type { IncidenciaResumen } from '@/types/clasificacionIncidenciaIa'
import { formatearFechaHora, formatearNumero, SIN_VALOR } from '@/utils/formato'
import estilos from './Clasificacion.module.css'

export interface CabeceraIncidenciaProps {
  incidencia: IncidenciaResumen
  /** Insignias del análisis (estado y aviso de sugerencia). */
  insignias: ReactNode
}

export default function CabeceraIncidencia({ incidencia: i, insignias }: CabeceraIncidenciaProps) {
  const conMiniatura = i.fotografias.filter((f) => f.url_miniatura)
  const ejemplar = i.ejemplar ? [i.ejemplar.codigo, i.ejemplar.especie].filter(Boolean).join(' · ') : SIN_VALOR
  return (
    <Tarjeta titulo={`${i.codigo} · ${i.tipo_evento}`} nivel={2} descripcion={`Recibida el ${formatearFechaHora(i.fecha_recepcion)}`} acciones={<span className={estilos.acciones}>{insignias}</span>}>
      <div className={estilos.pila}>
        <p className={estilos.descripcion}>{i.descripcion}</p>
        <ListaDescripcion
          elementos={[
            { etiqueta: 'Canal de ingreso', valor: i.canal_ingreso },
            { etiqueta: 'Espacio', valor: i.espacio ?? SIN_VALOR },
            { etiqueta: 'Ejemplar', valor: ejemplar },
            { etiqueta: 'Estado de la incidencia', valor: i.estado },
            {
              etiqueta: 'Fotografías',
              ancho: true,
              valor:
                i.fotografias.length === 0 ? (
                  'Sin fotografías'
                ) : conMiniatura.length > 0 ? (
                  <ul className={estilos.miniaturas}>
                    {conMiniatura.map((f) => (
                      <li key={f.archivo_id}>
                        <img className={estilos.miniatura} src={f.url_miniatura ?? undefined} alt={f.nombre} loading="lazy" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  `${formatearNumero(i.fotografias.length)} ${i.fotografias.length === 1 ? 'fotografía' : 'fotografías'}`
                ),
            },
          ]}
        />
        <p className={estilos.secundario}>La incidencia no se deriva automáticamente. La derivación se hace después, desde la gestión de incidencias.</p>
      </div>
    </Tarjeta>
  )
}
