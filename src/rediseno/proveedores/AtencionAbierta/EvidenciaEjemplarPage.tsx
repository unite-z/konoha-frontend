/**
 * Análisis de evidencia de un ejemplar (RD-55): `/proveedores/fitosanitario?ejemplar_id=<id>`, al que enlaza «Analizar
 * fotos» de la ficha del ejemplar en el Mapa. Fondo liso, sin mapa; el bloque es el mismo de la ficha de la atención.
 */
import { useFocoConLaVista } from '@/rediseno/base/movimiento'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import estilosPagina from './AtencionAbierta.module.css'
import EvidenciaKonoha from './EvidenciaKonoha'

export default function EvidenciaEjemplarPage({ ejemplarId }: { ejemplarId: number }) {
  const encabezado = useFocoConLaVista<HTMLHeadingElement>()
  const titulo = `Evidencia del ejemplar n.º ${ejemplarId}`
  usePaginaActual(titulo, [{ texto: 'Proveedores' }, { texto: 'Fitosanitario' }, { texto: titulo }])
  return (
    <div className={estilosPagina.pagina}>
      <header className={estilosPagina.encabezado}>
        <h1 ref={encabezado} tabIndex={-1} className={estilosPagina.titulo}>
          {titulo}
        </h1>
      </header>
      <EvidenciaKonoha objetivo={{ tipo: 'ejemplar', id: ejemplarId }} mostrarSinAcceso />
    </div>
  )
}
