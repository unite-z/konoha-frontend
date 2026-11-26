import { useId, useState } from 'react'
import { PERMISOS } from '@/config/permisosCore'
import { tiene, type Permisos } from '@/config/permisosSesion'
import Boton, { BotonEnlace } from '@/design-system/Boton'
import { enlacesDeArea } from './enlacesArea'
import estilos from './PanelArea.module.css'

interface Props {
  areaId: number
  permisos: Permisos
}

/**
 * Acciones del área abierta. Todas son enlaces al módulo dueño del trabajo (Planificación, Incidencias, Proveedores) o
 * a la edición del propio Mapa; cada una solo aparece con su permiso.
 */
export default function AccionesArea({ areaId, permisos }: Props) {
  const idMenu = useId()
  const [programando, setProgramando] = useState(false)
  const enlaces = enlacesDeArea(areaId)
  const puedeEncargo = tiene(permisos, PERMISOS.gestionarCuadrillas)
  const puedeCiclo = tiene(permisos, PERMISOS.gestionarPlanificacion)
  const puedeProgramar = puedeEncargo || puedeCiclo
  const puedeReportar = tiene(permisos, PERMISOS.registrarIncidencia)
  const puedePlaga = tiene(permisos, PERMISOS.registrarAtencion)
  const puedeEditar = tiene(permisos, PERMISOS.registrarInventario)
  if (!puedeProgramar && !puedeReportar && !puedePlaga && !puedeEditar) return null

  return (
    <nav className={estilos.acciones} aria-label="Acciones del área">
      {puedeProgramar && (
        <div className={estilos.programar}>
          <Boton
            variante="primario"
            compacto
            icono="calendar"
            aria-expanded={programando}
            aria-controls={idMenu}
            onClick={() => setProgramando(!programando)}
          >
            Programar trabajo
          </Boton>
          <ul id={idMenu} className={estilos.menu} hidden={!programando}>
            {puedeEncargo && (
              <li>
                <BotonEnlace variante="fantasma" compacto to={enlaces.encargo}>
                  Encargo a una cuadrilla
                </BotonEnlace>
              </li>
            )}
            {puedeCiclo && (
              <li>
                <BotonEnlace variante="fantasma" compacto to={enlaces.ciclo}>
                  Ciclo de servicios
                </BotonEnlace>
              </li>
            )}
          </ul>
        </div>
      )}
      {puedeReportar && (
        <BotonEnlace variante="secundario" compacto icono="triangle-alert" to={enlaces.incidencia}>
          Reportar incidencia
        </BotonEnlace>
      )}
      {puedePlaga && (
        <BotonEnlace variante="secundario" compacto to={enlaces.plaga}>
          Registrar observación de plaga
        </BotonEnlace>
      )}
      {puedeEditar && (
        <BotonEnlace variante="secundario" compacto icono="pencil" to={enlaces.editar}>
          Editar
        </BotonEnlace>
      )}
    </nav>
  )
}
