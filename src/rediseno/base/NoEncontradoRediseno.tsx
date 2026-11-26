import { BotonEnlace } from '@/design-system/Boton'
import EstadoVacio from '@/design-system/EstadoVacio'
import { PREFIJO_REDISENO } from '../prefijo'

/** Ruta comodín de `/n`: se queda dentro del marco del diseño nuevo, con la cabecera. */
export default function NoEncontradoRediseno() {
  return (
    <EstadoVacio
      centrado
      titulo="Página no encontrada"
      descripcion="La dirección no existe en el diseño nuevo."
      accion={
        <BotonEnlace to={PREFIJO_REDISENO} variante="secundario">
          Ir al inicio
        </BotonEnlace>
      }
    />
  )
}
