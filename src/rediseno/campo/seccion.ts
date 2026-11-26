import { CalendarDays, ClipboardList, Route, TriangleAlert } from 'lucide-react'
import { PERMISOS } from '@/config/permisosCore'
import type { SeccionRediseno } from '../tipos'
import { RUTA_CAMPO, rutaCampoEncargos, rutaCampoIncidencias, rutaCampoRutaDeHoy, rutaCampoSemana } from './enlaces'

/**
 * Campo no es una sección de la cabecera: sus entradas son las de la única barra inferior del móvil (RD-04), que
 * añade «Más» (`/n/campo/mas`). Esta carpeta no pinta otra barra.
 */
export const seccionCampo: SeccionRediseno = {
  id: 'campo',
  etiqueta: 'Campo',
  icono: ClipboardList,
  ruta: RUTA_CAMPO,
  permisos: [PERMISOS.consultarCuadrillas],
  pestanas: [],
  movil: [
    { etiqueta: 'Ruta de hoy', icono: Route, ruta: rutaCampoRutaDeHoy() },
    { etiqueta: 'Semana', icono: CalendarDays, ruta: rutaCampoSemana() },
    { etiqueta: 'Encargos', icono: ClipboardList, ruta: rutaCampoEncargos() },
    { etiqueta: 'Incidencias', icono: TriangleAlert, ruta: rutaCampoIncidencias() },
  ],
  enCabecera: false,
  inicioEnCampo: true,
}
