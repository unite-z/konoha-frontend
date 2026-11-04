/**
 * «Derivar de nuevo» de una incidencia cuyo encargo se canceló (AV-284, Figma 390-8582): se elige la vía y la tarjeta
 * pasa al encargo a un capataz o al requerimiento a un proveedor.
 */
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import Tarjeta from '@/components/ui/Tarjeta'
import type { ViaIncidencia } from '@/types/incidencias'
import estilos from './Incidencias.module.css'

export default function TarjetaDerivarDeNuevo({ onElegir }: { onElegir: (via: ViaIncidencia) => void }) {
  return (
    <Tarjeta titulo="Derivar de nuevo" nivel={2}>
      <div className={estilos.accion}>
        <GrupoOpciones
          etiqueta="Vía"
          etiquetaOculta
          valor={null}
          onCambiar={onElegir}
          opciones={[
            { valor: 'PersonalPropio', texto: 'Encargo a un capataz', descripcion: 'Personal propio' },
            { valor: 'Tercerizada', texto: 'Requerimiento a un proveedor', descripcion: 'Tercerizado' },
          ]}
        />
      </div>
    </Tarjeta>
  )
}
