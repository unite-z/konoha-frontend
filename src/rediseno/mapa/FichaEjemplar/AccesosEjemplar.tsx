import { PERMISOS } from '@/config/permisosCore'
import { tiene, type Permisos } from '@/config/permisosSesion'
import { BotonEnlace } from '@/design-system/Boton'
import type { EjemplarInventario } from '@/types/ejemplares'
import { enlacesDeEjemplar } from './enlacesEjemplar'
import estilos from './FichaEjemplar.module.css'

/** Accesos por enlace al módulo dueño del trabajo; cada uno aparece solo con su permiso y la ficha no pinta nada ajeno. */
export default function AccesosEjemplar({ ejemplar, permisos }: { ejemplar: EjemplarInventario; permisos: Permisos }) {
  const puedeAtender = tiene(permisos, PERMISOS.registrarAtencion)
  const puedeReportar = tiene(permisos, PERMISOS.registrarIncidencia)
  if (!puedeAtender && !puedeReportar) return null
  const enlaces = enlacesDeEjemplar(ejemplar.id, ejemplar.area_verde_id)
  return (
    <nav className={estilos.acciones} aria-label="Accesos del ejemplar">
      {puedeAtender && (
        <>
          <BotonEnlace variante="secundario" compacto to={enlaces.atencionEspecial}>
            Marcar atención especial
          </BotonEnlace>
          <BotonEnlace variante="secundario" compacto to={enlaces.plaga}>
            Registrar observación de plaga
          </BotonEnlace>
          <BotonEnlace variante="secundario" compacto to={enlaces.analizarFotos}>
            Analizar fotos
          </BotonEnlace>
        </>
      )}
      {puedeReportar && (
        <BotonEnlace variante="secundario" compacto icono="triangle-alert" to={enlaces.incidencia}>
          Reportar incidencia
        </BotonEnlace>
      )}
    </nav>
  )
}
