/**
 * Cabecera de la revisión de un análisis de evidencia (RF-IA-006): el ejemplar o la atención, la especie, el espacio,
 * los síntomas y el estado. Recuerda siempre que no es un diagnóstico ni una indicación de tratamiento (criterio 5).
 */
import type { ReactNode } from 'react'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import Tarjeta from '@/components/ui/Tarjeta'
import type { ContenidoEvidencia } from '@/types/evidenciaFitosanitariaIa'
import { tituloEvidencia } from '@/utils/evidenciaFitosanitariaIa'
import { formatearFechaHora, SIN_VALOR } from '@/utils/formato'
import estilos from './Evidencia.module.css'

export interface CabeceraEvidenciaProps {
  contenido: ContenidoEvidencia
  fechaCreacion: string | null
  insignias: ReactNode
}

export default function CabeceraEvidencia({ contenido: c, fechaCreacion, insignias }: CabeceraEvidenciaProps) {
  return (
    <Tarjeta
      titulo={tituloEvidencia(c)}
      nivel={2}
      descripcion={fechaCreacion ? `Analizada el ${formatearFechaHora(fechaCreacion)}` : undefined}
      acciones={<span className={estilos.acciones}>{insignias}</span>}
    >
      <div className={estilos.pila}>
        <ListaDescripcion
          elementos={[
            { etiqueta: 'Especie', valor: c.ejemplar?.especie ?? 'No identificada' },
            { etiqueta: 'Espacio', valor: c.ejemplar?.espacio ?? SIN_VALOR },
            c.atencion && { etiqueta: 'Atención fitosanitaria', valor: c.atencion.codigo },
            { etiqueta: 'Síntomas observados', valor: c.sintomas ?? 'Sin síntomas descritos', ancho: true },
          ]}
        />
        <p className={estilos.secundario}>Esto no es un diagnóstico definitivo ni una indicación de tratamiento.</p>
      </div>
    </Tarjeta>
  )
}
