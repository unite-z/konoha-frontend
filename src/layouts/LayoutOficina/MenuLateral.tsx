// Menú lateral con las 8 etiquetas de la Arquitectura de la Información. Sin estilos todavía.
import { NavLink } from 'react-router'
import { RUTAS } from '../../router/rutas'

export default function MenuLateral() {
  return (
    <nav>
      <ul>
        {/* Inicio, Planificación, Áreas verdes y mapa, Operación de campo, Servicios tercerizados
            e Incidencias pertenecen a otros módulos. */}
        <li>Inicio</li>
        <li>Planificación</li>
        <li>Áreas verdes y mapa</li>
        <li>Operación de campo</li>
        <li>Servicios tercerizados</li>
        <li>Incidencias</li>
        <li>
          Reportes e indicadores
          <ul>
            <li><NavLink to={RUTAS.cumplimientoCorte}>Cumplimiento del corte de césped</NavLink></li>
            <li><NavLink to={RUTAS.distribucionPersonal}>Distribución del personal</NavLink></li>
            <li><NavLink to={RUTAS.atencionesEspacioSector}>Atenciones por espacio y sector</NavLink></li>
            <li><NavLink to={RUTAS.extraccionReportes}>Extracción de informes de proveedores</NavLink></li>
          </ul>
        </li>
        {/* Configuración pertenece a otros módulos. */}
        <li>Configuración</li>
      </ul>
    </nav>
  )
}
