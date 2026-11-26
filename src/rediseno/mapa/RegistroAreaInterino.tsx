import AreaVerdeForm from '@/pages/inventario/AreaVerdeForm'
import PanelLateral from '../base/PanelLateral/PanelLateral'

interface Props {
  puedeVincularMapa: boolean
  onGuardada: (areaId: number) => void
  onCerrar: () => void
}

/**
 * Alta de área (`?registrar=1`) con el formulario actual, sin modificarlo, dentro del panel de vidrio. Con el diseño
 * nuevo encendido `/areas-verdes/nueva` redirige aquí (AV-425), así que el registro no se pierde hasta que RD-20 lo
 * sustituya por el dibujo del contorno. En modo edición: Esc no lo cierra y no se pierde lo escrito.
 */
export default function RegistroAreaInterino({ puedeVincularMapa, onGuardada, onCerrar }: Props) {
  return (
    <PanelLateral abierto onCerrar={onCerrar} titulo="Registrar área" editando>
      <AreaVerdeForm
        modo="crear"
        puedeVincularMapa={puedeVincularMapa}
        alGuardar={(area) => onGuardada(area.id)}
        alCancelar={onCerrar}
      />
    </PanelLateral>
  )
}
