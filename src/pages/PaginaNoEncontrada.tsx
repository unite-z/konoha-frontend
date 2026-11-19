/**
 * Ruta no encontrada (`*`).
 */
import { BotonEnlace } from '@/design-system/Boton'
import EstadoVacio from '@/design-system/EstadoVacio'
import { usePaginaActual } from '../hooks/usePaginaActual'
import { RUTAS } from '../router/rutasApp'

export default function PaginaNoEncontrada() {
  usePaginaActual('Página no encontrada', [])
  return (
    <EstadoVacio
      titulo="Página no encontrada"
      accion={
        <BotonEnlace to={RUTAS.reportes} variante="secundario">
          Ir a Reportes
        </BotonEnlace>
      }
    />
  )
}
