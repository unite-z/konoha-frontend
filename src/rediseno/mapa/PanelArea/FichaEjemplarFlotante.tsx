import ListaDescripcion from '@/design-system/ListaDescripcion'
import type { EjemplarInventario } from '@/types/ejemplares'
import { nombreEjemplar } from '@/utils/nombreEjemplar'
import VentanaFlotante from '@/rediseno/base/VentanaFlotante/VentanaFlotante'
import { nombreSituacionSingular } from './formato'

interface Props {
  ejemplar: EjemplarInventario | null
  onCerrar: () => void
}

/**
 * Ficha flotante del ejemplar tocado en el mapa o en la lista del área: se abre sobre el panel sin cerrarlo. Enseña lo
 * que el listado ya trae; la ficha completa con sus acciones es de RD-21 y sustituirá a este contenido.
 */
export default function FichaEjemplarFlotante({ ejemplar, onCerrar }: Props) {
  return (
    <VentanaFlotante
      abierto={ejemplar !== null}
      titulo={ejemplar ? nombreEjemplar(ejemplar.codigo, ejemplar.alias) : 'Ejemplar'}
      descripcion={ejemplar?.especie_nombre_cientifico ?? undefined}
      onCerrar={onCerrar}
    >
      {ejemplar && (
        <ListaDescripcion
          columnas="una"
          elementos={[
            { etiqueta: 'Especie', valor: ejemplar.especie_nombre_comun },
            { etiqueta: 'Situación', valor: nombreSituacionSingular(ejemplar.situacion) },
            { etiqueta: 'Placa antigua', valor: ejemplar.codigo_placa_antigua },
            { etiqueta: 'Altura', valor: ejemplar.altura_total_m === null ? null : `${ejemplar.altura_total_m} m` },
            { etiqueta: 'Ubicación', valor: ejemplar.ubicacion, ancho: true },
          ]}
        />
      )}
    </VentanaFlotante>
  )
}
