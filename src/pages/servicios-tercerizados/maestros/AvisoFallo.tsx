/** Aviso en línea de un registro que no se pudo guardar (proveedores, contratos y atención especial). */
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import type { FalloRegistro } from './fallosRegistro'

export interface AvisoFalloProps {
  fallo: FalloRegistro
  onReintentar: () => void
  /** Título y acción cuando el servidor responde 409 (ya registrado). */
  existente?: { titulo: string; accion?: { texto: string; onClick: () => void } }
}

export default function AvisoFallo({ fallo, onReintentar, existente }: AvisoFalloProps) {
  if (fallo.tipo === 'conexion') {
    return (
      <AvisoEnLinea tono="error" titulo="No se pudo guardar" accion={{ texto: 'Reintentar', onClick: onReintentar }}>
        No hubo conexión con el servidor. No se creó ningún registro parcial: revisa tu conexión e inténtalo de nuevo.
      </AvisoEnLinea>
    )
  }
  if (fallo.tipo === 'existente') {
    return (
      <AvisoEnLinea tono="advertencia" titulo={existente?.titulo ?? 'Ya está registrado'} accion={existente?.accion}>
        {fallo.detalle}
      </AvisoEnLinea>
    )
  }
  return (
    <AvisoEnLinea tono="error" titulo={fallo.titulo}>
      {fallo.detalle.length === 1 ? (
        fallo.detalle[0]
      ) : (
        <ul>
          {fallo.detalle.map((mensaje) => (
            <li key={mensaje}>{mensaje}</li>
          ))}
        </ul>
      )}
    </AvisoEnLinea>
  )
}
