/**
 * Ruta no encontrada (`*`).
 */
import { BotonEnlace } from '../components/ui/Boton'
import EstadoVacio from '../components/ui/EstadoVacio'
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
