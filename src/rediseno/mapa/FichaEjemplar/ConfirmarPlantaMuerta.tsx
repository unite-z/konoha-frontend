import { useState } from 'react'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import CampoFormulario, { AreaTexto } from '@/design-system/CampoFormulario'
import { aErrorApi } from '@/services/api/cliente'
import { cambiarSituacionEjemplar } from '@/services/api/ejemplares'
import type { EjemplarInventario } from '@/types/ejemplares'
import { hoyLima } from '@/utils/instanteLima'
import estilos from './FichaEjemplar.module.css'

interface Props {
  ejemplar: EjemplarInventario
  onConfirmada: (ejemplar: EjemplarInventario) => void
  onDescartar: () => void
}

/**
 * Propuesta de «planta muerta» que llega desde una intervención (`&propuesta=muerto`): no cambia nada hasta que quien
 * gestiona el inventario la confirma con fecha y motivo (RN-014: el ejemplar no se elimina y conserva su historial).
 */
export default function ConfirmarPlantaMuerta({ ejemplar, onConfirmada, onDescartar }: Props) {
  const [fecha, setFecha] = useState(hoyLima)
  const [motivo, setMotivo] = useState('Planta muerta confirmada desde una intervención')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (ejemplar.situacion !== 'activo') return null

  async function confirmar() {
    if (!fecha || !motivo.trim() || guardando) return
    setGuardando(true)
    setError(null)
    try {
      onConfirmada(
        await cambiarSituacionEjemplar(ejemplar.id, {
          situacion: 'muerto',
          fecha,
          motivo: motivo.trim(),
        }),
      )
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className={estilos.propuesta} aria-label="Planta muerta propuesta">
      <AvisoEnLinea tono="advertencia" titulo="Planta muerta propuesta">
        Una intervención propone registrar {ejemplar.codigo} como muerto. No cambia nada hasta que lo confirmes.
      </AvisoEnLinea>
      <CampoFormulario
        id="ficha-fecha-muerto"
        etiqueta="Fecha"
        type="date"
        max={hoyLima()}
        required
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
      />
      <AreaTexto
        id="ficha-motivo-muerto"
        etiqueta="Motivo"
        maxLength={300}
        required
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
      {error && (
        <AvisoEnLinea tono="error" compacto>
          {error}
        </AvisoEnLinea>
      )}
      <div className={estilos.acciones}>
        <Boton
          variante="primario"
          compacto
          cargando={guardando}
          deshabilitado={!fecha || !motivo.trim()}
          onClick={() => void confirmar()}
        >
          Registrar como muerto
        </Boton>
        <Boton variante="fantasma" compacto deshabilitado={guardando} onClick={onDescartar}>
          Ahora no
        </Boton>
      </div>
    </section>
  )
}
