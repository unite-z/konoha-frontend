/**
 * Hoja «ya está marcado» (V13, Figma 375-6817): quién y cuándo marcó el jardín y «Añadir observación». Es el
 * `PanelLateral` del diseño nuevo (hoja inferior a pantalla completa en móvil) y su apertura vive en la URL
 * (`?jardin=<id>`). La fila del jardín crece hasta ella y la cifra de avance pasa a su detalle.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import CampoFormulario from '@/design-system/CampoFormulario'
import EstadoVacio from '@/design-system/EstadoVacio'
import { textoYaMarcado } from '@/pages/corte/rutaDeHoy'
import { registrarObservacionJardin } from '@/services/api/corte'
import type { JardinRuta, RutaDeHoy } from '@/types/corte'
import { estiloTransicion, panel } from '../base/movimiento'
import PanelLateral from '../base/PanelLateral/PanelLateral'
import { NOMBRE_CIFRA_AVANCE } from './nombres'
import estilos from './Campo.module.css'

export interface HojaJardinProps {
  ruta: RutaDeHoy
  /** `null` si el jardín de la URL no está en la ruta. */
  jardin: JardinRuta | null
  /** Total de marcados (con las pendientes de enviar) para la cifra de avance del detalle. */
  avance: number
  onCerrar: () => void
  onAnadida: (jardin: JardinRuta) => void
}

export default function HojaJardin({ ruta, jardin, avance, onCerrar, onAnadida }: HojaJardinProps) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!jardin) {
    return (
      <PanelLateral abierto onCerrar={onCerrar} titulo="Jardín">
        <EstadoVacio nivel={3} titulo="Este jardín no está en tu ruta" descripcion="Vuelve a la ruta de hoy y elige otro." />
      </PanelLateral>
    )
  }

  const marcado = jardin.estado === 'Cortado'

  async function anadir(actual: JardinRuta) {
    setEnviando(true)
    setError(null)
    try {
      await registrarObservacionJardin(ruta.programacion_id, actual.id, texto.trim())
      onAnadida(actual)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'Inténtalo de nuevo.')
      setEnviando(false)
    }
  }

  return (
    <PanelLateral
      abierto
      onCerrar={onCerrar}
      titulo={marcado ? `${jardin.codigo} ya está marcado` : `${jardin.codigo} · ${jardin.nombre}`}
      subtitulo={marcado ? textoYaMarcado(jardin) : jardin.zona}
      viewTransitionName={panel(jardin.id)}
      editando={marcado && Boolean(texto.trim())}
      pie={
        marcado ? (
          <Boton
            cargando={enviando}
            deshabilitado={!texto.trim()}
            onClick={() => void anadir(jardin)}
          >
            Añadir observación
          </Boton>
        ) : undefined
      }
    >
      <div className={estilos.contenidoHoja}>
        <p className={estilos.cifra} style={estiloTransicion(NOMBRE_CIFRA_AVANCE)}>
          <span className={estilos.numero}>
            {avance} de {ruta.jardines.length}
          </span>
          <span>jardines marcados</span>
        </p>
        {marcado ? (
          <>
            <CampoFormulario
              id="observacion-jardin"
              etiqueta="Observación"
              value={texto}
              maxLength={300}
              onChange={(e) => setTexto(e.target.value)}
            />
            {error && (
              <AvisoEnLinea tono="error" titulo="No se pudo añadir la observación">
                {error}
              </AvisoEnLinea>
            )}
          </>
        ) : (
          <EstadoVacio nivel={3} titulo="Todavía no está marcado" descripcion="Márcalo desde «Por cortar»." />
        )}
      </div>
    </PanelLateral>
  )
}
