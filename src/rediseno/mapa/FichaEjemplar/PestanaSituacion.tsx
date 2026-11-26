import { useState } from 'react'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import { useConsulta } from '@/hooks/useConsulta'
import SituacionEjemplar from '@/pages/inventario/SituacionEjemplar'
import { listarTodasLasAreasVerdes } from '@/services/api/mapaAsignaciones'
import type { EjemplarInventario } from '@/types/ejemplares'
import ConfirmarPlantaMuerta from './ConfirmarPlantaMuerta'

interface Props {
  ejemplar: EjemplarInventario
  /** Quien gestiona el catálogo cambia la situación; el resto solo la lee. */
  puedeCambiar: boolean
  propuestaMuerto: boolean
  onActualizado: (ejemplar: EjemplarInventario) => void
}

/** Situación del ejemplar (activo, retirado, muerto, reemplazado, trasladado) con su historial y la propuesta de planta muerta. */
export default function PestanaSituacion({ ejemplar, puedeCambiar, propuestaMuerto, onActualizado }: Props) {
  const [descartada, setDescartada] = useState(false)
  const areas = useConsulta(puedeCambiar ? 'rd-ficha-areas' : null, listarTodasLasAreasVerdes)
  const opciones = (areas.datos ?? []).map((a) => ({
    valor: String(a.id),
    texto: a.nombre,
  }))
  return (
    <>
      {propuestaMuerto && !descartada && puedeCambiar && (
        <ConfirmarPlantaMuerta
          ejemplar={ejemplar}
          onConfirmada={onActualizado}
          onDescartar={() => setDescartada(true)}
        />
      )}
      {propuestaMuerto && !puedeCambiar && (
        <EstadoSinAcceso
          nivel={3}
          titulo="No puedes confirmar la planta muerta"
          descripcion="Solo quien gestiona el inventario puede registrar un ejemplar como muerto."
        />
      )}
      <SituacionEjemplar ejemplar={ejemplar} editable={puedeCambiar} areas={opciones} alGuardar={onActualizado} />
    </>
  )
}
