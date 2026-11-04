/**
 * Declara el título, las migas de pan y, si lo hay, el subtítulo de la página actual (Guía Web 4.2).
 * La cabecera del layout los muestra, y el título también se usa en la pestaña del navegador.
 */
import { useContext, useEffect } from 'react'
import { ContextoPagina, type DatosMovil, type Miga } from '../layouts/LayoutOficina/ContextoPagina'

/** Nombre de la aplicación en la pestaña del navegador (marca del mockup). */
const NOMBRE_APLICACION = 'Gestión de Áreas Verdes'

export function usePaginaActual(
  titulo: string,
  migas: Miga[],
  subtitulo?: string,
  opciones: { tituloOculto?: boolean; movil?: DatosMovil } = {},
): void {
  const tituloOculto = opciones.tituloOculto ?? false
  // Como las migas, los datos de móvil se comparan por contenido.
  const claveMovil = opciones.movil ? JSON.stringify(opciones.movil) : undefined
  const contexto = useContext(ContextoPagina)
  const establecerPagina = contexto?.establecerPagina
  // Las migas se comparan por contenido para no actualizar el contexto en cada render.
  const claveMigas = JSON.stringify(migas)

  useEffect(() => {
    establecerPagina?.({
      titulo,
      migas: JSON.parse(claveMigas) as Miga[],
      subtitulo,
      tituloOculto,
      movil: claveMovil ? (JSON.parse(claveMovil) as DatosMovil) : undefined,
    })
    document.title = `${titulo} · ${NOMBRE_APLICACION}`
  }, [establecerPagina, titulo, claveMigas, subtitulo, tituloOculto, claveMovil])
}
