import { BotonEnlace } from '@/design-system/Boton'
import EstadoVacio from '@/design-system/EstadoVacio'
import { RUTAS_CORE } from '@/router/rutasApp'

/** Relleno de cada sección del diseño nuevo hasta que su ticket la construya. */
export default function EnConstruccion({ seccion }: { seccion: string }) {
  return (
    <EstadoVacio
      centrado
      titulo={`${seccion}: en construcción`}
      descripcion="Esta parte del diseño nuevo aún no está lista."
      accion={
        <BotonEnlace to={RUTAS_CORE.configuracionApariencia} variante="secundario">
          Volver al diseño actual
        </BotonEnlace>
      }
    />
  )
}
