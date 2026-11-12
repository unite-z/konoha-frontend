/**
 * AV-367: pantalla de la ruta cuando no se pudo cargar su código (normalmente, una versión nueva desplegada con
 * la pestaña abierta y la recarga automática ya hecha). Ofrece recargar la aplicación.
 */
import EstadoError from '@/components/ui/EstadoError'

export default function ErrorCargaPantalla() {
  return (
    <main>
      <EstadoError
        titulo="No se pudo cargar esta pantalla"
        descripcion="Puede que haya una versión nueva de la aplicación. Recarga la página; si el problema sigue, avisa al equipo"
        onReintentar={() => window.location.reload()}
      />
    </main>
  )
}
